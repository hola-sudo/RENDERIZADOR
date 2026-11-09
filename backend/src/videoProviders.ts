// Generación de video de transición entre dos frames (Start/End).
// Igual que imageProviders.ts, aquí solo vive el "motor" de video; el prompt
// (movimiento de cámara + descripción de materiales validada) se arma en index.ts.
//
// Motor: Gemini Omni Flash. Sustituye a Veo 3.1 Preview, que Google apagó el
// 22 de octubre de 2026. La API es distinta a la de Veo:
//   - `ai.interactions.create()` en vez de `ai.models.generateVideos()`
//   - los frames van como items del array `input`, no en `config.lastFrame`
//   - `response_format` define aspecto, resolución, duración y entrega
//   - el video sale en `interaction.output_video`
//
// Requiere @google/genai >= 2.0.0: la API rechaza el esquema de Interactions
// de las versiones 1.x con un 400 "legacy Interactions API schema".
// Se corre con `background: true` para conservar el flujo start/check: la
// generación tarda minutos y no cabe en un request HTTP (ver checkVideoGeneration).
import { Buffer } from 'node:buffer';
import { GoogleGenAI } from '@google/genai';
import { type ImageInput } from './gemini.js';

export type VideoProvider = 'gemini-omni';

const VIDEO_MODEL = 'gemini-omni-1.1-flash';

const getGeminiClient = (): GoogleGenAI => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey?.trim()) throw new Error('Falta GEMINI_API_KEY en el servidor.');
  return new GoogleGenAI({ apiKey });
};

// El video final SIEMPRE se genera en 1080p: subir a 4K es un proceso aparte
// (ver videoUpscaler.ts) que corre sobre el video ya guardado.
// Nota: Omni acepta '4k', pero lo entrega escalado, no generado nativamente.
export const VIDEO_RESOLUTION = '1080p' as const;

// Mime types que acepta un item de imagen en `input`. Los frames llegan como
// JPEG (el front los recomprime), pero normalizamos por si acaso.
type InputImageMimeType = 'image/png' | 'image/jpeg' | 'image/webp';

const normalizeMimeType = (mimeType: string): InputImageMimeType => {
  if (mimeType === 'image/png' || mimeType === 'image/webp') return mimeType;
  return 'image/jpeg';
};

export interface StartVideoParams {
  startFrame: ImageInput;
  endFrame: ImageInput;
  prompt: string;
  durationSeconds?: number; // default 8 (Omni acepta 3-10)
}

/**
 * Arranca la generación y devuelve el id de la interacción para pollearla luego.
 * El nombre `operationName` se mantiene para no romper el contrato HTTP con el
 * front, pero ahora lo que viaja es un `Interaction.id`.
 */
export const startVideoGeneration = async (p: StartVideoParams): Promise<{ operationName: string }> => {
  const ai = getGeminiClient();
  const duration = p.durationSeconds ?? 8;

  const interaction = await ai.interactions.create({
    model: VIDEO_MODEL,
    background: true,
    input: [
      // El orden importa: el primer item es el primer frame y el segundo el último.
      { type: 'image', data: p.startFrame.data, mime_type: normalizeMimeType(p.startFrame.mimeType) },
      { type: 'image', data: p.endFrame.data, mime_type: normalizeMimeType(p.endFrame.mimeType) },
      { type: 'text', text: p.prompt },
    ],
    response_format: {
      type: 'video',
      aspect_ratio: '16:9',
      resolution: VIDEO_RESOLUTION,
      // Formato de duración de Google (protobuf Duration): "8s".
      duration: `${duration}s`,
      // Un 1080p de 8s pesa bastante más que los 4MB que admite la entrega
      // inline en base64, así que pedimos URI y lo descargamos nosotros.
      delivery: 'uri',
    },
  });

  if (!interaction.id) throw new Error('Gemini Omni no devolvió un identificador de interacción.');
  return { operationName: interaction.id };
};

export interface CheckVideoResult {
  done: boolean;
  buffer?: Buffer;
  mimeType?: string;
  error?: string;
}

/** Descarga el video entregado por URI. Si es un endpoint de la API, necesita la key. */
const downloadFromUri = async (uri: string): Promise<{ buffer: Buffer; mimeType: string }> => {
  const res = await fetch(uri, {
    headers: { 'x-goog-api-key': process.env.GEMINI_API_KEY?.trim() ?? '' },
  });
  if (!res.ok) throw new Error(`No se pudo descargar el video generado (HTTP ${res.status}).`);
  const mimeType = res.headers.get('content-type') ?? 'video/mp4';
  return {
    buffer: Buffer.from(await res.arrayBuffer()),
    mimeType: mimeType.startsWith('video/') ? mimeType : 'video/mp4',
  };
};

/** Consulta el estado de una interacción. Si terminó, deja el video en un Buffer. */
export const checkVideoGeneration = async (interactionId: string): Promise<CheckVideoResult> => {
  const ai = getGeminiClient();
  const interaction = await ai.interactions.get(interactionId);

  if (interaction.status === 'in_progress' || interaction.status === 'requires_action') {
    return { done: false };
  }

  if (interaction.status !== 'completed') {
    // 'failed' | 'cancelled' | 'incomplete'
    return { done: true, error: `La generación del video terminó en estado "${interaction.status}".` };
  }

  // En 2.x el SDK expone el video listo en `output_video` (antes `outputs`).
  const video = interaction.output_video;
  if (!video) return { done: true, error: 'Gemini Omni no devolvió ningún video.' };

  // Con delivery:'uri' llega `uri`; si el video fuera pequeño podría venir
  // inline en `data`, así que soportamos los dos casos.
  if (video.data) {
    return { done: true, buffer: Buffer.from(video.data, 'base64'), mimeType: video.mime_type || 'video/mp4' };
  }
  if (video.uri) {
    const { buffer, mimeType } = await downloadFromUri(video.uri);
    return { done: true, buffer, mimeType: video.mime_type || mimeType };
  }
  return { done: true, error: 'Gemini Omni devolvió un video vacío.' };
};

// ── Dispatcher (hoy solo Omni; deja el hueco listo para otros motores) ──
export const generateVideoTransition = async (
  provider: VideoProvider,
  params: StartVideoParams,
): Promise<{ operationName: string }> => {
  switch (provider) {
    case 'gemini-omni':
    default:
      return startVideoGeneration(params);
  }
};
