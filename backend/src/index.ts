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
import { IMAGE_PROVIDERS, type ImageProvider } from './imageProviders.js';
import { saveRender, listRenders } from './renders.js';

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
    const { sketchupImage, referenceImages, sceneDescription, lightingType, colorTemperature, contrastEnhancement, provider } =
      req.body ?? {};

    if (!sketchupImage?.data) {
      return res.status(400).json({ error: 'Falta la imagen de SketchUp.' });
    }

    const selectedProvider: ImageProvider = IMAGE_PROVIDERS.includes(provider) ? provider : 'gemini';

    const result = await generateSingleRender({
      sketchupImage,
      referenceImages: Array.isArray(referenceImages) ? referenceImages : [],
      sceneDescription: sceneDescription ?? '',
      lightingType: (lightingType as LightingType) ?? LightingType.Day,
      colorTemperature: colorTemperature ?? 'neutral',
      contrastEnhancement: contrastEnhancement ?? 'natural',
      provider: selectedProvider,
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

const port = Number(process.env.PORT) || 8080;
app.listen(port, () => {
  console.log(`Backend escuchando en http://localhost:${port}`);
});
