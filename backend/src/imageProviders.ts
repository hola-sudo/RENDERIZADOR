// Generación de la imagen final (Rol B). El "cerebro" que analiza la escena y
// refina el prompt sigue en Gemini (ver gemini.ts); aquí solo elegimos QUÉ modelo
// pinta el render:
//   - gemini    → Gemini nativo (rápido, sin control estructural)
//   - gpt       → OpenAI gpt-image-1 (regenerador, poca fidelidad geométrica)
//   - flux      → FLUX Kontext vía fal.ai (edición por instrucciones)
//   - flux-max  → FLUX.1[dev] + ControlNet Union (Canny+Depth) + IP-Adapter (build "Avanzado")
// flux-max ANCLA la geometría del SketchUp: preprocesa la captura para extraer su
// estructura (bordes + profundidad), obliga al modelo a respetarla y usa las
// referencias como IP-Adapter para mantener materiales/estilo entre escenas.
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

export type ImageProvider = 'gemini' | 'gpt' | 'flux' | 'flux-max';

export const IMAGE_PROVIDERS: ImageProvider[] = ['gemini', 'gpt', 'flux', 'flux-max'];

export interface GenerateImageParams {
  provider: ImageProvider;
  sketchupImage: ImageInput;
  referenceImages: ImageInput[];
  finalPrompt: string;
  // Solo aplican a flux-max (el build con ControlNet):
  strength?: number;        // img2img denoise: 0=idéntico al SketchUp, 1=repinta del todo (default 0.85).
  controlStrength?: number; // sobre-escribe la escala de ControlNet para canny y depth (default 0.7/0.8).
  ipScale?: number;         // fuerza del IP-Adapter sobre las referencias (default 0.7).
  seed?: number;            // fija el resultado para reproducibilidad.
}

export interface RenderResult {
  url: string;    // data URL base64 de la imagen final
  seed?: number;  // seed usado (solo lo devuelven los modelos de fal)
}

const SYSTEM_INSTRUCTION =
  'You are a professional architectural and event rendering engine. Transform SketchUp screenshots into high-fidelity photorealistic 2K renders, following user instructions on materials, lighting, and textures while strictly maintaining the geometric silhouettes of the original input. Do not add or remove physical objects.';

// Pesos verificados (HuggingFace) que acepta fal-ai/flux-general.
const CONTROLNET_UNION_PATH = 'Shakker-Labs/FLUX.1-dev-ControlNet-Union-Pro';
const IP_ADAPTER_PATH = 'InstantX/FLUX.1-dev-IP-Adapter';
const IP_ADAPTER_ENCODER = 'google/siglip-so400m-patch14-384';

// ── Helpers compartidos ─────────────────────────────────────────────────────
const inputToDataUri = (img: ImageInput): string =>
  `data:${img.mimeType || 'image/png'};base64,${img.data}`;

const inputToBlob = (img: ImageInput): Blob =>
  new Blob([Buffer.from(img.data, 'base64')], { type: img.mimeType || 'image/png' });

// Descarga una URL remota y la convierte a data URL base64 (formato que espera el resto del backend).
const urlToDataUrl = async (url: string): Promise<string> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`No se pudo descargar la imagen generada (${res.status}).`);
  const buf = Buffer.from(await res.arrayBuffer());
  return `data:image/png;base64,${buf.toString('base64')}`;
};

// Llamada síncrona a un endpoint de fal.ai (bloquea hasta tener el resultado).
const falRun = async (endpoint: string, body: unknown, apiKey: string): Promise<any> => {
  const res = await fetch(`https://fal.run/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Key ${apiKey}` },
    body: JSON.stringify(body),
  });
  const json: any = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json?.detail?.[0]?.msg ?? json?.detail ?? json?.error ?? `fal error ${res.status}`);
  }
  return json;
};

// ── Gemini ──────────────────────────────────────────────────────────────────
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

const generateWithGemini = async (p: GenerateImageParams): Promise<RenderResult> => {
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
  return { url: handleGeminiResponse(response) };
};

// ── OpenAI (gpt-image-1) ────────────────────────────────────────────────────
const generateWithGpt = async (p: GenerateImageParams): Promise<RenderResult> => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey?.trim()) throw new Error('Falta OPENAI_API_KEY en el servidor.');

  const form = new FormData();
  form.append('model', 'gpt-image-1');
  form.append('prompt', `${SYSTEM_INSTRUCTION}\n\n${p.finalPrompt}`);
  form.append('size', '1536x1024'); // el tamaño horizontal más cercano a 16:9 en gpt-image-1
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
  return { url: `data:image/png;base64,${b64}` };
};

// ── FLUX Kontext (vía fal.ai) ───────────────────────────────────────────────
// Edición por instrucciones multi-imagen (SketchUp base + referencias). Sin ControlNet.
const generateWithFlux = async (p: GenerateImageParams): Promise<RenderResult> => {
  const apiKey = process.env.FAL_KEY;
  if (!apiKey?.trim()) throw new Error('Falta FAL_KEY en el servidor.');

  const imageUrls = [inputToDataUri(p.sketchupImage), ...p.referenceImages.map(inputToDataUri)];

  const json = await falRun(
    'fal-ai/flux-pro/kontext/multi',
    {
      prompt: `${SYSTEM_INSTRUCTION}\n\n${p.finalPrompt}`,
      image_urls: imageUrls,
      aspect_ratio: '16:9',
      output_format: 'png',
      num_images: 1,
    },
    apiKey,
  );

  const url: string | undefined = json?.images?.[0]?.url;
  if (!url) throw new Error('FLUX/fal no devolvió imagen.');
  return { url: await urlToDataUrl(url), seed: json?.seed };
};

// ── FLUX.1[dev] + ControlNet Union + IP-Adapter (build "Avanzado") ──────────
// Preprocesa el SketchUp para sacar su estructura y la usa como candado de geometría.
const preprocessStructure = async (
  kind: 'canny' | 'depth',
  imageDataUri: string,
  apiKey: string,
): Promise<string> => {
  const endpoint =
    kind === 'canny'
      ? 'fal-ai/image-preprocessors/canny'
      : 'fal-ai/image-preprocessors/depth-anything/v2';
  const json = await falRun(endpoint, { image_url: imageDataUri }, apiKey);
  const url: string | undefined = json?.image?.url;
  if (!url) throw new Error(`El preprocesador "${kind}" no devolvió el mapa de estructura.`);
  return url;
};

const generateWithFluxMax = async (p: GenerateImageParams): Promise<RenderResult> => {
  const apiKey = process.env.FAL_KEY;
  if (!apiKey?.trim()) throw new Error('Falta FAL_KEY en el servidor.');

  const baseImage = inputToDataUri(p.sketchupImage);

  // Paso 1 — estructura del SketchUp: bordes (canny) + profundidad (depth) en paralelo.
  const [cannyMap, depthMap] = await Promise.all([
    preprocessStructure('canny', baseImage, apiKey),
    preprocessStructure('depth', baseImage, apiKey),
  ]);

  // Paso 2 — un único ControlNet Union con AMBOS modos (así se combinan pese al
  // límite de "un solo controlnet"). Escalas recomendadas por Shakker-Labs.
  const controlnetUnions = [
    {
      path: CONTROLNET_UNION_PATH,
      controls: [
        {
          control_image_url: cannyMap,
          control_mode: 'canny',
          conditioning_scale: p.controlStrength ?? 0.7,
          end_percentage: 0.8,
        },
        {
          control_image_url: depthMap,
          control_mode: 'depth',
          conditioning_scale: p.controlStrength ?? 0.8,
          end_percentage: 0.8,
        },
      ],
    },
  ];

  // Paso 3 — IP-Adapter con la primera referencia (materiales/estilo), si la hay.
  const ipAdapters =
    p.referenceImages.length > 0
      ? [
          {
            path: IP_ADAPTER_PATH,
            image_encoder_path: IP_ADAPTER_ENCODER,
            image_url: inputToDataUri(p.referenceImages[0]),
            scale: p.ipScale ?? 0.7,
          },
        ]
      : [];

  const body: Record<string, unknown> = {
    prompt: `${SYSTEM_INSTRUCTION}\n\n${p.finalPrompt}`,
    image_url: baseImage, // base img2img (conserva la paleta de color del SketchUp)
    strength: p.strength ?? 0.85,
    controlnet_unions: controlnetUnions,
    ip_adapters: ipAdapters,
    num_inference_steps: 28,
    guidance_scale: 3.5,
    image_size: 'landscape_16_9',
    output_format: 'png',
    num_images: 1,
  };
  if (typeof p.seed === 'number' && Number.isFinite(p.seed)) body.seed = p.seed;

  const json = await falRun('fal-ai/flux-general/image-to-image', body, apiKey);
  const url: string | undefined = json?.images?.[0]?.url;
  if (!url) throw new Error('FLUX/ControlNet no devolvió imagen.');
  return { url: await urlToDataUrl(url), seed: json?.seed };
};

// ── Dispatcher ──────────────────────────────────────────────────────────────
export const generateRenderImage = async (p: GenerateImageParams): Promise<RenderResult> => {
  switch (p.provider) {
    case 'gpt':
      return generateWithGpt(p);
    case 'flux':
      return generateWithFlux(p);
    case 'flux-max':
      return generateWithFluxMax(p);
    case 'gemini':
    default:
      return generateWithGemini(p);
  }
};
