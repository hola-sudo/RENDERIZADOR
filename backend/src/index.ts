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
import {
  saveVideoRender,
  listVideoRenders,
  getVideoRender,
  createSourceUrl,
  createPlaybackUrl,
  markUpscaleStarted,
  markUpscaleFailed,
  saveUpscaledVideo,
} from './videoRenders.js';
import { upscaleVideo, checkVideoUpscale, type UpscaleResolution } from './videoUpscaler.js';

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
    const { sketchupImage, referenceImages, sceneDescription, lightingType, colorTemperature, contrastEnhancement, renderModel, renderSize } =
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
      renderModel: renderModel === 'pro' ? 'pro' : 'standard',
      renderSize: renderSize === '4K' ? '4K' : '2K',
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

// ── Video de transición (Gemini Omni Flash) ─────────────────────────────────
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

const buildVideoPrompt = (movement: CameraMovement, sceneDescription: string): string => `
Photorealistic architectural/event rendering video transition connecting the start frame to the end frame.
${CAMERA_MOVEMENT_INSTRUCTIONS[movement]}

CRITICAL: Maintain strict visual continuity between both frames. Do NOT alter materials, textures, colors or geometry. Do NOT add or remove any objects. No hallucinated elements.
${sceneDescription.trim() ? `Scene materials and constraints to respect exactly: ${sceneDescription.trim()}` : ''}

The motion must be smooth, natural and high-fidelity, like a real architectural walkthrough camera move.
`.trim();

// Arranca la generación de video. Responde rápido con el id de la interacción;
// el cliente hace polling en /api/video/status hasta que termine (puede tardar minutos).
app.post('/api/video/start', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const { startFrame, endFrame, cameraMovement, sceneDescription } = req.body ?? {};
    if (!startFrame?.data || !endFrame?.data) {
      return res.status(400).json({ error: 'Faltan el Start Frame y/o el End Frame.' });
    }
    const movement: CameraMovement = CAMERA_MOVEMENTS.includes(cameraMovement) ? cameraMovement : 'dolly_in';
    const prompt = buildVideoPrompt(movement, sceneDescription ?? '');

    // Siempre 1080p. El 4K se obtiene después con el upscaler (/api/video/upscale/*).
    const { operationName } = await generateVideoTransition('gemini-omni', {
      startFrame,
      endFrame,
      prompt,
    });
    res.json({ operationName });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? 'Error interno.' });
  }
});

// Consulta el estado de la generación. Cuando termina, guarda el video en
// Storage/DB y devuelve la URL firmada.
app.get('/api/video/status', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const operationName = req.query.operation as string;
    if (!operationName) return res.status(400).json({ error: 'Falta el parámetro operation.' });

    const result = await checkVideoGeneration(operationName);
    if (!result.done) return res.json({ done: false });
    if (result.error) return res.json({ done: true, error: result.error });
    if (!result.buffer) return res.json({ done: true, error: 'El modelo no devolvió contenido de video.' });

    const cameraMovement = (req.query.cameraMovement as string) ?? '';
    const sceneDescription = (req.query.sceneDescription as string) ?? '';

    const client = createUserClient(req.accessToken!);
    const record = await saveVideoRender(client, req.userId!, result.buffer, result.mimeType || 'video/mp4', {
      startDescription: sceneDescription,
      cameraMovement,
      durationSeconds: 8,
    });

    res.json({ done: true, url: record.url, videoRenderId: record.id });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? 'Error interno.' });
  }
});

// ── Upscaling de video (proceso aparte) ─────────────────────────────────────
// El video generado siempre queda en 1080p. Subirlo a 4K es un segundo paso
// explícito sobre un video YA guardado: no toca la generación ni se cobra si
// el usuario no lo pide. Mismo patrón start/status porque también tarda minutos.
const UPSCALE_RESOLUTIONS = ['1080p', '4k'] as const;

app.post('/api/video/upscale/start', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const { videoRenderId, targetResolution } = req.body ?? {};
    if (!videoRenderId || typeof videoRenderId !== 'string') {
      return res.status(400).json({ error: 'Falta el id del video a escalar.' });
    }
    const resolution: UpscaleResolution = UPSCALE_RESOLUTIONS.includes(targetResolution)
      ? targetResolution
      : '4k';

    const client = createUserClient(req.accessToken!);
    const record = await getVideoRender(client, videoRenderId);
    if (!record) return res.status(404).json({ error: 'No se encontró el video.' });
    if (record.upscaled_video_path) {
      return res.status(409).json({ error: 'Este video ya tiene una versión escalada.' });
    }

    // Idempotente: si ya hay un upscaling en curso (el usuario cerró la pestaña
    // y volvió), devolvemos esa misma predicción en vez de arrancar —y cobrar—
    // una segunda.
    if (record.upscale_status === 'processing' && record.upscale_operation) {
      return res.json({
        predictionId: record.upscale_operation,
        targetResolution: record.upscale_resolution ?? resolution,
        resumed: true,
      });
    }

    // Replicate descarga el origen por HTTP, así que necesita una URL firmada.
    const sourceUrl = await createSourceUrl(client, record.video_path);

    let predictionId: string;
    try {
      ({ predictionId } = await upscaleVideo('topaz', { videoUrl: sourceUrl, targetResolution: resolution }));
    } catch (startErr: any) {
      await markUpscaleFailed(client, videoRenderId, startErr.message ?? 'No se pudo iniciar el upscaling.').catch(() => {});
      throw startErr;
    }

    await markUpscaleStarted(client, videoRenderId, predictionId, resolution);
    res.json({ predictionId, targetResolution: resolution });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? 'Error interno.' });
  }
});

// Consulta el estado del upscaling. Cuando termina, sube el video escalado a
// Storage junto al original y devuelve su URL firmada.
app.get('/api/video/upscale/status', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const predictionId = req.query.operation as string;
    const videoRenderId = req.query.videoRenderId as string;
    if (!predictionId) return res.status(400).json({ error: 'Falta el parámetro operation.' });
    if (!videoRenderId) return res.status(400).json({ error: 'Falta el parámetro videoRenderId.' });

    const client = createUserClient(req.accessToken!);

    // Si el 4K ya se guardó (p. ej. dos pestañas polleando), devuélvelo tal cual
    // en vez de volver a descargar y subir una copia.
    const existing = await getVideoRender(client, videoRenderId);
    if (!existing) return res.status(404).json({ error: 'No se encontró el video.' });
    if (existing.upscaled_video_path) {
      const url = await createPlaybackUrl(client, existing.upscaled_video_path);
      return res.json({ done: true, url, resolution: existing.upscale_resolution });
    }

    const result = await checkVideoUpscale(predictionId);
    if (!result.done) return res.json({ done: false });

    if (result.error) {
      await markUpscaleFailed(client, videoRenderId, result.error).catch(() => {});
      return res.json({ done: true, error: result.error });
    }
    if (!result.buffer) {
      const message = 'El upscaler no devolvió contenido de video.';
      await markUpscaleFailed(client, videoRenderId, message).catch(() => {});
      return res.json({ done: true, error: message });
    }

    const updated = await saveUpscaledVideo(
      client,
      req.userId!,
      videoRenderId,
      result.buffer,
      result.mimeType || 'video/mp4',
      existing.upscale_resolution ?? '4k',
    );

    res.json({ done: true, url: updated.upscaled_url, resolution: updated.upscale_resolution });
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
