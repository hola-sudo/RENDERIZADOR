import React, { useState, useCallback, useRef } from 'react';
import { detectSceneElements, generateSingleRender } from '../services/apiService';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  alertError, btnGhost, btnPrimary, btnSecondary, btnSoft, emptyBox, heading,
  label as labelClass, note, select as selectClass, subheading, summaryBox,
  textarea as textareaClass, toggleGroup, toggleOption,
} from '../components/ui';
import { LightingType, LightingConfig, RenderModel, RenderSize, RENDER_SIZE_OPTIONS } from '../types';

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
  const [renderModel, setRenderModel] = useState<RenderModel>('standard');
  const [renderSize, setRenderSize] = useState<RenderSize>('2K');

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
        renderModel, renderSize, setCurrentGenerationProgress
      );
      setGeneratedRender(result);
      if (result.url) setShowRender(true);
      setCurrentGenerationProgress(result.error ? `Error: ${result.error}` : 'Render completado.');
    } catch (err: any) {
      setError(`Error al generar: ${err.message}`);
      setCurrentGenerationProgress('');
    } finally { setIsLoading(false); }
  }, [uploadedSketchupScene, sceneDescription, referenceImages, lightingType, advancedLightingInstructions, colorTemperature, exposureCompensation, contrastEnhancement, renderModel, renderSize]);

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
              <h2 className={heading}>Carga tu escena de tu modelo 3D</h2>
              <p className={`mt-2 ${subheading}`}>Sube una captura de tu escena. Nosotros optimizamos el tamaño automáticamente.</p>
            </div>
            <input ref={sketchupFileInputRef} type="file" accept="image/*" onChange={handleSketchupFileChange} className="hidden" disabled={isLoading} />
            <button onClick={() => sketchupFileInputRef.current?.click()} disabled={isLoading}
              className={`${btnSecondary} w-full`}>
              {uploadedSketchupScene ? 'Cambiar archivo' : 'Seleccionar archivo'}
            </button>
            {isLoading && currentGenerationProgress.startsWith('Optimizando') && (
              <div className="flex items-center gap-2 text-[14px] text-ink-soft"><LoadingSpinner /><span>{currentGenerationProgress}</span></div>
            )}
            {uploadedSketchupScene ? (
              <div className="flex items-center gap-3 rounded-3xl bg-white px-5 py-4">
                <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-ink" />
                <span className="truncate text-[14px] text-ink">{uploadedSketchupScene.name}</span>
                <span className="ml-auto shrink-0 text-[12px] uppercase tracking-[0.1em] text-ink-mute">Listo</span>
              </div>
            ) : (
              <div className={emptyBox}>Ningún archivo seleccionado</div>
            )}
          </div>
        );

      case 2:
        return (
          <div className="space-y-5">
            <div>
              <h2 className={heading}>Detector de elementos de la escena</h2>
              <p className={`mt-2 ${subheading}`}>PHORMARENDER analiza materiales, colores y elementos que describen a la perfección tu escena. Puedes editar el resultado si algo no es fiel.</p>
            </div>
            <button onClick={handleDetectSceneElements} disabled={isDetectingScene || isLoading}
              className={`${btnPrimary} w-full`}>
              {isDetectingScene ? 'Detectando...' : 'Detectar automáticamente'}
            </button>
            {isDetectingScene && <div className="flex items-center gap-2 text-[14px] text-ink-soft"><LoadingSpinner /><span>{currentGenerationProgress}</span></div>}
            <div>
              <label htmlFor="scene-desc" className={labelClass}>Descripción de la escena</label>
              <textarea id="scene-desc" value={sceneDescription} onChange={(e) => setSceneDescription(e.target.value)} rows={12}
                className={`mt-2 ${textareaClass}`}
                placeholder="Edita tu descripción ahora" />
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-5">
            <div>
              <h2 className={heading}>Referencias Visuales <span className="text-ink-mute">(Opcional)</span></h2>
              <p className={`mt-2 ${subheading}`}>Sube hasta {MAX_REFERENCE_IMAGES} imágenes de elementos específicos en tu escena aislados de su fondo para que podamos detectarlos e integrarlos a tu render.</p>
            </div>
            <input ref={referenceFileInputRef} type="file" accept="image/*" multiple onChange={handleReferenceImagesChange} className="hidden" disabled={referenceImages.length >= MAX_REFERENCE_IMAGES || isLoading} />
            <button onClick={() => referenceFileInputRef.current?.click()} disabled={referenceImages.length >= MAX_REFERENCE_IMAGES || isLoading}
              className={`${btnSecondary} w-full`}>
              {referenceImages.length > 0 ? `Añadir más (${referenceImages.length}/${MAX_REFERENCE_IMAGES})` : 'Subir referencias'}
            </button>
            {referenceImagePreviews.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {referenceImagePreviews.map((p, i) => (
                  <div key={i} className="group relative overflow-hidden rounded-3xl bg-white">
                    <img src={p.url} alt={`Ref ${i}`} className="h-28 w-full object-cover" />
                    <button onClick={() => handleRemoveReferenceImage(p.file)}
                      aria-label="Quitar referencia"
                      className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-ink/85 text-[11px] text-bone opacity-0 transition group-hover:opacity-100">
                      ✕
                    </button>
                    <p className="truncate px-3 py-2 text-[12px] text-ink-mute">{p.file.name}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className={emptyBox}>Sin referencias añadidas</div>
            )}
          </div>
        );

      case 4:
        return (
          <div className="space-y-5">
            <div>
              <h2 className={heading}>Configurar Iluminación</h2>
              <p className={`mt-2 ${subheading}`}>Define el horario específico que quieres aplicar a tu escena. Puedes guardar o cargar tus configuraciones de iluminación para usarlas en otros proyectos.</p>
            </div>
            <div className="flex gap-2">
              <input ref={lightingConfigFileInputRef} type="file" accept=".json" onChange={handleLoadLightingConfig} className="hidden" />
              <button onClick={() => lightingConfigFileInputRef.current?.click()} className={`${btnSoft} flex-1 px-4 py-2.5`}>Cargar .json</button>
              <button onClick={handleSaveLightingConfig} className={`${btnSoft} flex-1 px-4 py-2.5`}>Guardar .json</button>
            </div>
            {([
              { id: 'lt', label: 'Tipo de iluminación', value: lightingType, set: (v: string) => setLightingType(v as LightingType), opts: [
                { value: LightingType.Day, label: 'Día — brillante y natural' },
                { value: LightingType.Sunset, label: 'Tarde — atardecer / golden hour' },
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
                <label htmlFor={id} className={labelClass}>{label}</label>
                <select id={id} value={value} onChange={(e) => set(e.target.value)} disabled={isLoading}
                  className={`mt-2 ${selectClass}`}>
                  {opts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            ))}
            <div>
              <label htmlFor="adv-light" className={labelClass}>
                Instrucciones avanzadas <span className="font-normal normal-case tracking-normal">(opcional)</span>
              </label>
              <textarea id="adv-light" value={advancedLightingInstructions} onChange={(e) => setAdvancedLightingInstructions(e.target.value)}
                rows={3} disabled={isLoading}
                className={`mt-2 ${textareaClass}`}
                placeholder="Ej. Enciende la lámpara de piso y añade luces dicroicas en el techo." />
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-5">
            <div>
              <h2 className={heading}>Generar render</h2>
              <p className={`mt-2 ${subheading}`}>Todo listo. Genera tu render ahora.</p>
            </div>
            <div>
              <label htmlFor="render-size" className={labelClass}>Resolución</label>
              <select id="render-size" value={renderSize} onChange={(e) => setRenderSize(e.target.value as RenderSize)} disabled={isLoading}
                className={`mt-2 ${selectClass}`}>
                {RENDER_SIZE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              {renderSize === '4K' && (
                <p className={`mt-2 ${note}`}>4K duplica aproximadamente el costo por imagen y puede tardar más en generarse.</p>
              )}
            </div>
            <dl className={`${summaryBox} space-y-3 text-[14px]`}>
              <div className="flex justify-between gap-4"><dt className="text-ink-mute">Escena</dt><dd className="max-w-[60%] truncate text-right text-ink">{uploadedSketchupScene?.name ?? '—'}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-ink-mute">Iluminación</dt><dd className="capitalize text-ink">{lightingType} · {colorTemperature}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-ink-mute">Resolución</dt><dd className="text-ink">{renderSize}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-ink-mute">Referencias</dt><dd className="text-ink">{referenceImages.length > 0 ? `${referenceImages.length} imagen${referenceImages.length > 1 ? 'es' : ''}` : 'Ninguna'}</dd></div>
            </dl>
            <button onClick={handleGenerateRender} disabled={isLoading || !uploadedSketchupScene || !sceneDescription.trim()}
              className={`${btnPrimary} w-full py-4`}>
              {isLoading ? 'Generando render...' : 'Generar render'}
            </button>
            {isLoading && currentGenerationProgress && (
              <div className="flex items-center gap-2 text-[14px] text-ink-soft"><LoadingSpinner /><span>{currentGenerationProgress}</span></div>
            )}
            {generatedRender?.error && (
              <p className={alertError}>{generatedRender.error}</p>
            )}
            {generatedRender?.url && (
              <div className="space-y-3 border-t border-line pt-5">
                <p className={note}>*Las imágenes generadas por IA pueden contener imperfecciones.</p>
                <div className="flex gap-2">
                  <button onClick={handleDownloadImage} className={`${btnSoft} flex-1 px-4 py-3`}>Descargar</button>
                  <button onClick={handleSaveLightingConfig} className={`${btnSoft} flex-1 px-4 py-3`}>Guardar iluminación</button>
                </div>
                <button onClick={handleStartNewScene} className={`${btnSecondary} w-full py-3`}>Nueva escena</button>
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
    <div className="flex min-h-0 flex-1 overflow-hidden">

      {/* ── Izquierda: asistente por pasos ────────────────── */}
      <div className="flex h-full flex-1 flex-col bg-bone">

        {/* Indicador de pasos */}
        <div className="flex shrink-0 items-center gap-0 border-b border-line px-6 py-5 sm:px-8">
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
                  <div className={`flex h-9 w-9 items-center justify-center rounded-full border text-[12px] font-bold transition-colors ${
                    active
                      ? 'border-ink bg-ink text-bone'
                      : completed && accessible
                        ? 'border-ink-soft bg-ink-soft text-bone'
                        : 'border-line bg-transparent text-ink-mute'
                  }`}>
                    {completed && !active ? '✓' : step.id}
                  </div>
                  <span className={`text-[11px] font-medium uppercase tracking-[0.1em] transition-colors ${active ? 'text-ink' : 'text-ink-mute'}`}>
                    {step.label}
                  </span>
                </button>
                {i < STEPS.length - 1 && (
                  <div className={`mx-2 mb-5 h-px flex-1 transition-colors ${stepCompleted(step.id) && stepAccessible(step.id + 1) ? 'bg-ink-mute' : 'bg-line'}`} />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Error banner */}
        {error && (
          <div className={`mx-6 mt-5 flex shrink-0 items-start justify-between gap-2 sm:mx-8 ${alertError}`}>
            <span>{error}</span>
            <button onClick={() => setError(null)} aria-label="Cerrar aviso" className="shrink-0 text-red-400 transition hover:text-red-800">✕</button>
          </div>
        )}

        {/* Step content — scrollable */}
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-7 sm:px-8">
          <div className="mx-auto max-w-xl space-y-5">{renderStep()}</div>
        </div>

        {/* Navigation */}
        <div className="flex shrink-0 items-center justify-between border-t border-line px-6 py-4 sm:px-8">
          <button
            onClick={() => setCurrentStep(s => Math.max(1, s - 1))}
            disabled={currentStep === 1}
            className={btnGhost}
          >
            ← Anterior
          </button>
          <span className="text-[12px] uppercase tracking-[0.1em] text-ink-mute">{currentStep} / {STEPS.length}</span>
          {currentStep < 5 ? (
            <button
              onClick={() => setCurrentStep(s => Math.min(5, s + 1))}
              disabled={!canAdvance()}
              className={`${btnPrimary} px-6 py-3`}
            >
              Siguiente →
            </button>
          ) : (
            <div className="w-[88px]" />
          )}
        </div>
      </div>

      {/* ── Right: image preview ─────────────────────────── */}
      <div className="flex h-full w-[40%] flex-col border-l border-line bg-sand">

        {/* Preview area */}
        <div className="flex-1 min-h-0 flex items-center justify-center p-6">
          {previewSrc ? (
            <img
              src={previewSrc}
              alt={showRender ? 'Render generado' : 'Escena de tu modelo 3D'}
              className="max-h-full max-w-full rounded-3xl object-contain"
            />
          ) : (
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-sand-deep">
                <svg className="h-7 w-7 text-ink-mute" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-[14px] text-ink-mute">Tu escena aparecerá aquí</p>
            </div>
          )}
        </div>

        {/* Toggle bar — only visible when both images exist */}
        {hasRender && sketchupScenePreview && (
          <div className="shrink-0 px-6 pb-5">
            <div className={toggleGroup}>
              <button onClick={() => setShowRender(false)} className={toggleOption(!showRender)}>
                Original
              </button>
              <button onClick={() => setShowRender(true)} className={toggleOption(showRender)}>
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
