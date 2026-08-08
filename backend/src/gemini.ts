import {
  GoogleGenAI,
  type Part,
  type SafetySetting,
  HarmCategory,
  HarmBlockThreshold,
} from '@google/genai';
import { generateRenderImage } from './imageProviders.js';

// Tipos del dominio (equivalentes a los del frontend).
export enum LightingType {
  Day = 'day',
  Sunset = 'sunset',
  Night = 'night',
}

export interface ImageInput {
  data: string; // base64 SIN el prefijo "data:...;base64,"
  mimeType: string;
}

export const safetySettings: SafetySetting[] = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
];

const getGeminiClient = (): GoogleGenAI => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '') {
    throw new Error('Falta GEMINI_API_KEY en el servidor.');
  }
  return new GoogleGenAI({ apiKey });
};

export const imageToPart = (img: ImageInput): Part => ({
  inlineData: { data: img.data, mimeType: img.mimeType },
});

export const retryWithExponentialBackoff = async <T>(
  fn: () => Promise<T>,
  maxRetries = 5,
  initialDelayMs = 1000,
): Promise<T> => {
  let delay = initialDelayMs;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      const msg = JSON.stringify(error);
      const retriable =
        msg.includes('Deadline expired') ||
        msg.includes('UNAVAILABLE') ||
        msg.includes('network error') ||
        msg.includes('503');
      if (attempt === maxRetries || !retriable) throw error;
      await new Promise((res) => setTimeout(res, delay));
      delay *= 2;
    }
  }
  throw new Error('Maximum retries exceeded.');
};

/** Analiza la imagen de SketchUp y devuelve una descripción de la escena. */
export const detectSceneElements = async (originalImages: ImageInput[]): Promise<string> => {
  if (originalImages.length === 0) return 'No images provided.';

  const ai = getGeminiClient();
  const imageParts = originalImages.map(imageToPart);

  const prompt = `
  Eres un **Observador Meticuloso de Escenas y Modelos 3D para Renderizado Fotorrealista**. Tu objetivo es analizar la imagen de SketchUp y proporcionar una descripción concisa pero **extremadamente precisa y detallada** de cada elemento visible, incluyendo sus atributos clave y las zonas vacías cruciales. La **imagen de entrada es la fuente ABSOLUTA para la geometría exacta, la composición espacial y la perspectiva de cámara**. Tu descripción debe guiar al modelo de renderizado para aplicar materiales, texturas y detalles fotorrealistas con **ALTA FIDELIDAD GEOMÉTRICA Y SEMÁNTICA** a la estructura visual y los atributos percibidos del SketchUp.

  Genera la descripción en formato de lista concisa, enfocándote en:
  - **Contexto del Evento:** [Tipo de evento y estilo general, usando adjetivos descriptivos.]
  - **Objetos Principales y Atributos:** [Identifica cada objeto distintivo y describe su forma/silueta, material predominante, textura percibida y color observado. Mantén la adherencia geométrica exacta a la forma y volumen del SketchUp.]
  - **Elementos Naturales/Entorno:** [Suelo, paredes, vegetación u otros elementos del entorno.]
  - **Zonas Vacías/Restringidas:** [Áreas que deben permanecer absolutamente vacías, describiendo sus características visuales y materiales.]
  - **Masas Florales:** [Responde EXACTAMENTE "SÍ" o "NO". Responde "SÍ" únicamente si existen formas verdes irregulares tipo "blob" o masas sin detalle que claramente representen ARREGLOS FLORALES O FOLLAJE DECORATIVO pendientes de modelar. Responde "NO" si la vegetación visible son solo árboles, arbustos, pasto o plantas de entorno ya definidos, o si no hay vegetación.]

  Reglas Absolutas para tu OUTPUT:
  - Sé CONCISO pero INFORMATIVO en cada punto.
  - La FIDELIDAD visual de la GEOMETRÍA, COMPOSICIÓN, POSICIÓN Y ESCALA proviene de la IMAGEN DE ENTRADA, NO de tu texto.
  - No incluyas detalles que no puedas percibir directamente de la imagen de SketchUp.
  `;

  try {
    const response = await retryWithExponentialBackoff(() =>
      ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: { parts: [...imageParts, { text: prompt }] },
        config: { safetySettings },
      }),
    );
    return response.text?.trim() || 'No description available.';
  } catch (error: any) {
    if (error.message?.includes('Requested entity was not found')) {
      throw new Error('Invalid API Key. Please select a valid API key from a paid GCP project.');
    }
    throw new Error(`Error detectando elementos: ${error.message}`);
  }
};

const refinePromptForGeneration = async (
  sceneElementsDescription: string,
  lightingType: LightingType,
  colorTemperature: string,
  contrastEnhancement: string,
  hasReferenceImages: boolean,
): Promise<string> => {
  let lightingDetails = '';
  let forceDarkness = '';

  switch (lightingType) {
    case LightingType.Day:
      lightingDetails = 'Lighting: Natural daylight. Shadows: Sharp, realistic, and consistent with sun position.';
      break;
    case LightingType.Sunset:
      lightingDetails = 'Lighting: Golden hour. Warm tones, long and soft shadows.';
      break;
    case LightingType.Night:
      lightingDetails = 'Lighting: NIGHT EVENT. Primary light sources are candles and specified lamps.';
      forceDarkness =
        'OVERRIDE CRÍTICO ABSOLUTO: La entrada es diurna, la salida DEBE ser NOCTURNA. Ignora CUALQUIER brillo de entrada. Transforma el cielo azul en NEGRO PROFUNDO. Transforma el pasto verde en CÉSPED/TIERRA OSCURECIDA Y SOMBREADA. La única luz DEBE provenir de las fuentes especificadas (velas, lámparas). Las sombras deben ser profundas, nítidas y dramáticas.';
      break;
  }

  // La BLOB RULE instruye ACTIVAMENTE rellenar masas verdes con flores. Si la escena
  // no tiene arreglos florales por modelar, inyectarla hace que el modelo invente
  // vegetación donde no la hay. Solo se aplica si el detector marcó "Masas Florales: SÍ".
  // Ojo: \b no sirve tras "í" (las vocales acentuadas no son \w en JS), y sin límite
  // de palabra un "Sin arreglos florales" haría match falso. De ahí el lookahead.
  const hasFloralMasses = /masas\s+florales[^\n]*?:[\s*]*s[íi](?![a-záéíóúñ])/i.test(
    sceneElementsDescription,
  );

  const referenceInstruction = !hasReferenceImages
    ? ''
    : hasFloralMasses
      ? 'REFERENCES: Use attached images ONLY for FLOWER/LEAF TEXTURE and MATERIAL PROPERTIES. Do NOT copy the shape of the arrangement or any object from the references. Adhere strictly to the SketchUp blob/volume shape.'
      : 'REFERENCES: Use attached images ONLY for MATERIAL PROPERTIES and TEXTURE QUALITY. Do NOT copy the shape, layout, or any object from the references. Adhere strictly to the SketchUp geometry.';

  const blobRule = hasFloralMasses
    ? `### THE "BLOB" RULE (CRITICAL) ###
  The input image contains irregular green shapes/masses (floral structures, foliage).
  1. DO NOT turn them into arches.
  2. DO NOT turn them into standard bouquets or symmetrical arrangements.
  3. YOU MUST RESPECT THE EXACT IRREGULAR SILHOUETTE and VOLUMETRIC SHAPE of the green mass, 1:1.
  4. Fill that exact silhouette with high-quality photorealistic tiny flowers and leaves (PBR texture), without changing the outer boundary.`
    : `### VEGETATION RULE (CRITICAL) ###
  This scene has NO floral arrangements pending to be modeled.
  1. Render ONLY the vegetation that already exists in the input image (trees, shrubs, grass, potted plants).
  2. Respect its exact silhouette and volume 1:1 — do not expand, densify, or extend it.
  3. DO NOT add flowers, floral arrangements, bouquets, hedges, or any new plant anywhere in the scene.`;

  const refinementPrompt = `
  ### SYSTEM ROLE: HIGH-FIDELITY PHOTOREALISTIC RENDERING ENGINE (VISUAL ADHERENCE & REALISM BOT) ###

  Your ONLY task is to apply **Ultra-Photorealistic 8K PBR Textures and sophisticated lighting** to the input image. You **MUST NOT alter the existing geometry, add new objects, or change the composition or camera perspective.** The input image is your primary visual guide for depth, shape, object placement, original color palette, and fine textural details.

  ${blobRule}

  ⛔️ NEGATIVE CONSTRAINTS:
  - NO HALLUCINATIONS: DO NOT add tables, chairs, decorations, furniture, or any new object into empty spaces. "ZONAS VACÍAS" must stay empty with realistic textures. This applies especially to floors, pavement, and entrances.
  - NO GEOMETRY CHANGES: No zoom, pan, crop, rotate, resize, or reposition. Maintain a very strong visual match between input and output geometry.
  - NO RE-COMPOSITION: Do not "improve" the framing or layout beyond photorealistic enhancement.
  - NO CARTOONISH/PLASTIC LOOKS: Apply PBR materials realistically.
  - NO ALTERAR COLORES: Maintain the core color palette and tonal values from the ORIGINAL IMAGE.

  ### CRITICAL OUTPUT PARAMETERS ###
  1. ASPECT RATIO: 16:9 (Landscape) - FIXED.
  2. COMPOSITION/GEOMETRY: Strong adherence to original geometry and composition, including micro-details.
  3. TEXTURE QUALITY: Ultra-Photorealistic 8K PBR materials with HIGH COLOR FIDELITY.

  ### LIGHTING & ATMOSPHERE ###
  **Target:** ${lightingDetails}
  **Force Override:** ${forceDarkness}
  **Atmosphere:** Color Temp: ${colorTemperature}, Contrast: ${contrastEnhancement}. Style: High-End Event Photography, Architectural Visualization, Photo Studio Quality.

  ### SCENE CONTEXT AND GUIDANCE ###
  ${sceneElementsDescription}

  ${referenceInstruction}

  Generate an extremely precise image generation prompt that imposes strong silhouette preservation, prevents ALL hallucinations in empty areas, strictly forces the requested lighting change, maintains high color and texture fidelity, and maximizes the realism of 8K PBR textures.
  `;

  const ai = getGeminiClient();
  const response = await retryWithExponentialBackoff(() =>
    ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: refinementPrompt,
    }),
  );
  return response.text?.trim() || 'Prompt error.';
};

export interface RenderParams {
  sketchupImage: ImageInput;
  referenceImages: ImageInput[];
  sceneDescription: string;
  lightingType: LightingType;
  colorTemperature: string;
  contrastEnhancement: string;
}

/** Orquesta el render completo: refina el prompt y genera la imagen. */
export const generateSingleRender = async (
  params: RenderParams,
): Promise<{ url: string | null; error: string | null }> => {
  if (!params.sceneDescription.trim()) return { url: null, error: 'Falta descripción.' };

  try {
    const refinedPrompt = await refinePromptForGeneration(
      params.sceneDescription,
      params.lightingType,
      params.colorTemperature,
      params.contrastEnhancement,
      params.referenceImages.length > 0,
    );

    const strictLock =
      '\n\nCRITICAL: Maintain 100% geometric fidelity to the SketchUp screenshot. Apply ultra-photorealistic 8K PBR textures only to existing surfaces. Ensure the lighting transformation is absolute. No new objects. This output MUST be a high-resolution 2K image.';

    const result = await generateRenderImage({
      sketchupImage: params.sketchupImage,
      referenceImages: params.referenceImages,
      finalPrompt: refinedPrompt + strictLock,
    });
    return { url: result.url, error: null };
  } catch (error: any) {
    return { url: null, error: error.message || 'Error desconocido' };
  }
};
