import { GoogleGenAI, GenerateContentResponse, Part, Modality, SafetySetting, HarmCategory, HarmBlockThreshold, Type } from "@google/genai";
import { LightingType, ImagePart } from '../types';

// Default safety settings
const safetySettings: SafetySetting[] = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
];

// Utility function for exponential backoff retries
const retryWithExponentialBackoff = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 5,
  initialDelayMs: number = 1000,
  onProgress?: (message: string) => void,
  baseMessage: string = 'Procesando...'
): Promise<T> => {
  let delay = initialDelayMs;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      if (onProgress) {
        onProgress(`${baseMessage} (Intento ${attempt}/${maxRetries})`);
      }
      return await fn();
    } catch (error: any) {
      const errorMessage = JSON.stringify(error);
      if (attempt === maxRetries || !errorMessage.includes("Deadline expired") && !errorMessage.includes("UNAVAILABLE") && !errorMessage.includes("network error") && !errorMessage.includes("503")) {
        // If it's the last attempt, or not a retriable error, rethrow
        throw error;
      }
      console.warn(`Intento ${attempt} fallido: ${errorMessage}. Reintentando en ${delay / 1000}s...`);
      if (onProgress) {
        onProgress(`${baseMessage} (Fallo en intento ${attempt}, reintentando en ${delay / 1000}s...)`);
      }
      await new Promise(res => setTimeout(res, delay));
      delay *= 2; // Exponential increase
    }
  }
  throw new Error("Maximum retries exceeded."); // Should not be reached if error is rethrown
};


const fileToPart = async (file: File): Promise<Part> => {
  const base64EncodedData = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') resolve(reader.result.split(',')[1]);
      else reject(new Error("Failed to read file as Data URL"));
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  return { inlineData: { data: base64EncodedData, mimeType: file.type } };
};

const handleApiResponse = (response: GenerateContentResponse, prompt: string): string => {
  const imagePart = response.candidates?.[0]?.content?.parts?.find(
    (part): part is ImagePart => (part as ImagePart).inlineData !== undefined
  );

  if (imagePart && imagePart.inlineData) {
    return `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
  } else {
    const textPart = response.candidates?.[0]?.content?.parts?.find((part) => typeof (part as {text?: string}).text === 'string');
    const textOutput = (textPart as {text?: string})?.text;
    console.error("API Response error. Full response:", JSON.stringify(response, null, 2));
    throw new Error(`No se encontró imagen. ${textOutput ? `Mensaje del modelo: "${textOutput}"` : ''}`);
  }
};

/**
 * Detects scene elements. 
 * CRÍTICO: Extremadamente simplificado para evitar timeouts. La IA solo extrae el contexto clave y las zonas vacías
 * en un formato libre. La FIDELIDAD EXACTA DE GEOMETRÍA, COLORES Y MICRO-DETALLES se delega al modelo de generación de imagen final.
 */
export const detectSceneElements = async (originalImages: File[], onProgress?: (message: string) => void): Promise<string> => {
  if (originalImages.length === 0) return 'No images provided.';

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! || process.env.API_KEY! });
  const imageParts = await Promise.all(originalImages.map(file => fileToPart(file)));

  const prompt = `
  Eres un **Observador Meticuloso de Escenas y Modelos 3D para Renderizado Fotorrealista**. Tu objetivo es analizar la imagen de SketchUp y proporcionar una descripción concisa pero **extremadamente precisa y detallada** de cada elemento visible, incluyendo sus atributos clave y las zonas vacías cruciales. La **imagen de entrada es la fuente ABSOLUTA para la geometría exacta, la composición espacial y la perspectiva de cámara**. Tu descripción debe guiar al modelo de renderizado para aplicar materiales, texturas y detalles fotorrealistas con **ALTA FIDELIDAD GEOMÉTRICA Y SEMÁNTICA** a la estructura visual y los atributos percibidos del SketchUp.

  Genera la descripción en formato de lista concisa, enfocántote en:
  - **Contexto del Evento:** [Tipo de evento y estilo general, usando adjetivos descriptivos. Ej: "Boda campestre romántica y rústica", "Fiesta de cumpleaños infantil vibrante y temática de jungla".]
  - **Objetos Principales y Atributos:** [Identifica *cada objeto distintivo* (ej. mesas, sillas, decoraciones, estructuras, arreglos florales). Para CADA UNO, describe su **forma/silueta**, **material predominante**, **textura percibida** y **color observado**.
    *   **CRÍTICO:** Mantén la **adherencia geométrica exacta** a la forma y volumen del SketchUp para cada objeto.
    *   Ej: "Mesas redondas bajas (forma cilíndrica) con manteles blancos de lino de textura suave y caída fluida", "Sillas Chiavari de madera clara pulida con cojines de terciopelo blanco", "Gran arreglo floral central de forma irregular (mantener silueta y volumen exactos del SketchUp) compuesto por rosas pastel, eucalipto verde empolvado y pequeñas luces LED cálidas integradas".]
  - **Elements Naturales/Entorno:** [Describe el suelo (tipo, condición), paredes (material, color, estado), vegetación (tipo, altura, densidad), u otros elementos del entorno. Ej: "Pasto corto y bien cuidado, color verde esmeralda", "Pared de ladrillo rústico gris oscuro con hiedra densa cubriéndola parcialmente", "Cielo azul claro con nubes tenues".]
  - **Zonas Vacías/Restringidas:** [Lista específicamente las áreas que deben permanecer absolutamente vacías y sin objetos añadidos, describiendo sus **características visuales y materiales**. Ej: "Primer plano izquierdo: camino de baldosas de terracota lisas y limpias, vacío", "Centro: pasillo de adoquines grises despejado entre mesas".]
  - **Iluminación Base Observada:** [Una descripción sencilla de la iluminación inicial en el SketchUp, incluyendo la dirección y dureza de las sombras si son discernibles. Ej: "Iluminación diurna suave desde arriba, con sombras difusas", "Luces de atardecer doradas proyectando sombras largas y nítidas desde la derecha".]

  Reglas Absolutas para tu OUTPUT:
  - Sé CONCISO pero INFORMATIVO en cada punto. Usa frases descriptivas clave para detallar los atributos.
  - NO divagues. Cada frase debe aportar un detalle corregible y relevante para el renderizado.
  - La **FIDELIDAD visual de la GEOMETRÍA, COMPOSICIÓN, POSICIÓN Y ESCALA** proviene de la **IMAGEN DE ENTRADA, NO de tu texto**. Tu texto proporciona la **información semántica crucial** para aplicar materiales y texturas realistas.
  - No incluyas detalles que no puedas percibir directamente de la imagen de SketchUp.
  `;

  try {
    const response: GenerateContentResponse = await retryWithExponentialBackoff(
      () => ai.models.generateContent({
        model: 'gemini-3-flash-preview', 
        contents: { parts: [...imageParts, { text: prompt }] },
        config: { safetySettings },
      }),
      5, // maxRetries
      1000, // initialDelayMs
      onProgress,
      'Analizando elementos esenciales de la escena'
    );
    return response.text?.trim() || 'No description available.';
  } catch (error: any) {
    if (error.message?.includes("Requested entity was not found")) {
      throw new Error("Invalid API Key. Please select a valid API key from a paid GCP project.");
    }
    throw new Error(`Error detectando elementos: ${error.message}`);
  }
};

/**
 * Refines prompt.
 * CRÍTICO: Máxima "Shape Retention", "Day-to-Night Force" y reintroducción de NEGATIVE CONSTRAINTS generales.
 * Este prompt ahora se enfoca en INSTRUIR al modelo de generación de imagen para que use la imagen original como blueprint.
 */
export const refinePromptForGeneration = async (
  sceneElementsDescription: string,
  lightingType: LightingType,
  advancedLightingInstructions: string,
  colorTemperature: 'warm' | 'neutral' | 'cool' | 'golden',
  exposureCompensation: 'standard' | 'brighter' | 'darker' | 'very_bright' | 'very_dark',
  contrastEnhancement: 'natural' | 'enhanced' | 'soft' | 'high_contrast' | 'low_contrast',
  hasReferenceImages: boolean = false,
  onProgress?: (message: string) => void
): Promise<string> => {
  
  let lightingDetails = '';
  let forceDarkness = '';

  switch (lightingType) {
    case LightingType.Day: 
      lightingDetails = "Lighting: Natural daylight. Shadows: Sharp, realistic, and consistent with sun position."; 
      break;
    case LightingType.Sunset: 
      lightingDetails = "Lighting: Golden hour. Warm tones, long and soft shadows."; 
      break;
    case LightingType.Night: 
      lightingDetails = "Lighting: NIGHT EVENT. Primary light sources are candles and specified lamps."; 
      forceDarkness = "OVERRIDE CRÍTICO ABSOLUTO: La entrada es diurna, la salida DEBE ser NOCTURNA. Ignora CUALQUIER brillo de entrada. Transforma el cielo azul en NEGRO PROFUNDO. Transforma el pasto verde en CÉSPED/TIERRA OSCURECIDA Y SOMBREADA. La única luz DEBE provenir de las fuentes especificadas (velas, lámparas), sin introducir nuevas fuentes lumínicas no descritas en el SketchUp. Las sombras deben ser profundas, nítidas y dramáticas, adecuadas para una noche real, respetando el volumen de los objetos.";
      break;
  }

  const referenceInstruction = hasReferenceImages
    ? `REFERENCES: Use attached images ONLY for FLOWER/LEAF TEXTURE and MATERIAL PROPERTIES (e.g., tipo de pétalo, acabado metálico, grano de madera). Do NOT copy the shape of the arrangement or any object from the references. Adhere strictly to the SketchUp blob/volume shape.`
    : '';

  // PROMPT MAESTRO CORREGIDO Y BLINDADO
  const refinementPrompt = `
  ### SYSTEM ROLE: HIGH-FIDELITY PHOTOREALISTIC RENDERING ENGINE (VISUAL ADHERENCE & REALISM BOT) ###
  
  Your ONLY task is to apply **Ultra-Photorealistic 8K PBR Textures and sophisticated lighting** to the input image. You **MUST NOT, under any circumstances, alter the existing geometry, add new objects, or change the composition or camera perspective.** The input image is your **primary visual guide and foundation** for depth, shape, object placement, **original color palette, and fine textural details.** This includes strong adherence to original geometry and composition, aiming for high fidelity in object placement and scale, and absolute color/texture fidelity.

  ### THE "BLOB" RULE (CRITICAL) ###
  The input image contains irregular green shapes/masses (e.g., floral structures, foliage).
  1. **DO NOT turn them into arches.**
  2. **DO NOT turn them into standard bouquets or symmetrical arrangements.**
  3. **YOU MUST RESPECT THE EXACT IRREGULAR SILHOUETTE and VOLUMETRIC SHAPE of the green mass, 1:1.**
  4. Fill that exact silhouette and volume with high-quality, photorealistic tiny flowers and leaves (PBR texture), but DO NOT change the outer boundary or internal wireframe of the original blob.

  ⛔️ NEGATIVE CONSTRAINTS (THINGS YOU MUST NOT DO):
  - **NO HALLUCINATIONS:** DO NOT add ANY tables, chairs, decorations, furniture, o cualquier objeto nuevo into empty spaces. If the input describes "ZONAS VACÍAS", the output MUST reflect this emptiness with realistic textures (e.g., realistic empty grass, realistic empty wall) but WITHOUT any added objects. This is a TERRITORIO CERO OBJETOS.
  - **NO GEOMETRY CHANGES (HIGH ADHERENCE):** Do not move the camera (no zoom, no pan, no crop). Do not rotate, resize, or reposition existing objects. Maintain a very strong visual match between input and output geometry.
  - **NO RE-COMPOSITION / NO ARTISTIC OVER-INTERPRETATION:** Do not try to "improve" the framing, composition, or scene layout beyond photorealistic enhancement. Adhere strictly to the input image's boundaries and internal layout. You are a technical renderer, not an artist who redesigns.
  - **NO CARTOONISH/PLASTIC LOOKS:** Ensure PBR materials are applied realistically, with accurate reflections, refractions, subsurface scattering, and micro-details (weave, seams, etc.).
  - **CRÍTICO: NO ALTERAR COLORES NI TONALIDADES DE TEXTURA:** Maintain the core color palette and tonal values as perceived in the ORIGINAL IMAGE. The PBR textures should **ENHANCE** the realism of existing colors *while respecting* these colors. DO NOT arbitrarily change the HUES, SATURATION, or VALUE of the base colors perceived from the original image.

  ### CRITICAL OUTPUT PARAMETERS ###
  1. **ASPECT RATIO:** 16:9 (Landscape) - FIXED.
  2. **COMPOSITION/GEOMETRY:** Strong adherence to original geometry and composition (INPUT IS PRIMARY VISUAL GUIDE FOR DEPTH & SHAPE), INCLUDING MICRO-DETAILS.
  3. **TEXTURE QUALITY (PRIORITY):** Ultra-Photorealistic 8K PBR materials with **HIGH COLOR FIDELITY**.

  ### LIGHTING & ATMOSPHERE ###
  **Target:** ${lightingDetails}
  **Force Override:** ${forceDarkness}
  **Atmosphere:** Color Temp: ${colorTemperature}, Contrast: ${contrastEnhancement}. Style: High-End Event Photography, Architectural Visualization, Photo Studio Quality.

  ### SCENE CONTEXT AND GUIDANCE (FROM USER INPUT/DETECTION) ###
  ${sceneElementsDescription}

  ${referenceInstruction}

  Prioritize generating a high-quality photorealistic image that strongly adheres to the visual input, even if minor interpretations are necessary for achieving extreme realism. Avoid empty outputs or failures due to overly literal interpretations of 'pixel-perfect' replication.
  Generate an extremely precise image generation prompt that imposes strong silhouette preservation (especially for floral structures and any irregular volumes), prevents ALL hallucinations in empty areas, strictly forces the requested lighting change, **maintains high color and texture fidelity (COLOR-GUIDED BY ORIGINAL IMAGE)**, and maximizes the realism of 8K PBR textures, strongly matching the input geometry and composition, including micro-details.
  `;

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! || process.env.API_KEY! });
  try {
    const response: GenerateContentResponse = await retryWithExponentialBackoff(
      () => ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: refinementPrompt,
      }),
      5, // maxRetries
      1000, // initialDelayMs
      onProgress,
      'Refinando prompt para generación'
    );
    return response.text?.trim() || "Prompt error.";
  } catch (error: any) {
    throw new Error(`Error refining prompt: ${error.message}`);
  }
};

const generateEventRender = async (originalImage: File, finalPrompt: string, referenceImages: File[], onProgress?: (message: string) => void): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! || process.env.API_KEY! });
  const parts = [
    await fileToPart(originalImage),
    ...await Promise.all(referenceImages.map(f => fileToPart(f))),
    { text: finalPrompt }
  ];

  try {
    const response: GenerateContentResponse = await retryWithExponentialBackoff(
      () => ai.models.generateContent({
        model: 'gemini-3.1-flash-image-preview',
        contents: { parts },
        config: { 
          systemInstruction: "You are a professional architectural and event rendering engine. Your goal is to transform SketchUp screenshots into high-fidelity photorealistic 2K renders. You MUST follow user instructions regarding materials, lighting, and textures while strictly maintaining the geometric silhouettes of the original input. Do not add or remove physical objects.",
          safetySettings,
          imageConfig: {
              aspectRatio: "16:9",
              imageSize: "2K"
          }
        },
      }),
      5, // maxRetries
      5000, // initialDelayMs for image generation, which can be longer
      onProgress,
      'Generando render fotorrealista'
    );
    return handleApiResponse(response, finalPrompt);
  } catch (error: any) {
    if (error.message?.includes("Requested entity was not found")) throw new Error("Invalid API Key.");
    throw error;
  }
};

export const generateSingleRender = async (
  sketchupImage: File,
  sceneDescription: string,
  referenceImages: File[],
  lightingType: LightingType,
  advancedLightingInstructions: string,
  colorTemperature: 'warm' | 'neutral' | 'cool' | 'golden',
  exposureCompensation: 'standard' | 'brighter' | 'darker' | 'very_bright' | 'very_dark',
  contrastEnhancement: 'natural' | 'enhanced' | 'soft' | 'high_contrast' | 'low_contrast',
  onProgress: (message: string) => void
): Promise<{ url: string | null; error: string | null }> => {
  
  onProgress(`Preparando análisis de la escena para una fidelidad perfecta...`);

  if (!sceneDescription.trim()) return { url: null, error: 'Falta descripción.' };

  try {
    const refinedPrompt = await refinePromptForGeneration(
      sceneDescription,
      lightingType,
      advancedLightingInstructions,
      colorTemperature,
      exposureCompensation,
      contrastEnhancement,
      referenceImages.length > 0,
      onProgress 
    );

    // Simplificamos el lock para que sea más natural para el modelo
    const strictLock = "\n\nCRITICAL: Maintain 100% geometric fidelity to the SketchUp screenshot. Apply ultra-photorealistic 8K PBR textures only to existing surfaces. Ensure the lighting transformation is absolute. No new objects. This output MUST be a high-resolution 2K image.";
    const combinedPrompt = refinedPrompt + strictLock;

    console.log("Prompt final para renderizado:", combinedPrompt);
    
    const imageUrl = await generateEventRender(sketchupImage, combinedPrompt, referenceImages, onProgress);
    return { url: imageUrl, error: null };
  } catch (error: any) {
    console.error(error);
    return { url: null, error: error.message || 'Error desconocido' };
  }
};