import { randomUUID } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';

const BUCKET = 'videos';
const SIGNED_URL_TTL = 3600; // 1 hora

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
  created_at: string;
}

export interface VideoRenderListItem extends VideoRenderRecord {
  url: string | null; // URL firmada temporal para reproducir el video
}

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
    })
    .select()
    .single();
  if (error) throw error;

  const record = data as VideoRenderRecord;
  const { data: signed } = await client.storage.from(BUCKET).createSignedUrl(record.video_path, SIGNED_URL_TTL);
  return { ...record, url: signed?.signedUrl ?? null };
}

/** Lista los videos del usuario (más recientes primero) con URLs firmadas. */
export async function listVideoRenders(client: SupabaseClient): Promise<VideoRenderListItem[]> {
  const { data, error } = await client
    .from('video_renders')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;

  const rows = (data ?? []) as VideoRenderRecord[];
  return Promise.all(
    rows.map(async (row) => {
      const { data: signed } = await client.storage
        .from(BUCKET)
        .createSignedUrl(row.video_path, SIGNED_URL_TTL);
      return { ...row, url: signed?.signedUrl ?? null };
    }),
  );
}
