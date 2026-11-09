import { randomUUID } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';

const BUCKET = 'videos';
const SIGNED_URL_TTL = 3600; // 1 hora

// Replicate descarga el video de origen con esta URL firmada, y el upscaling
// puede tardar varios minutos, así que le damos más margen que a la de reproducción.
const SOURCE_URL_TTL = 7200; // 2 horas

/** Estado del proceso aparte de upscaling para un video ya generado. */
export type UpscaleStatus = 'processing' | 'done' | 'error';

export interface VideoRenderMeta {
  startDescription: string;
  cameraMovement: string;
  durationSeconds: number;
}

export interface VideoRenderRecord {
  id: string;
  video_path: string;
  start_description: string | null;
  camera_movement: string | null;
  duration_seconds: number | null;
  resolution: string | null;
  upscaled_video_path: string | null;
  upscale_resolution: string | null;
  upscale_status: UpscaleStatus | null;
  upscale_error: string | null;
  upscale_operation: string | null;
  created_at: string;
}

export interface VideoRenderListItem extends VideoRenderRecord {
  url: string | null; // URL firmada temporal para reproducir el video 1080p
  upscaled_url: string | null; // URL firmada de la versión escalada, si existe
}

/** Añade URLs firmadas (1080p y, si existe, la versión escalada) a un registro. */
const withSignedUrls = async (
  client: SupabaseClient,
  record: VideoRenderRecord,
): Promise<VideoRenderListItem> => {
  const [base, upscaled] = await Promise.all([
    client.storage.from(BUCKET).createSignedUrl(record.video_path, SIGNED_URL_TTL),
    record.upscaled_video_path
      ? client.storage.from(BUCKET).createSignedUrl(record.upscaled_video_path, SIGNED_URL_TTL)
      : Promise.resolve({ data: null }),
  ]);
  return {
    ...record,
    url: base.data?.signedUrl ?? null,
    upscaled_url: upscaled.data?.signedUrl ?? null,
  };
};

/**
 * Sube el video generado (Buffer) a Storage y guarda una fila en la tabla
 * `video_renders`. Usa el cliente del usuario para que RLS aplique.
 * Devuelve el registro junto con una URL firmada lista para reproducir.
 */
export async function saveVideoRender(
  client: SupabaseClient,
  userId: string,
  buffer: Buffer,
  mimeType: string,
  meta: VideoRenderMeta,
): Promise<VideoRenderListItem> {
  const ext = mimeType.split('/')[1] ?? 'mp4';
  const path = `${userId}/${randomUUID()}.${ext}`;

  const { error: upErr } = await client.storage
    .from(BUCKET)
    .upload(path, buffer, { contentType: mimeType, upsert: false });
  if (upErr) throw upErr;

  const { data, error } = await client
    .from('video_renders')
    .insert({
      video_path: path,
      start_description: meta.startDescription,
      camera_movement: meta.cameraMovement,
      duration_seconds: meta.durationSeconds,
      resolution: '1080p',
    })
    .select()
    .single();
  if (error) throw error;

  return withSignedUrls(client, data as VideoRenderRecord);
}

/** Lista los videos del usuario (más recientes primero) con URLs firmadas. */
export async function listVideoRenders(client: SupabaseClient): Promise<VideoRenderListItem[]> {
  const { data, error } = await client
    .from('video_renders')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;

  const rows = (data ?? []) as VideoRenderRecord[];
  return Promise.all(rows.map((row) => withSignedUrls(client, row)));
}

// ── Upscaling (proceso aparte) ───────────────────────────────────────────────

/** Trae un video del usuario por id. RLS garantiza que solo vea los suyos. */
export async function getVideoRender(client: SupabaseClient, id: string): Promise<VideoRenderRecord | null> {
  const { data, error } = await client.from('video_renders').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return (data as VideoRenderRecord | null) ?? null;
}

/** URL firmada temporal para reproducir/descargar un video ya guardado. */
export async function createPlaybackUrl(client: SupabaseClient, videoPath: string): Promise<string | null> {
  const { data } = await client.storage.from(BUCKET).createSignedUrl(videoPath, SIGNED_URL_TTL);
  return data?.signedUrl ?? null;
}

/** URL firmada de larga duración para que Replicate pueda descargar el origen. */
export async function createSourceUrl(client: SupabaseClient, videoPath: string): Promise<string> {
  const { data, error } = await client.storage.from(BUCKET).createSignedUrl(videoPath, SOURCE_URL_TTL);
  if (error) throw error;
  if (!data?.signedUrl) throw new Error('No se pudo firmar la URL del video de origen.');
  return data.signedUrl;
}

/** Marca el video como "escalando" y guarda el id de la predicción de Replicate. */
export async function markUpscaleStarted(
  client: SupabaseClient,
  id: string,
  predictionId: string,
  targetResolution: string,
): Promise<void> {
  const { error } = await client
    .from('video_renders')
    .update({
      upscale_status: 'processing',
      upscale_operation: predictionId,
      upscale_resolution: targetResolution,
      upscale_error: null,
    })
    .eq('id', id);
  if (error) throw error;
}

/** Guarda el motivo del fallo para que el historial lo muestre y se pueda reintentar. */
export async function markUpscaleFailed(client: SupabaseClient, id: string, message: string): Promise<void> {
  const { error } = await client
    .from('video_renders')
    .update({ upscale_status: 'error', upscale_error: message.slice(0, 500) })
    .eq('id', id);
  if (error) throw error;
}

/**
 * Sube el video escalado junto al original (misma carpeta del usuario) y
 * actualiza la fila. Devuelve el registro con ambas URLs firmadas.
 */
export async function saveUpscaledVideo(
  client: SupabaseClient,
  userId: string,
  id: string,
  buffer: Buffer,
  mimeType: string,
  targetResolution: string,
): Promise<VideoRenderListItem> {
  const ext = mimeType.split('/')[1] ?? 'mp4';
  const path = `${userId}/${randomUUID()}-${targetResolution}.${ext}`;

  const { error: upErr } = await client.storage
    .from(BUCKET)
    .upload(path, buffer, { contentType: mimeType, upsert: false });
  if (upErr) throw upErr;

  const { data, error } = await client
    .from('video_renders')
    .update({
      upscaled_video_path: path,
      upscale_resolution: targetResolution,
      upscale_status: 'done',
      upscale_error: null,
    })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;

  return withSignedUrls(client, data as VideoRenderRecord);
}
