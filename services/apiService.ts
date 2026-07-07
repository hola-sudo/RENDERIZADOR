import { supabase, API_BASE_URL } from './supabaseClient';
import { LightingType } from '../types';

// Convierte un File a base64 SIN el prefijo "data:...;base64," (lo que espera el backend).
const fileToBase64 = (file: File): Promise<{ data: string; mimeType: string }> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve({ data: reader.result.split(',')[1], mimeType: file.type });
      } else {
        reject(new Error('No se pudo leer el archivo.'));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

// Devuelve el header de autorización con el token de sesión de Supabase.
const authHeader = async (): Promise<Record<string, string>> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('No hay sesión activa. Inicia sesión de nuevo.');
  return { Authorization: `Bearer ${session.access_token}` };
};

// POST autenticado al backend.
const authedPost = async (path: string, body: unknown) => {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? `Error ${res.status}`);
  return json;
};

// GET autenticado al backend.
const authedGet = async (path: string) => {
  const res = await fetch(`${API_BASE_URL}${path}`, { headers: await authHeader() });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? `Error ${res.status}`);
  return json;
};

/** Analiza la escena de SketchUp vía backend y devuelve la descripción. */
export const detectSceneElements = async (
  originalImages: File[],
  onProgress?: (message: string) => void,
): Promise<string> => {
  onProgress?.('Identificando elementos...');
  const images = await Promise.all(originalImages.map(fileToBase64));
  const json = await authedPost('/api/detect-scene', { images });
  return json.description ?? 'No description available.';
};

/** Genera el render fotorrealista vía backend. */
export const generateSingleRender = async (
  sketchupImage: File,
  sceneDescription: string,
  referenceImages: File[],
  lightingType: LightingType,
  _advancedLightingInstructions: string,
  colorTemperature: string,
  _exposureCompensation: string,
  contrastEnhancement: string,
  onProgress: (message: string) => void,
): Promise<{ url: string | null; error: string | null }> => {
  try {
    onProgress('Preparando imágenes...');
    const [sketchup, references] = await Promise.all([
      fileToBase64(sketchupImage),
      Promise.all(referenceImages.map(fileToBase64)),
    ]);

    onProgress('Generando render fotorrealista...');
    const json = await authedPost('/api/render', {
      sketchupImage: sketchup,
      referenceImages: references,
      sceneDescription,
      lightingType,
      colorTemperature,
      contrastEnhancement,
    });

    return { url: json.url ?? null, error: null };
  } catch (err: any) {
    return { url: null, error: err.message ?? 'Error desconocido' };
  }
};

export interface RenderItem {
  id: string;
  url: string | null;
  scene_description: string | null;
  lighting_type: string | null;
  color_temperature: string | null;
  contrast_enhancement: string | null;
  created_at: string;
}

/** Trae el historial de renders del usuario. */
export const listRenders = async (): Promise<RenderItem[]> => {
  const json = await authedGet('/api/renders');
  return json.renders ?? [];
};
