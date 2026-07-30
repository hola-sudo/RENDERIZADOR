// Generación de video de transición entre dos frames (Start/End) vía Veo 3.1.
// Igual que imageProviders.ts, aquí solo vive el "motor" de video; el prompt
// (movimiento de cámara + descripción de materiales validada) se arma en index.ts.
//
// Veo es asíncrono: generateVideos arranca un "operation" que puede tardar
// hasta ~6 minutos. Por eso el flujo es start/check separados en vez de una
// sola llamada bloqueante (ver checkVideoGeneration).
import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { GoogleGenAI, type GenerateVideosOperation } from '@google/genai';
import { type ImageInput } from './gemini.js';

export type VideoProvider = 'veo';

const VEO_MODEL = 'veo-3.1-generate-preview';

const getGeminiClient = (): GoogleGenAI => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey?.trim()) throw new Error('Falta GEMINI_API_KEY en el servidor.');
  return new GoogleGenAI({ apiKey });
};

export interface StartVideoParams {
  startFrame: ImageInput;
  endFrame: ImageInput;
  prompt: string;
  durationSeconds?: number; // default 8 (fijo mientras se usa interpolación first/last frame)
}

/** Arranca la generación en Veo y devuelve el nombre de la operación para poder pollearla luego. */
export const startVideoGeneration = async (p: StartVideoParams): Promise<{ operationName: string }> => {
  const ai = getGeminiClient();

  const operation = await ai.models.generateVideos({
    model: VEO_MODEL,
    prompt: p.prompt,
    image: { imageBytes: p.startFrame.data, mimeType: p.startFrame.mimeType },
    config: {
      lastFrame: { imageBytes: p.endFrame.data, mimeType: p.endFrame.mimeType },
      durationSeconds: p.durationSeconds ?? 8,
      aspectRatio: '16:9',
      resolution: '1080p',
    },
  });

  if (!operation.name) throw new Error('Veo no devolvió un identificador de operación.');
  return { operationName: operation.name };
};

export interface CheckVideoResult {
  done: boolean;
  buffer?: Buffer;
  mimeType?: string;
  error?: string;
}

/** Consulta el estado de una operación de Veo. Si terminó, descarga el video a un Buffer. */
export const checkVideoGeneration = async (operationName: string): Promise<CheckVideoResult> => {
  const ai = getGeminiClient();

  // El SDK solo necesita el `name` para reconstruir la request de status, así
  // que esto funciona aunque el start y el check ocurran en requests HTTP distintas.
  const operation = await ai.operations.getVideosOperation({
    operation: { name: operationName } as unknown as GenerateVideosOperation,
  });

  if (!operation.done) return { done: false };

  if (operation.error) {
    const message = typeof operation.error.message === 'string' ? operation.error.message : 'Error generando el video en Veo.';
    return { done: true, error: message };
  }

  const video = operation.response?.generatedVideos?.[0]?.video;
  if (!video) return { done: true, error: 'Veo no devolvió ningún video.' };

  const tmpPath = join(tmpdir(), `veo-${randomUUID()}.mp4`);
  try {
    await ai.files.download({ file: video, downloadPath: tmpPath });
    const buffer = await fs.readFile(tmpPath);
    return { done: true, buffer, mimeType: video.mimeType || 'video/mp4' };
  } finally {
    await fs.unlink(tmpPath).catch(() => {});
  }
};

// ── Dispatcher (hoy solo 'veo'; deja el hueco listo para 'film' vía fal.ai) ──
export const generateVideoTransition = async (
  provider: VideoProvider,
  params: StartVideoParams,
): Promise<{ operationName: string }> => {
  switch (provider) {
    case 'veo':
    default:
      return startVideoGeneration(params);
  }
};
