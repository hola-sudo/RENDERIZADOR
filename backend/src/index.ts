import 'dotenv/config'; // Carga .env en local; en Render las vars vienen del panel.
import express from 'express';
import cors from 'cors';
import { requireAuth, createUserClient, type AuthedRequest } from './auth.js';
import {
  detectSceneElements,
  generateSingleRender,
  LightingType,
  type ImageInput,
} from './gemini.js';
import { saveRender, listRenders } from './renders.js';
import { generateVideoTransition, checkVideoGeneration } from './videoProviders.js';
import { saveVideoRender, listVideoRenders } from './videoRenders.js';

const app = express();

// Las imágenes en base64 pesan; subimos el límite del body.
app.use(express.json({ limit: '25mb' }));
app.use(
  cors({
    origin: process.env.FRONTEND_ORIGIN?.split(',') ?? '*',
  }),
);

// Health check (Render lo usa para saber que el servicio está vivo).
app.get('/health', (_req, res) => res.json({ ok: true }));

// Analiza la escena de SketchUp -> descripción editable por el usuario.
app.post('/api/detect-scene', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const images = (req.body?.images ?? []) as ImageInput[];
    if (!Array.isArray(images) || images.length === 0) {
      return res.status(400).json({ error: 'Falta la imagen de SketchUp.' });
    }
    const description = await detectSceneElements(images);
    res.json({ description });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? 'Error interno.' });
  }
});

// Genera el render fotorrealista final.
app.post('/api/render', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const { sketchupImage, referenceImages, sceneDescription, lightingType, colorTemperature, contrastEnhancement } =
      req.body ?? {};

    if (!sketchupImage?.data) {
      return res.status(400).json({ error: 'Falta la imagen de SketchUp.' });
    }

    const result = await generateSingleRender({
      sketchupImage,
      referenceImages: Array.isArray(referenceImages) ? referenceImages : [],
      sceneDescription: sceneDescription ?? '',
      lightingType: (lightingType as LightingType) ?? LightingType.Day,
      colorTemperature: colorTemperature ?? 'neutral',
      contrastEnhancement: contrastEnhancement ?? 'natural',
    });

    if (result.error) return res.status(502).json({ error: result.error });

    // Guarda en el historial. No-fatal: si falla, el render igual se devuelve.
    try {
      const client = createUserClient(req.accessToken!);
      await saveRender(client, req.userId!, result.url!, {
        sceneDescription: sceneDescription ?? '',
        lightingType: lightingType ?? 'day',
        colorTemperature: colorTemperature ?? 'neutral',
        contrastEnhancement: contrastEnhancement ?? 'natural',
      });
    } catch (saveErr) {
      console.warn('No se pudo guardar el render en el historial:', saveErr);
    }

    res.json({ url: result.url });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? 'Error interno.' });
  }
});

// Historial de renders del usuario.
app.get('/api/renders', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const client = createUserClient(req.accessToken!);
    const renders = await listRenders(client);
    res.json({ renders });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? 'Error interno.' });
  }
});

// ── Video de transición (Veo) ────────────────────────────────────────────────
const CAMERA_MOVEMENTS = ['dolly_in', 'dolly_out', 'zoom_in', 'zoom_out', 'pan_left', 'pan_right'] as const;
type CameraMovement = (typeof CAMERA_MOVEMENTS)[number];

const CAMERA_MOVEMENT_INSTRUCTIONS: Record<CameraMovement, string> = {
  dolly_in: 'Slow cinematic dolly-in: the camera moves smoothly forward into the scene.',
  dolly_out: 'Slow cinematic dolly-out: the camera pulls back smoothly from the scene.',
  zoom_in: 'Smooth optical zoom-in, gradually magnifying the center of the frame.',
  zoom_out: 'Smooth optical zoom-out, gradually revealing more of the scene.',
  pan_left: 'Smooth horizontal camera pan to the left.',
  pan_right: 'Smooth horizontal camera pan to the right.',
};

const buildVeoPrompt = (movement: CameraMovement, sceneDescription: string): string => `
Photorealistic architectural/event rendering video transition connecting the start frame to the end frame.
${CAMERA_MOVEMENT_INSTRUCTIONS[movement]}

CRITICAL: Maintain strict visual continuity between both frames. Do NOT alter materials, textures, colors or geometry. Do NOT add or remove any objects. No hallucinated elements.
${sceneDescription.trim() ? `Scene materials and constraints to respect exactly: ${sceneDescription.trim()}` : ''}

The motion must be smooth, natural and high-fidelity, like a real architectural walkthrough camera move.
`.trim();

// Arranca la generación de video en Veo. Responde rápido con el id de operación;
// el cliente hace polling en /api/video/status hasta que termine (puede tardar minutos).
app.post('/api/video/start', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const { startFrame, endFrame, cameraMovement, sceneDescription } = req.body ?? {};
    if (!startFrame?.data || !endFrame?.data) {
      return res.status(400).json({ error: 'Faltan el Start Frame y/o el End Frame.' });
    }
    const movement: CameraMovement = CAMERA_MOVEMENTS.includes(cameraMovement) ? cameraMovement : 'dolly_in';
    const prompt = buildVeoPrompt(movement, sceneDescription ?? '');

    const { operationName } = await generateVideoTransition('veo', { startFrame, endFrame, prompt });
    res.json({ operationName });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? 'Error interno.' });
  }
});

// Consulta el estado de una operación de Veo. Cuando termina, guarda el video
// en Storage/DB y devuelve la URL firmada.
app.get('/api/video/status', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const operationName = req.query.operation as string;
    if (!operationName) return res.status(400).json({ error: 'Falta el parámetro operation.' });

    const result = await checkVideoGeneration(operationName);
    if (!result.done) return res.json({ done: false });
    if (result.error) return res.json({ done: true, error: result.error });
    if (!result.buffer) return res.json({ done: true, error: 'Veo no devolvió contenido de video.' });

    const cameraMovement = (req.query.cameraMovement as string) ?? '';
    const sceneDescription = (req.query.sceneDescription as string) ?? '';

    const client = createUserClient(req.accessToken!);
    const record = await saveVideoRender(client, req.userId!, result.buffer, result.mimeType || 'video/mp4', {
      startDescription: sceneDescription,
      cameraMovement,
      durationSeconds: 8,
    });

    res.json({ done: true, url: record.url });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? 'Error interno.' });
  }
});

// Historial de videos del usuario.
app.get('/api/video-renders', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const client = createUserClient(req.accessToken!);
    const videos = await listVideoRenders(client);
    res.json({ videos });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? 'Error interno.' });
  }
});

const port = Number(process.env.PORT) || 8080;
app.listen(port, () => {
  console.log(`Backend escuchando en http://localhost:${port}`);
});
