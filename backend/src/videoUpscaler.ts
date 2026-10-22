// Upscaling de video como PROCESO APARTE del render.
//
// El video final siempre sale en 1080p (ver videoProviders.ts). Subirlo
// a 4K es un segundo paso opcional que el usuario dispara a mano sobre un video
// ya guardado en Storage, con su propio ciclo start/check — igual que la generación, el
// upscaling tarda minutos y no puede vivir dentro de un request HTTP.
//
// Motor: Topaz Video Upscale en Replicate. Recibe una URL pública del video
// (usamos la URL firmada de Supabase Storage) y devuelve una URL de salida.
import { Buffer } from 'node:buffer';

export type UpscaleProvider = 'topaz';

/** Resoluciones de salida que acepta el modelo de Topaz en Replicate. */
export type UpscaleResolution = '720p' | '1080p' | '4k';

const REPLICATE_API = 'https://api.replicate.com/v1';

// Modelo oficial de Replicate: el endpoint de creación es
// /v1/models/{owner}/{name}/predictions (no hace falta fijar un version hash).
const UPSCALE_MODEL = process.env.REPLICATE_UPSCALE_MODEL ?? 'topazlabs/video-upscale';

// La generación entrega 24 fps; el default del upscaler es 30 y reinterpolaría el metraje,
// así que lo fijamos para conservar la cadencia original.
const DEFAULT_TARGET_FPS = Number(process.env.REPLICATE_UPSCALE_FPS) || 24;

const getReplicateToken = (): string => {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token?.trim()) {
    throw new Error('Falta REPLICATE_API_TOKEN en el servidor (necesario para el upscaling).');
  }
  return token.trim();
};

const replicateHeaders = (): Record<string, string> => ({
  Authorization: `Bearer ${getReplicateToken()}`,
  'Content-Type': 'application/json',
});

/** Extrae el mensaje de error de una respuesta de Replicate sin romperse si no es JSON. */
const describeHttpError = async (res: Response, fallback: string): Promise<string> => {
  const text = await res.text().catch(() => '');
  if (!text) return `${fallback} (HTTP ${res.status})`;
  try {
    const json = JSON.parse(text) as { detail?: string; title?: string };
    return json.detail ?? json.title ?? `${fallback} (HTTP ${res.status})`;
  } catch {
    return `${fallback} (HTTP ${res.status}): ${text.slice(0, 200)}`;
  }
};

export interface StartUpscaleParams {
  /** URL pública (o firmada) del video de origen. Replicate la descarga por su cuenta. */
  videoUrl: string;
  targetResolution?: UpscaleResolution; // default 4k
  targetFps?: number; // default 24 (la cadencia del video generado)
}

/** Arranca el upscaling y devuelve el id de la predicción para pollearla luego. */
export const startVideoUpscale = async (p: StartUpscaleParams): Promise<{ predictionId: string }> => {
  const res = await fetch(`${REPLICATE_API}/models/${UPSCALE_MODEL}/predictions`, {
    method: 'POST',
    headers: replicateHeaders(),
    body: JSON.stringify({
      input: {
        video: p.videoUrl,
        target_resolution: p.targetResolution ?? '4k',
        target_fps: p.targetFps ?? DEFAULT_TARGET_FPS,
      },
    }),
  });

  if (!res.ok) throw new Error(await describeHttpError(res, 'Replicate rechazó el upscaling'));

  const prediction = (await res.json()) as { id?: string };
  if (!prediction.id) throw new Error('Replicate no devolvió un identificador de predicción.');
  return { predictionId: prediction.id };
};

export interface CheckUpscaleResult {
  done: boolean;
  buffer?: Buffer;
  mimeType?: string;
  error?: string;
}

interface ReplicatePrediction {
  status?: 'starting' | 'processing' | 'succeeded' | 'failed' | 'canceled';
  output?: unknown;
  error?: unknown;
}

/** El output del modelo es una URL; algunos modelos la envuelven en array u objeto. */
const extractOutputUrl = (output: unknown): string | null => {
  if (typeof output === 'string') return output;
  if (Array.isArray(output)) {
    const last = [...output].reverse().find((item) => typeof item === 'string');
    return typeof last === 'string' ? last : null;
  }
  if (output && typeof output === 'object') {
    const url = (output as { url?: unknown; video?: unknown }).url ?? (output as { video?: unknown }).video;
    if (typeof url === 'string') return url;
  }
  return null;
};

/**
 * Consulta el estado de una predicción de upscaling. Si terminó, descarga el
 * video resultante a un Buffer listo para subir a Storage.
 */
export const checkVideoUpscale = async (predictionId: string): Promise<CheckUpscaleResult> => {
  const res = await fetch(`${REPLICATE_API}/predictions/${encodeURIComponent(predictionId)}`, {
    headers: replicateHeaders(),
  });
  if (!res.ok) throw new Error(await describeHttpError(res, 'No se pudo consultar el upscaling'));

  const prediction = (await res.json()) as ReplicatePrediction;

  if (prediction.status === 'failed' || prediction.status === 'canceled') {
    const message =
      typeof prediction.error === 'string' && prediction.error.trim()
        ? prediction.error
        : prediction.status === 'canceled'
          ? 'El upscaling fue cancelado.'
          : 'El upscaling falló en Replicate.';
    return { done: true, error: message };
  }

  if (prediction.status !== 'succeeded') return { done: false };

  const outputUrl = extractOutputUrl(prediction.output);
  if (!outputUrl) return { done: true, error: 'Replicate no devolvió ningún video de salida.' };

  const download = await fetch(outputUrl);
  if (!download.ok) {
    return { done: true, error: `No se pudo descargar el video escalado (HTTP ${download.status}).` };
  }
  const buffer = Buffer.from(await download.arrayBuffer());
  const mimeType = download.headers.get('content-type') ?? 'video/mp4';
  return { done: true, buffer, mimeType: mimeType.startsWith('video/') ? mimeType : 'video/mp4' };
};

// ── Dispatcher (hoy solo 'topaz'; deja el hueco listo para otros motores) ──
export const upscaleVideo = async (
  provider: UpscaleProvider,
  params: StartUpscaleParams,
): Promise<{ predictionId: string }> => {
  switch (provider) {
    case 'topaz':
    default:
      return startVideoUpscale(params);
  }
};
