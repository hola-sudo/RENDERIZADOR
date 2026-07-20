

// Declare a global interface for window.aistudio
// The 'window.aistudio' object is assumed to be globally provided by the AI Studio environment,
// so a manual declaration here is removed to prevent type conflicts and "identical modifiers" errors.

export enum LightingType {
  Day = 'day',
  Sunset = 'sunset',
  Night = 'night',
}

// Proveedor del modelo que genera el render final (Rol B).
export type ImageProvider = 'gemini' | 'gpt' | 'flux';

export const IMAGE_PROVIDER_OPTIONS: { value: ImageProvider; label: string }[] = [
  { value: 'gemini', label: 'Gemini — nativo, rápido y buena fidelidad geométrica' },
  { value: 'gpt', label: 'GPT (gpt-image-1) — de OpenAI, buen seguimiento de instrucciones' },
  { value: 'flux', label: 'FLUX Kontext (fal.ai) — edición multi-imagen preservando la escena' },
];

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