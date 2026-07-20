// Generación de la imagen final (Rol B). El "cerebro" que analiza la escena y
// refina el prompt sigue en Gemini (ver gemini.ts); aquí solo elegimos QUÉ modelo
// pinta el render: Gemini, GPT (gpt-image-1) o FLUX (Kontext vía fal.ai).
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

export type ImageProvider = 'gemini' | 'gpt' | 'flux';

export const IMAGE_PROVIDERS: ImageProvider[] = ['gemini', 'gpt', 'flux'];

export interface GenerateImageParams {
  provider: ImageProvider;
  sketchupImage: ImageInput;
  referenceImages: ImageInput[];
  finalPrompt: string;
}

const SYSTEM_INSTRUCTION =
  'You are a professional architectural and event rendering engine. Transform SketchUp screenshots into high-fidelity photorealistic 2K renders, following user instructions on materials, lighting, and textures while strictly maintaining the geometric silhouettes of the original input. Do not add or remove physical objects.';

// ── Gemini ────────────────────────────────────────────────────────────────
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

const generateWithGemini = async (p: GenerateImageParams): Promise<string> => {
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
        model: 'gemini-3.1-flash-image-preview',
        contents: { parts },
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          safetySettings,
          imageConfig: { aspectRatio: '16:9', imageSize: '2K' },
        },
      }),
    5,
    5000,
  );
  return handleGeminiResponse(response);
};

// ── OpenAI (gpt-image-1) ────────────────────────────────────────────────────
const inputToBlob = (img: ImageInput): Blob =>
  new Blob([Buffer.from(img.data, 'base64')], { type: img.mimeType || 'image/png' });

const generateWithGpt = async (p: GenerateImageParams): Promise<string> => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey?.trim()) throw new Error('Falta OPENAI_API_KEY en el servidor.');

  const form = new FormData();
  form.append('model', 'gpt-image-1');
  form.append('prompt', `${SYSTEM_INSTRUCTION}\n\n${p.finalPrompt}`);
  form.append('size', '1536x1024'); // el tamaño horizontal más cercano a 16:9 en gpt-image-1
  // La primera imagen es la base a editar; las referencias van después.
  form.append('image[]', inputToBlob(p.sketchupImage), 'sketchup.png');
  p.referenceImages.forEach((img, i) => form.append('image[]', inputToBlob(img), `ref${i}.png`));

  const res = await retryWithExponentialBackoff(() =>
    fetch('https://api.openai.com/v1/images/edits', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    }),
  );
  const json: any = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error?.message ?? `OpenAI error ${res.status}`);
  const b64 = json?.data?.[0]?.b64_json;
  if (!b64) throw new Error('OpenAI no devolvió imagen.');
  return `data:image/png;base64,${b64}`;
};

// ── FLUX Kontext (vía fal.ai) ───────────────────────────────────────────────
// Usamos el modelo "kontext/multi", que SÍ admite varias imágenes: la captura de
// SketchUp como base + las referencias. fal acepta data URIs directamente.
const inputToDataUri = (img: ImageInput): string =>
  `data:${img.mimeType || 'image/png'};base64,${img.data}`;

const generateWithFlux = async (p: GenerateImageParams): Promise<string> => {
  const apiKey = process.env.FAL_KEY;
  if (!apiKey?.trim()) throw new Error('Falta FAL_KEY en el servidor.');

  const imageUrls = [inputToDataUri(p.sketchupImage), ...p.referenceImages.map(inputToDataUri)];

  // Endpoint síncrono de fal: bloquea hasta que el render está listo.
  const res = await fetch('https://fal.run/fal-ai/flux-pro/kontext/multi', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Key ${apiKey}` },
    body: JSON.stringify({
      prompt: `${SYSTEM_INSTRUCTION}\n\n${p.finalPrompt}`,
      image_urls: imageUrls,
      aspect_ratio: '16:9',
      output_format: 'png',
      num_images: 1,
    }),
  });
  const json: any = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json?.detail?.[0]?.msg ?? json?.detail ?? json?.error ?? `FLUX/fal error ${res.status}`);
  }

  const url: string | undefined = json?.images?.[0]?.url;
  if (!url) throw new Error('FLUX/fal no devolvió imagen.');

  // fal devuelve una URL; la descargamos y la convertimos a data URL como el resto.
  const imgRes = await fetch(url);
  if (!imgRes.ok) throw new Error(`No se pudo descargar el render de FLUX (${imgRes.status}).`);
  const buf = Buffer.from(await imgRes.arrayBuffer());
  return `data:image/png;base64,${buf.toString('base64')}`;
};

// ── Dispatcher ──────────────────────────────────────────────────────────────
export const generateRenderImage = async (p: GenerateImageParams): Promise<string> => {
  switch (p.provider) {
    case 'gpt':
      return generateWithGpt(p);
    case 'flux':
      return generateWithFlux(p);
    case 'gemini':
    default:
      return generateWithGemini(p);
  }
};
