

// Declare a global interface for window.aistudio
// The 'window.aistudio' object is assumed to be globally provided by the AI Studio environment,
// so a manual declaration here is removed to prevent type conflicts and "identical modifiers" errors.

export enum LightingType {
  Day = 'day',
  Sunset = 'sunset',
  Night = 'night',
}

// Modelo de imagen para el render final. El backend traduce la clave al ID de Gemini.
export type RenderModel = 'standard' | 'pro';

export const RENDER_MODEL_OPTIONS: { value: RenderModel; label: string }[] = [
  { value: 'standard', label: 'Estándar — rápido (Nano Banana 2)' },
  { value: 'pro', label: 'Pro — máxima fidelidad, más lento (Nano Banana Pro)' },
];

// Resolución del render final.
export type RenderSize = '2K' | '4K';

export const RENDER_SIZE_OPTIONS: { value: RenderSize; label: string }[] = [
  { value: '2K', label: '2K — estándar' },
  { value: '4K', label: '4K — máxima resolución, mayor costo' },
];

// Movimiento de cámara para la transición de video (Start Frame -> End Frame).
export type CameraMovement = 'dolly_in' | 'dolly_out' | 'zoom_in' | 'zoom_out' | 'pan_left' | 'pan_right';

export const CAMERA_MOVEMENT_OPTIONS: { value: CameraMovement; label: string }[] = [
  { value: 'dolly_in', label: 'Dolly In — la cámara avanza hacia la escena' },
  { value: 'dolly_out', label: 'Dolly Out — la cámara retrocede desde la escena' },
  { value: 'zoom_in', label: 'Zoom In — acercamiento óptico' },
  { value: 'zoom_out', label: 'Zoom Out — alejamiento óptico' },
  { value: 'pan_left', label: 'Pan Izquierda — barrido horizontal' },
  { value: 'pan_right', label: 'Pan Derecha — barrido horizontal' },
];

export interface VideoRenderItem {
  id: string;
  url: string | null;
  start_description: string | null;
  camera_movement: string | null;
  duration_seconds: number | null;
  created_at: string;
}

export interface ImagePart {
  inlineData: {
    data: string;
    mimeType: string;
  };
}

// New interface for saving/loading lighting configurations
export interface LightingConfig {
  lightingType: LightingType;
  advancedLightingInstructions: string;
  colorTemperature: 'warm' | 'neutral' | 'cool' | 'golden';
  exposureCompensation: 'standard' | 'brighter' | 'darker' | 'very_bright' | 'very_dark';
  contrastEnhancement: 'natural' | 'enhanced' | 'soft' | 'high_contrast' | 'low_contrast';
}