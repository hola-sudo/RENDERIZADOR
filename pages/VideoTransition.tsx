import React, { useState, useCallback, useRef } from 'react';
import { detectSceneElements, startVideoTransition, pollVideoUntilDone } from '../services/apiService';
import LoadingSpinner from '../components/LoadingSpinner';
import { CAMERA_MOVEMENT_OPTIONS, type CameraMovement } from '../types';

const STEPS = [
  { id: 1, label: 'Frames' },
  { id: 2, label: 'Materiales' },
  { id: 3, label: 'Cámara' },
  { id: 4, label: 'Generar' },
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

const VideoTransition: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(1);

  const [startFrame, setStartFrame] = useState<File | null>(null);
  const [startFramePreview, setStartFramePreview] = useState<string | null>(null);
  const [endFrame, setEndFrame] = useState<File | null>(null);
  const [endFramePreview, setEndFramePreview] = useState<string | null>(null);

  const [sceneDescription, setSceneDescription] = useState('');
  const [isDetecting, setIsDetecting] = useState(false);

  const [cameraMovement, setCameraMovement] = useState<CameraMovement>('dolly_in');

  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState<string | null>(null);

  const startFileInputRef = useRef<HTMLInputElement>(null);
  const endFileInputRef = useRef<HTMLInputElement>(null);

  // ── Step helpers ─────────────────────────────────────────────────────────
  const stepCompleted = (id: number) => {
    if (id === 1) return !!startFrame && !!endFrame;
    if (id === 2) return !!sceneDescription.trim();
    if (id === 3) return true;
    if (id === 4) return !!videoUrl;
    return false;
  };
  const stepAccessible = (id: number) => {
    if (id === 1) return true;
    if (id === 2 || id === 3) return !!startFrame && !!endFrame;
    if (id === 4) return !!startFrame && !!endFrame;
    return false;
  };
  const canAdvance = () => {
    if (currentStep === 1) return !!startFrame && !!endFrame;
    return currentStep < 4;
  };

  // ── Upload ────────────────────────────────────────────────────────────────
  const handleFrameChange = useCallback(
    (which: 'start' | 'end') => async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files?.length) return;
      setIsLoading(true); setProgress('Optimizando imagen...');
      try {
        const resized = await resizeImageFile(e.target.files[0] as File, 1920, 1920, 0.8);
        const url = URL.createObjectURL(resized);
        if (which === 'start') { setStartFrame(resized); setStartFramePreview(url); }
        else { setEndFrame(resized); setEndFramePreview(url); }
        setSceneDescription(''); setVideoUrl(null); setError(null);
      } catch (err: any) {
        setError(`Error al optimizar: ${err.message}`);
      } finally { setIsLoading(false); setProgress(''); }
    },
    [],
  );

  // ── Detect ────────────────────────────────────────────────────────────────
  const handleDetect = useCallback(async () => {
    if (!startFrame || !endFrame) return;
    setIsDetecting(true); setError(null); setSceneDescription('');
    setProgress('Identificando materiales...');
    try {
      const detected = await detectSceneElements([startFrame, endFrame], setProgress);
      setSceneDescription(detected); setProgress('');
    } catch (err: any) {
      setError(`Error al detectar: ${err.message}`);
      setProgress('');
    } finally { setIsDetecting(false); }
  }, [startFrame, endFrame]);

  // ── Generate ──────────────────────────────────────────────────────────────
  const handleGenerate = useCallback(async () => {
    if (!startFrame || !endFrame) return;
    setIsLoading(true); setVideoUrl(null); setError(null);
    setProgress('Enviando frames a Veo...');
    try {
      const { operationName } = await startVideoTransition(startFrame, endFrame, cameraMovement, sceneDescription);
      const result = await pollVideoUntilDone(operationName, cameraMovement, sceneDescription, setProgress);
      if (result.error) {
        setError(result.error);
        setProgress('');
      } else {
        setVideoUrl(result.url);
        setProgress('Video completado.');
      }
    } catch (err: any) {
      setError(`Error al generar: ${err.message}`);
      setProgress('');
    } finally { setIsLoading(false); }
  }, [startFrame, endFrame, cameraMovement, sceneDescription]);

  const handleStartNew = useCallback(() => {
    setStartFrame(null); setStartFramePreview(null);
    setEndFrame(null); setEndFramePreview(null);
    if (startFileInputRef.current) startFileInputRef.current.value = '';
    if (endFileInputRef.current) endFileInputRef.current.value = '';
    setSceneDescription(''); setCameraMovement('dolly_in');
    setVideoUrl(null); setError(null); setProgress(''); setCurrentStep(1);
  }, []);

  // ── Step content ──────────────────────────────────────────────────────────
  const renderFrameSlot = (which: 'start' | 'end') => {
    const file = which === 'start' ? startFrame : endFrame;
    const preview = which === 'start' ? startFramePreview : endFramePreview;
    const ref = which === 'start' ? startFileInputRef : endFileInputRef;
    const label = which === 'start' ? 'Start Frame' : 'End Frame';
    return (
      <div className="space-y-2">
        <label className="block text-xs font-semibold text-stone-600 dark:text-stone-400 uppercase tracking-wider">{label}</label>
        <input ref={ref} type="file" accept="image/*" onChange={handleFrameChange(which)} className="hidden" disabled={isLoading} />
        {preview ? (
          <div className="relative group border border-stone-200 dark:border-stone-700 rounded-lg overflow-hidden">
            <img src={preview} alt={label} className="w-full h-40 object-cover" />
            <button onClick={() => ref.current?.click()} disabled={isLoading}
              className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition flex items-center justify-center opacity-0 group-hover:opacity-100 text-white text-sm font-semibold">
              Cambiar
            </button>
          </div>
        ) : (
          <button onClick={() => ref.current?.click()} disabled={isLoading}
            className="w-full h-40 border-2 border-dashed border-stone-300 dark:border-stone-700 rounded-lg flex items-center justify-center text-stone-400 dark:text-stone-600 text-sm hover:border-stone-400 dark:hover:border-stone-600 transition disabled:opacity-40">
            Seleccionar archivo
          </button>
        )}
        {file && <p className="text-xs text-stone-400 truncate">{file.name}</p>}
      </div>
    );
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100 mb-1">Sube el Start Frame y el End Frame</h2>
              <p className="text-stone-500 dark:text-stone-400 text-sm">Dos renders fotorrealistas de la misma escena. Veo generará el video que los conecta.</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {renderFrameSlot('start')}
              {renderFrameSlot('end')}
            </div>
            {isLoading && progress.startsWith('Optimizando') && (
              <div className="flex items-center gap-2 text-sm text-stone-500 dark:text-stone-400"><LoadingSpinner /><span>{progress}</span></div>
            )}
          </div>
        );

      case 2:
        return (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100 mb-1">Confirmar Materiales</h2>
              <p className="text-stone-500 dark:text-stone-400 text-sm">La IA analiza ambos frames y describe materiales/geometría. Esto se usa como candado anti-alucinación para el video. Corrígelo si hace falta.</p>
            </div>
            <button onClick={handleDetect} disabled={isDetecting || isLoading}
              className="w-full py-3 px-5 rounded-lg bg-stone-700 hover:bg-stone-600 text-white font-semibold text-sm transition disabled:opacity-40 disabled:cursor-not-allowed">
              {isDetecting ? 'Detectando...' : 'Detectar automáticamente'}
            </button>
            {isDetecting && <div className="flex items-center gap-2 text-sm text-stone-500 dark:text-stone-400"><LoadingSpinner /><span>{progress}</span></div>}
            <div>
              <label htmlFor="scene-desc" className="block text-xs font-semibold text-stone-600 dark:text-stone-400 uppercase tracking-wider mb-2">Descripción validada</label>
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
              <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100 mb-1">Movimiento de Cámara</h2>
              <p className="text-stone-500 dark:text-stone-400 text-sm">Elige cómo se mueve la cámara del Start Frame al End Frame.</p>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {CAMERA_MOVEMENT_OPTIONS.map((opt) => (
                <button key={opt.value} onClick={() => setCameraMovement(opt.value)}
                  className={`text-left py-3 px-4 rounded-lg border text-sm transition ${
                    cameraMovement === opt.value
                      ? 'bg-stone-800 dark:bg-stone-200 text-white dark:text-stone-900 border-stone-800 dark:border-stone-200 font-semibold'
                      : 'bg-white dark:bg-stone-950 border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:border-stone-400 dark:hover:border-stone-600'
                  }`}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100 mb-1">Generar Video de Transición</h2>
              <p className="text-stone-500 dark:text-stone-400 text-sm">Veo 3.1 genera 8s de video 1080p. Puede tardar hasta 6 minutos.</p>
            </div>
            <div className="bg-stone-100 dark:bg-stone-800 rounded-lg p-4 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-stone-500">Start Frame</span><span className="text-stone-700 dark:text-stone-300 truncate ml-4 max-w-[60%] text-right">{startFrame?.name ?? '—'}</span></div>
              <div className="flex justify-between"><span className="text-stone-500">End Frame</span><span className="text-stone-700 dark:text-stone-300 truncate ml-4 max-w-[60%] text-right">{endFrame?.name ?? '—'}</span></div>
              <div className="flex justify-between"><span className="text-stone-500">Movimiento</span><span className="text-stone-700 dark:text-stone-300">{CAMERA_MOVEMENT_OPTIONS.find(o => o.value === cameraMovement)?.label}</span></div>
            </div>
            <p className="text-xs text-stone-400">Costo aproximado por intento: $1.20–$3.20 USD (Veo cobra por segundo generado).</p>
            <button onClick={handleGenerate} disabled={isLoading || !startFrame || !endFrame}
              className="w-full py-4 rounded-lg bg-stone-800 dark:bg-stone-200 text-white dark:text-stone-900 text-base font-bold hover:bg-stone-700 dark:hover:bg-stone-300 transition disabled:opacity-40 disabled:cursor-not-allowed disabled:bg-stone-300 disabled:text-stone-500 dark:disabled:bg-stone-700 dark:disabled:text-stone-500">
              {isLoading ? 'Generando video...' : 'Generar video'}
            </button>
            {isLoading && progress && (
              <div className="flex items-center gap-2 text-sm text-stone-500 dark:text-stone-400"><LoadingSpinner /><span>{progress}</span></div>
            )}
            {!isLoading && error && (
              <p className="text-red-700 dark:text-red-300 text-sm bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg p-3">{error}</p>
            )}
            {videoUrl && (
              <div className="space-y-2 pt-2 border-t border-stone-200 dark:border-stone-700">
                <p className="text-xs text-stone-400">*Los videos generados por IA pueden contener imperfecciones.</p>
                <a href={videoUrl} download="video_transition.mp4"
                  className="block text-center py-2.5 px-4 bg-stone-200 hover:bg-stone-300 dark:bg-stone-700 dark:hover:bg-stone-600 text-stone-800 dark:text-stone-200 text-sm font-semibold rounded-lg transition">
                  Descargar
                </a>
                <button onClick={handleStartNew} className="w-full py-2.5 bg-stone-100 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200 text-sm font-semibold rounded-lg transition">Nueva transición</button>
              </div>
            )}
          </div>
        );

      default: return null;
    }
  };

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

        {/* Error banner (steps 1-3; el paso 4 muestra su propio error inline) */}
        {error && currentStep !== 4 && (
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
          {currentStep < 4 ? (
            <button
              onClick={() => setCurrentStep(s => Math.min(4, s + 1))}
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

      {/* ── Right: preview ───────────────────────────────── */}
      <div className="w-[40%] h-full flex flex-col border-l border-stone-200 dark:border-stone-800 bg-stone-100 dark:bg-stone-950">
        <div className="flex-1 min-h-0 flex items-center justify-center p-6">
          {videoUrl ? (
            <video src={videoUrl} controls autoPlay loop className="max-w-full max-h-full rounded-lg shadow-sm" />
          ) : startFramePreview || endFramePreview ? (
            <div className="grid grid-cols-1 gap-3 w-full">
              {startFramePreview && <img src={startFramePreview} alt="Start Frame" className="max-w-full max-h-full object-contain rounded-lg shadow-sm" />}
              {endFramePreview && <img src={endFramePreview} alt="End Frame" className="max-w-full max-h-full object-contain rounded-lg shadow-sm" />}
            </div>
          ) : (
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-stone-200 dark:bg-stone-800 flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7 text-stone-400 dark:text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-stone-400 dark:text-stone-600 text-sm">Tus frames aparecerán aquí</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VideoTransition;
