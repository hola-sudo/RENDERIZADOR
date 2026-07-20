import React, { useState, useCallback, useRef } from 'react';
import { detectSceneElements, generateSingleRender } from '../services/apiService';
import LoadingSpinner from '../components/LoadingSpinner';
import { LightingType, LightingConfig, IMAGE_PROVIDER_OPTIONS, type ImageProvider } from '../types';

const STEPS = [
  { id: 1, label: 'Escena' },
  { id: 2, label: 'Detectar' },
  { id: 3, label: 'Referencias' },
  { id: 4, label: 'Iluminación' },
  { id: 5, label: 'Generar' },
];

const resizeImageFile = (file: File, maxWidth: number, maxHeight: number, quality: number): Promise<File> =>
  new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e: ProgressEvent<FileReader>) => {
      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement('canvas');
        let w = image.width, h = image.height;
        if (w > h) { if (w > maxWidth) { h *= maxWidth / w; w = maxWidth; } }
        else { if (h > maxHeight) { w *= maxHeight / h; h = maxHeight; } }
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d')?.drawImage(image, 0, 0, w, h);
        canvas.toBlob(
          (blob) => resolve(blob ? new File([blob], file.name, { type: 'image/jpeg', lastModified: Date.now() }) : file),
          'image/jpeg', quality
        );
      };
      image.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });

const EventRender: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [showRender, setShowRender] = useState(false);

  const [uploadedSketchupScene, setUploadedSketchupScene] = useState<File | null>(null);
  const [sketchupScenePreview, setSketchupScenePreview] = useState<string | null>(null);
  const [sceneDescription, setSceneDescription] = useState('');
  const [isDetectingScene, setIsDetectingScene] = useState(false);

  const [referenceImages, setReferenceImages] = useState<File[]>([]);
  const [referenceImagePreviews, setReferenceImagePreviews] = useState<{ file: File; url: string }[]>([]);
  const MAX_REFERENCE_IMAGES = 5;

  const [lightingType, setLightingType] = useState<LightingType>(LightingType.Day);
  const [colorTemperature, setColorTemperature] = useState<LightingConfig['colorTemperature']>('neutral');
  const [exposureCompensation, setExposureCompensation] = useState<LightingConfig['exposureCompensation']>('standard');
  const [contrastEnhancement, setContrastEnhancement] = useState<LightingConfig['contrastEnhancement']>('natural');
  const [advancedLightingInstructions, setAdvancedLightingInstructions] = useState('');
  const [imageProvider, setImageProvider] = useState<ImageProvider>('gemini');

  const [generatedRender, setGeneratedRender] = useState<{ url: string | null; error: string | null } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentGenerationProgress, setCurrentGenerationProgress] = useState('');
  const [error, setError] = useState<string | null>(null);

  const sketchupFileInputRef = useRef<HTMLInputElement>(null);
  const referenceFileInputRef = useRef<HTMLInputElement>(null);
  const lightingConfigFileInputRef = useRef<HTMLInputElement>(null);

  // ── Step helpers ─────────────────────────────────────────────────────────
  const stepCompleted = (id: number) => {
    if (id === 1) return !!uploadedSketchupScene;
    if (id === 2) return !!sceneDescription.trim();
    if (id === 3 || id === 4) return true;
    if (id === 5) return !!generatedRender?.url;
    return false;
  };
  const stepAccessible = (id: number) => {
    if (id === 1) return true;
    if (id === 2) return !!uploadedSketchupScene;
    if (id === 3 || id === 4) return !!sceneDescription.trim();
    if (id === 5) return !!uploadedSketchupScene && !!sceneDescription.trim();
    return false;
  };
  const canAdvance = () => {
    if (currentStep === 1) return !!uploadedSketchupScene;
    if (currentStep === 2) return !!sceneDescription.trim();
    return currentStep < 5;
  };

  // ── Upload ────────────────────────────────────────────────────────────────
  const handleSketchupFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) { setUploadedSketchupScene(null); setSketchupScenePreview(null); return; }
    setIsLoading(true); setCurrentGenerationProgress('Optimizando imagen...');
    try {
      const resized = await resizeImageFile(e.target.files[0] as File, 1920, 1920, 0.8);
      setUploadedSketchupScene(resized);
      setSketchupScenePreview(URL.createObjectURL(resized));
      setSceneDescription(''); setReferenceImages([]); setReferenceImagePreviews([]);
      setGeneratedRender(null); setShowRender(false); setError(null);
    } catch (err: any) {
      setError(`Error al optimizar: ${err.message}`);
    } finally { setIsLoading(false); setCurrentGenerationProgress(''); }
  }, []);

  // ── Detect ────────────────────────────────────────────────────────────────
  const handleDetectSceneElements = useCallback(async () => {
    if (!uploadedSketchupScene) return;
    setIsDetectingScene(true); setError(null); setSceneDescription('');
    setCurrentGenerationProgress('Identificando elementos...');
    try {
      const detected = await detectSceneElements([uploadedSketchupScene], setCurrentGenerationProgress);
      setSceneDescription(detected); setCurrentGenerationProgress('');
    } catch (err: any) {
      setError(`Error al detectar: ${err.message}`);
      setCurrentGenerationProgress('');
    } finally { setIsDetectingScene(false); }
  }, [uploadedSketchupScene]);

  // ── References ────────────────────────────────────────────────────────────
  const handleReferenceImagesChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const current = referenceImages.length;
    const files = Array.from(e.target.files) as File[];
    const newImages = files.slice(0, MAX_REFERENCE_IMAGES - current);
    if (newImages.length) {
      setReferenceImages(p => [...p, ...newImages]);
      setReferenceImagePreviews(p => [...p, ...newImages.map(f => ({ file: f, url: URL.createObjectURL(f) }))]);
    }
    if (current + files.length > MAX_REFERENCE_IMAGES)
      setError(`Máximo ${MAX_REFERENCE_IMAGES} imágenes.`);
    else setError(null);
    if (referenceFileInputRef.current) referenceFileInputRef.current.value = '';
  }, [referenceImages]);

  const handleRemoveReferenceImage = useCallback((fileToRemove: File) => {
    setReferenceImages(p => p.filter(f => f !== fileToRemove));
    setReferenceImagePreviews(p => p.filter(x => x.file !== fileToRemove));
    setError(null);
  }, []);

  // ── Lighting ──────────────────────────────────────────────────────────────
  const handleLoadLightingConfig = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const config: LightingConfig = JSON.parse(ev.target?.result as string);
        if (config.lightingType && config.colorTemperature && config.exposureCompensation && config.contrastEnhancement) {
          setLightingType(config.lightingType); setAdvancedLightingInstructions(config.advancedLightingInstructions);
          setColorTemperature(config.colorTemperature); setExposureCompensation(config.exposureCompensation);
          setContrastEnhancement(config.contrastEnhancement); setError(null);
        } else throw new Error('Formato no válido.');
      } catch (err: any) { setError(`Error al cargar: ${err.message}`); }
    };
    reader.readAsText(e.target.files[0]);
  }, []);

  const handleSaveLightingConfig = useCallback(() => {
    const config: LightingConfig = { lightingType, advancedLightingInstructions, colorTemperature, exposureCompensation, contrastEnhancement };
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'lighting_config.json';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [lightingType, advancedLightingInstructions, colorTemperature, exposureCompensation, contrastEnhancement]);

  // ── Generate ──────────────────────────────────────────────────────────────
  const handleGenerateRender = useCallback(async () => {
    if (!uploadedSketchupScene || !sceneDescription.trim()) return;
    setIsLoading(true); setGeneratedRender(null); setError(null);
    setCurrentGenerationProgress('Iniciando generación...');
    try {
      const result = await generateSingleRender(
        uploadedSketchupScene, sceneDescription, referenceImages, lightingType,
        advancedLightingInstructions, colorTemperature, exposureCompensation, contrastEnhancement,
        imageProvider, setCurrentGenerationProgress
      );
      setGeneratedRender(result);
      if (result.url) setShowRender(true);
      setCurrentGenerationProgress(result.error ? `Error: ${result.error}` : 'Render completado.');
    } catch (err: any) {
      setError(`Error al generar: ${err.message}`);
      setCurrentGenerationProgress('');
    } finally { setIsLoading(false); }
  }, [uploadedSketchupScene, sceneDescription, referenceImages, lightingType, advancedLightingInstructions, colorTemperature, exposureCompensation, contrastEnhancement, imageProvider]);

  const handleDownloadImage = useCallback(() => {
    if (!generatedRender?.url) return;
    const a = document.createElement('a');
    a.href = generatedRender.url; a.download = 'event_render.png';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  }, [generatedRender]);

  const handleStartNewScene = useCallback(() => {
    setUploadedSketchupScene(null); setSketchupScenePreview(null);
    if (sketchupFileInputRef.current) sketchupFileInputRef.current.value = '';
    setSceneDescription(''); setIsDetectingScene(false);
    setReferenceImages([]); setReferenceImagePreviews([]);
    setGeneratedRender(null); setShowRender(false);
    setError(null); setCurrentGenerationProgress(''); setCurrentStep(1);
  }, []);

  // ── Step content ──────────────────────────────────────────────────────────
  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100 mb-1">Carga tu Escena de SketchUp</h2>
              <p className="text-stone-500 dark:text-stone-400 text-sm">Sube una captura de tu escena. Se optimizará automáticamente.</p>
            </div>
            <input ref={sketchupFileInputRef} type="file" accept="image/*" onChange={handleSketchupFileChange} className="hidden" disabled={isLoading} />
            <button onClick={() => sketchupFileInputRef.current?.click()} disabled={isLoading}
              className="w-full py-3 px-5 rounded-lg bg-stone-200 hover:bg-stone-300 dark:bg-stone-700 dark:hover:bg-stone-600 text-stone-800 dark:text-stone-200 font-semibold text-sm transition disabled:opacity-40 disabled:cursor-not-allowed">
              {uploadedSketchupScene ? 'Cambiar archivo' : 'Seleccionar archivo'}
            </button>
            {isLoading && currentGenerationProgress.startsWith('Optimizando') && (
              <div className="flex items-center gap-2 text-sm text-stone-500 dark:text-stone-400"><LoadingSpinner /><span>{currentGenerationProgress}</span></div>
            )}
            {uploadedSketchupScene ? (
              <div className="flex items-center gap-3 bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg px-4 py-3">
                <div className="w-2 h-2 rounded-full bg-stone-400 shrink-0" />
                <span className="text-sm text-stone-700 dark:text-stone-300 truncate">{uploadedSketchupScene.name}</span>
                <span className="text-xs text-stone-400 ml-auto shrink-0">Listo</span>
              </div>
            ) : (
              <div className="border-2 border-dashed border-stone-300 dark:border-stone-700 rounded-lg p-8 text-center text-stone-400 dark:text-stone-600 text-sm">
                Ningún archivo seleccionado
              </div>
            )}
          </div>
        );

      case 2:
        return (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100 mb-1">Detectar Elementos de la Escena</h2>
              <p className="text-stone-500 dark:text-stone-400 text-sm">La IA analizará materiales, colores, entorno y zonas vacías. Puedes editar el resultado.</p>
            </div>
            <button onClick={handleDetectSceneElements} disabled={isDetectingScene || isLoading}
              className="w-full py-3 px-5 rounded-lg bg-stone-700 hover:bg-stone-600 text-white font-semibold text-sm transition disabled:opacity-40 disabled:cursor-not-allowed">
              {isDetectingScene ? 'Detectando...' : 'Detectar automáticamente'}
            </button>
            {isDetectingScene && <div className="flex items-center gap-2 text-sm text-stone-500 dark:text-stone-400"><LoadingSpinner /><span>{currentGenerationProgress}</span></div>}
            <div>
              <label htmlFor="scene-desc" className="block text-xs font-semibold text-stone-600 dark:text-stone-400 uppercase tracking-wider mb-2">Descripción de la escena</label>
              <textarea id="scene-desc" value={sceneDescription} onChange={(e) => setSceneDescription(e.target.value)} rows={12}
                className="w-full p-3 rounded-lg bg-white dark:bg-stone-950 border border-stone-300 dark:border-stone-700 text-stone-900 dark:text-stone-100 text-sm focus:ring-2 focus:ring-stone-400 focus:border-transparent outline-none transition resize-y"
                placeholder="La descripción aparecerá aquí, o escríbela manualmente..." />
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100 mb-1">Referencias Visuales <span className="text-stone-400 font-normal text-sm">(Opcional)</span></h2>
              <p className="text-stone-500 dark:text-stone-400 text-sm">Sube hasta {MAX_REFERENCE_IMAGES} imágenes de elementos específicos para que la IA los replique.</p>
            </div>
            <input ref={referenceFileInputRef} type="file" accept="image/*" multiple onChange={handleReferenceImagesChange} className="hidden" disabled={referenceImages.length >= MAX_REFERENCE_IMAGES || isLoading} />
            <button onClick={() => referenceFileInputRef.current?.click()} disabled={referenceImages.length >= MAX_REFERENCE_IMAGES || isLoading}
              className="w-full py-3 px-5 rounded-lg bg-stone-200 hover:bg-stone-300 dark:bg-stone-700 dark:hover:bg-stone-600 text-stone-800 dark:text-stone-200 font-semibold text-sm transition disabled:opacity-40 disabled:cursor-not-allowed">
              {referenceImages.length > 0 ? `Añadir más (${referenceImages.length}/${MAX_REFERENCE_IMAGES})` : 'Subir referencias'}
            </button>
            {referenceImagePreviews.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {referenceImagePreviews.map((p, i) => (
                  <div key={i} className="relative group border border-stone-200 dark:border-stone-700 rounded-lg overflow-hidden">
                    <img src={p.url} alt={`Ref ${i}`} className="w-full h-28 object-cover" />
                    <button onClick={() => handleRemoveReferenceImage(p.file)}
                      className="absolute top-1.5 right-1.5 w-6 h-6 bg-white/90 dark:bg-stone-800/90 text-stone-700 dark:text-stone-300 rounded-full text-xs opacity-0 group-hover:opacity-100 transition flex items-center justify-center shadow-sm">
                      ✕
                    </button>
                    <p className="text-xs text-stone-500 dark:text-stone-400 px-2 py-1 truncate bg-stone-50 dark:bg-stone-900/60">{p.file.name}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="border-2 border-dashed border-stone-300 dark:border-stone-700 rounded-lg p-8 text-center text-stone-400 dark:text-stone-600 text-sm">Sin referencias añadidas</div>
            )}
          </div>
        );

      case 4:
        return (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100 mb-1">Configurar Iluminación</h2>
              <p className="text-stone-500 dark:text-stone-400 text-sm">Define el ambiente lumínico. Puedes guardar y cargar configuraciones.</p>
            </div>
            <div className="flex gap-2">
              <input ref={lightingConfigFileInputRef} type="file" accept=".json" onChange={handleLoadLightingConfig} className="hidden" />
              <button onClick={() => lightingConfigFileInputRef.current?.click()} className="flex-1 py-2 px-4 bg-stone-200 hover:bg-stone-300 dark:bg-stone-700 dark:hover:bg-stone-600 text-stone-800 dark:text-stone-200 text-sm font-medium rounded-lg transition">Cargar .json</button>
              <button onClick={handleSaveLightingConfig} className="flex-1 py-2 px-4 bg-stone-200 hover:bg-stone-300 dark:bg-stone-700 dark:hover:bg-stone-600 text-stone-800 dark:text-stone-200 text-sm font-medium rounded-lg transition">Guardar .json</button>
            </div>
            {([
              { id: 'lt', label: 'Tipo de iluminación', value: lightingType, set: (v: string) => setLightingType(v as LightingType), opts: [
                { value: LightingType.Day, label: 'Día — brillante y natural' },
                { value: LightingType.Sunset, label: 'Atardecer — cálida y dorada' },
                { value: LightingType.Night, label: 'Noche — velas y ambiente tenue' },
              ]},
              { id: 'ct', label: 'Temperatura de color', value: colorTemperature, set: (v: string) => setColorTemperature(v as LightingConfig['colorTemperature']), opts: [
                { value: 'neutral', label: 'Neutra' }, { value: 'warm', label: 'Cálida (dorados/ámbar)' },
                { value: 'golden', label: 'Dorada (muy cálida)' }, { value: 'cool', label: 'Fría (azules/cian)' },
              ]},
              { id: 'ec', label: 'Exposición', value: exposureCompensation, set: (v: string) => setExposureCompensation(v as LightingConfig['exposureCompensation']), opts: [
                { value: 'standard', label: 'Estándar' }, { value: 'brighter', label: 'Ligeramente más brillante' },
                { value: 'very_bright', label: 'Muy brillante' }, { value: 'darker', label: 'Ligeramente más oscura' }, { value: 'very_dark', label: 'Muy oscura' },
              ]},
              { id: 'ce', label: 'Contraste', value: contrastEnhancement, set: (v: string) => setContrastEnhancement(v as LightingConfig['contrastEnhancement']), opts: [
                { value: 'natural', label: 'Natural' }, { value: 'enhanced', label: 'Mejorado (más vivo)' },
                { value: 'high_contrast', label: 'Alto contraste' }, { value: 'soft', label: 'Suave (etéreo)' }, { value: 'low_contrast', label: 'Bajo contraste' },
              ]},
            ] as const).map(({ id, label, value, set, opts }) => (
              <div key={id}>
                <label htmlFor={id} className="block text-xs font-semibold text-stone-600 dark:text-stone-400 uppercase tracking-wider mb-1.5">{label}</label>
                <select id={id} value={value} onChange={(e) => set(e.target.value)} disabled={isLoading}
                  className="w-full p-2.5 rounded-lg bg-white dark:bg-stone-950 border border-stone-300 dark:border-stone-700 text-stone-900 dark:text-stone-100 text-sm focus:ring-2 focus:ring-stone-400 outline-none transition disabled:opacity-40">
                  {opts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            ))}
            <div>
              <label htmlFor="adv-light" className="block text-xs font-semibold text-stone-600 dark:text-stone-400 uppercase tracking-wider mb-1.5">
                Instrucciones avanzadas <span className="normal-case font-normal text-stone-400">(opcional)</span>
              </label>
              <textarea id="adv-light" value={advancedLightingInstructions} onChange={(e) => setAdvancedLightingInstructions(e.target.value)}
                rows={3} disabled={isLoading}
                className="w-full p-2.5 rounded-lg bg-white dark:bg-stone-950 border border-stone-300 dark:border-stone-700 text-stone-900 dark:text-stone-100 text-sm focus:ring-2 focus:ring-stone-400 outline-none transition resize-y disabled:opacity-40"
                placeholder="Ej: spotlights blancos sobre cada mesa, tiras LED cálidas..." />
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100 mb-1">Generar Render Fotorrealista</h2>
              <p className="text-stone-500 dark:text-stone-400 text-sm">Todo listo. Genera el render con la configuración actual.</p>
            </div>
            <div>
              <label htmlFor="provider" className="block text-xs font-semibold text-stone-600 dark:text-stone-400 uppercase tracking-wider mb-1.5">Modelo de render</label>
              <select id="provider" value={imageProvider} onChange={(e) => setImageProvider(e.target.value as ImageProvider)} disabled={isLoading}
                className="w-full p-2.5 rounded-lg bg-white dark:bg-stone-950 border border-stone-300 dark:border-stone-700 text-stone-900 dark:text-stone-100 text-sm focus:ring-2 focus:ring-stone-400 outline-none transition disabled:opacity-40">
                {IMAGE_PROVIDER_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <p className="mt-1.5 text-xs text-stone-400">El análisis y el prompt siempre usan Gemini; aquí eliges qué modelo genera la imagen final.</p>
            </div>
            <div className="bg-stone-100 dark:bg-stone-800 rounded-lg p-4 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-stone-500">Escena</span><span className="text-stone-700 dark:text-stone-300 truncate ml-4 max-w-[60%] text-right">{uploadedSketchupScene?.name ?? '—'}</span></div>
              <div className="flex justify-between"><span className="text-stone-500">Iluminación</span><span className="text-stone-700 dark:text-stone-300 capitalize">{lightingType} · {colorTemperature}</span></div>
              <div className="flex justify-between"><span className="text-stone-500">Modelo</span><span className="text-stone-700 dark:text-stone-300 uppercase">{imageProvider}</span></div>
              <div className="flex justify-between"><span className="text-stone-500">Referencias</span><span className="text-stone-700 dark:text-stone-300">{referenceImages.length > 0 ? `${referenceImages.length} imagen${referenceImages.length > 1 ? 'es' : ''}` : 'Ninguna'}</span></div>
            </div>
            <button onClick={handleGenerateRender} disabled={isLoading || !uploadedSketchupScene || !sceneDescription.trim()}
              className="w-full py-4 rounded-lg bg-stone-800 dark:bg-stone-200 text-white dark:text-stone-900 text-base font-bold hover:bg-stone-700 dark:hover:bg-stone-300 transition disabled:opacity-40 disabled:cursor-not-allowed disabled:bg-stone-300 disabled:text-stone-500 dark:disabled:bg-stone-700 dark:disabled:text-stone-500">
              {isLoading ? 'Generando render...' : 'Generar render'}
            </button>
            {isLoading && currentGenerationProgress && (
              <div className="flex items-center gap-2 text-sm text-stone-500 dark:text-stone-400"><LoadingSpinner /><span>{currentGenerationProgress}</span></div>
            )}
            {generatedRender?.error && (
              <p className="text-red-700 dark:text-red-300 text-sm bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg p-3">{generatedRender.error}</p>
            )}
            {generatedRender?.url && (
              <div className="space-y-2 pt-2 border-t border-stone-200 dark:border-stone-700">
                <p className="text-xs text-stone-400">*Las imágenes generadas por IA pueden contener imperfecciones.</p>
                <div className="flex gap-2">
                  <button onClick={handleDownloadImage} className="flex-1 py-2.5 px-4 bg-stone-200 hover:bg-stone-300 dark:bg-stone-700 dark:hover:bg-stone-600 text-stone-800 dark:text-stone-200 text-sm font-semibold rounded-lg transition">Descargar</button>
                  <button onClick={handleSaveLightingConfig} className="flex-1 py-2.5 px-4 bg-stone-200 hover:bg-stone-300 dark:bg-stone-700 dark:hover:bg-stone-600 text-stone-800 dark:text-stone-200 text-sm font-semibold rounded-lg transition">Guardar iluminación</button>
                </div>
                <button onClick={handleStartNewScene} className="w-full py-2.5 bg-stone-100 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200 text-sm font-semibold rounded-lg transition">Nueva escena</button>
              </div>
            )}
          </div>
        );

      default: return null;
    }
  };

  // ── Preview ───────────────────────────────────────────────────────────────
  const hasRender = !!generatedRender?.url;
  const previewSrc = showRender && hasRender ? generatedRender!.url! : sketchupScenePreview;

  return (
    <div className="flex overflow-hidden" style={{ height: 'calc(100vh - 61px)' }}>

      {/* ── Left: step wizard ────────────────────────────── */}
      <div className="flex-1 h-full flex flex-col bg-stone-50 dark:bg-stone-900">

        {/* Step indicators */}
        <div className="shrink-0 flex items-center px-6 py-4 border-b border-stone-200 dark:border-stone-800 gap-0">
          {STEPS.map((step, i) => {
            const active = currentStep === step.id;
            const completed = stepCompleted(step.id);
            const accessible = stepAccessible(step.id);
            return (
              <React.Fragment key={step.id}>
                <button
                  onClick={() => accessible && setCurrentStep(step.id)}
                  disabled={!accessible}
                  className={`flex flex-col items-center gap-1.5 ${accessible ? 'cursor-pointer' : 'cursor-not-allowed opacity-40'}`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border transition-colors ${
                    active
                      ? 'bg-stone-800 dark:bg-stone-200 text-white dark:text-stone-900 border-stone-800 dark:border-stone-200'
                      : completed && accessible
                        ? 'bg-stone-500 text-white border-stone-500'
                        : 'bg-transparent text-stone-300 dark:text-stone-600 border-stone-300 dark:border-stone-600'
                  }`}>
                    {completed && !active ? '✓' : step.id}
                  </div>
                  <span className={`text-xs transition-colors ${active ? 'text-stone-900 dark:text-stone-100 font-medium' : 'text-stone-400'}`}>
                    {step.label}
                  </span>
                </button>
                {i < STEPS.length - 1 && (
                  <div className={`flex-1 h-px mx-2 mb-5 transition-colors ${stepCompleted(step.id) && stepAccessible(step.id + 1) ? 'bg-stone-400' : 'bg-stone-200 dark:bg-stone-700'}`} />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Error banner */}
        {error && (
          <div className="mx-6 mt-4 shrink-0 p-3 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm flex items-start justify-between gap-2">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-700 dark:hover:text-red-200 transition shrink-0">✕</button>
          </div>
        )}

        {/* Step content — scrollable */}
        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5">
          {renderStep()}
        </div>

        {/* Navigation */}
        <div className="shrink-0 px-6 py-4 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between">
          <button
            onClick={() => setCurrentStep(s => Math.max(1, s - 1))}
            disabled={currentStep === 1}
            className="py-2 px-5 text-sm font-medium text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition disabled:opacity-30 disabled:cursor-not-allowed"
          >
            ← Anterior
          </button>
          <span className="text-xs text-stone-400">{currentStep} / {STEPS.length}</span>
          {currentStep < 5 ? (
            <button
              onClick={() => setCurrentStep(s => Math.min(5, s + 1))}
              disabled={!canAdvance()}
              className="py-2 px-5 bg-stone-800 dark:bg-stone-200 hover:bg-stone-700 dark:hover:bg-stone-300 text-white dark:text-stone-900 text-sm font-semibold rounded-lg transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Siguiente →
            </button>
          ) : (
            <div className="w-[88px]" />
          )}
        </div>
      </div>

      {/* ── Right: image preview ─────────────────────────── */}
      <div className="w-[40%] h-full flex flex-col border-l border-stone-200 dark:border-stone-800 bg-stone-100 dark:bg-stone-950">

        {/* Preview area */}
        <div className="flex-1 min-h-0 flex items-center justify-center p-6">
          {previewSrc ? (
            <img
              src={previewSrc}
              alt={showRender ? 'Render generado' : 'Escena SketchUp'}
              className="max-w-full max-h-full object-contain rounded-lg shadow-sm"
            />
          ) : (
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-stone-200 dark:bg-stone-800 flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7 text-stone-400 dark:text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-stone-400 dark:text-stone-600 text-sm">Tu escena aparecerá aquí</p>
            </div>
          )}
        </div>

        {/* Toggle bar — only visible when both images exist */}
        {hasRender && sketchupScenePreview && (
          <div className="shrink-0 px-6 pb-5">
            <div className="flex items-center bg-stone-200 dark:bg-stone-800 rounded-lg p-1 gap-1">
              <button
                onClick={() => setShowRender(false)}
                className={`flex-1 py-2 text-xs font-semibold rounded-md transition ${!showRender ? 'bg-white dark:bg-stone-600 text-stone-900 dark:text-white shadow-sm' : 'text-stone-500 hover:text-stone-700 dark:hover:text-stone-200'}`}
              >
                Original
              </button>
              <button
                onClick={() => setShowRender(true)}
                className={`flex-1 py-2 text-xs font-semibold rounded-md transition ${showRender ? 'bg-white dark:bg-stone-600 text-stone-900 dark:text-white shadow-sm' : 'text-stone-500 hover:text-stone-700 dark:hover:text-stone-200'}`}
              >
                Render
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EventRender;
