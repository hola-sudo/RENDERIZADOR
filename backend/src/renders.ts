import { randomUUID } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';

const BUCKET = 'renders';
const SIGNED_URL_TTL = 3600; // 1 hora

export interface RenderMeta {
  sceneDescription: string;
  lightingType: string;
  colorTemperature: string;
  contrastEnhancement: string;
}

export interface RenderRecord {
  id: string;
  image_path: string;
  scene_description: string | null;
  lighting_type: string | null;
  color_temperature: string | null;
  contrast_enhancement: string | null;
  created_at: string;
}

/**
 * Sube la imagen generada (data URL base64) a Storage y guarda una fila en
 * la tabla `renders`. Usa el cliente del usuario para que RLS aplique.
 */
export async function saveRender(
  client: SupabaseClient,
  userId: string,
  dataUrl: string,
  meta: RenderMeta,
): Promise<RenderRecord> {
  const match = dataUrl.match(/^data:(.+?);base64,(.*)$/);
  if (!match) throw new Error('Formato de imagen inesperado (no es data URL base64).');

  const mimeType = match[1];
  const buffer = Buffer.from(match[2], 'base64');
  const ext = mimeType.split('/')[1] ?? 'png';
  const path = `${userId}/${randomUUID()}.${ext}`;

  const { error: upErr } = await client.storage
    .from(BUCKET)
    .upload(path, buffer, { contentType: mimeType, upsert: false });
  if (upErr) throw upErr;

  const { data, error } = await client
    .from('renders')
    .insert({
      image_path: path,
      scene_description: meta.sceneDescription,
      lighting_type: meta.lightingType,
      color_temperature: meta.colorTemperature,
      contrast_enhancement: meta.contrastEnhancement,
    })
    .select()
    .single();
  if (error) throw error;

  return data as RenderRecord;
}

export interface RenderListItem extends RenderRecord {
  url: string | null; // URL firmada temporal para mostrar la imagen
}

/** Lista los renders del usuario (más recientes primero) con URLs firmadas. */
export async function listRenders(client: SupabaseClient): Promise<RenderListItem[]> {
  const { data, error } = await client
    .from('renders')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;

  const rows = (data ?? []) as RenderRecord[];
  return Promise.all(
    rows.map(async (row) => {
      const { data: signed } = await client.storage
        .from(BUCKET)
        .createSignedUrl(row.image_path, SIGNED_URL_TTL);
      return { ...row, url: signed?.signedUrl ?? null };
    }),
  );
}
