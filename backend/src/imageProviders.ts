// Generación de la imagen final (Rol B) con Gemini nativo. El "cerebro" que
// analiza la escena y refina el prompt también vive en gemini.ts; aquí solo
// se pinta el render.
import {
  GoogleGenAI,
  type GenerateContentResponse,
  type Part,
} from '@google/genai';
import {
  type ImageInput,
  imageToPart,
  safetySettings,
  retryWithExponentialBackoff,
} from './gemini.js';

// Lista blanca de modelos de imagen. El cliente manda la clave, nunca el ID.
export const RENDER_MODEL_IDS = {
  standard: 'gemini-3.1-flash-image-preview', // Nano Banana 2: rápido y barato
  pro: 'gemini-3-pro-image-preview', // Nano Banana Pro: mayor fidelidad, más lento y caro
} as const;
export type RenderModelKey = keyof typeof RENDER_MODEL_IDS;

// Resoluciones permitidas. 4K duplica el costo por imagen aprox.
export const RENDER_SIZES = ['2K', '4K'] as const;
export type RenderSize = (typeof RENDER_SIZES)[number];

export interface GenerateImageParams {
  sketchupImage: ImageInput;
  referenceImages: ImageInput[];
  finalPrompt: string;
  renderModel?: RenderModelKey;
  renderSize?: RenderSize;
}

export interface RenderResult {
  url: string; // data URL base64 de la imagen final
}

const SYSTEM_INSTRUCTION =
  'You are a professional architectural and event rendering engine. Transform SketchUp screenshots into high-fidelity photorealistic renders, following user instructions on materials, lighting, and textures while strictly maintaining the geometric silhouettes of the original input. Do not add or remove physical objects.';

interface ImagePart {
  inlineData: { data: string; mimeType: string };
}

const handleGeminiResponse = (response: GenerateContentResponse): string => {
  const imagePart = response.candidates?.[0]?.content?.parts?.find(
    (part): part is ImagePart => (part as ImagePart).inlineData !== undefined,
  );
  if (imagePart?.inlineData) {
    return `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
  }
  const textPart = response.candidates?.[0]?.content?.parts?.find(
    (part) => typeof (part as { text?: string }).text === 'string',
  );
  const textOutput = (textPart as { text?: string })?.text;
  throw new Error(`No se encontró imagen. ${textOutput ? `Mensaje del modelo: "${textOutput}"` : ''}`);
};

export const generateRenderImage = async (p: GenerateImageParams): Promise<RenderResult> => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey?.trim()) throw new Error('Falta GEMINI_API_KEY en el servidor.');
  const ai = new GoogleGenAI({ apiKey });

  const parts: Part[] = [
    imageToPart(p.sketchupImage),
    ...p.referenceImages.map(imageToPart),
    { text: p.finalPrompt },
  ];

  const response = await retryWithExponentialBackoff(
    () =>
      ai.models.generateContent({
        model: RENDER_MODEL_IDS[p.renderModel ?? 'standard'],
        contents: { parts },
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          safetySettings,
          imageConfig: { aspectRatio: '16:9', imageSize: p.renderSize ?? '2K' },
        },
      }),
    5,
    5000,
  );
  return { url: handleGeminiResponse(response) };
};
