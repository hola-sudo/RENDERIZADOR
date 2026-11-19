import React, { useState, useCallback, useRef } from 'react';
import { detectSceneElements, startVideoTransition, pollVideoUntilDone } from '../services/apiService';
import { downloadFromUrl } from '../services/download';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  alertError, btnGhost, btnPrimary, btnSecondary, btnSoft, heading,
  label as labelClass, note, select as selectClass, subheading, summaryBox,
  textarea as textareaClass,
} from '../components/ui';
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
  const [videoRenderId, setVideoRenderId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState<string | null>(null);

  const [isDownloading, setIsDownloading] = useState(false);

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
        setSceneDescription(''); setVideoUrl(null); setVideoRenderId(null); setError(null);
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
    setIsLoading(true); setVideoUrl(null); setVideoRenderId(null); setError(null);
    setProgress('Enviando frames al modelo...');
    try {
      const { operationName } = await startVideoTransition(startFrame, endFrame, cameraMovement, sceneDescription);
      const result = await pollVideoUntilDone(operationName, cameraMovement, sceneDescription, setProgress);
      if (result.error) {
        setError(result.error);
        setProgress('');
      } else {
        setVideoUrl(result.url);
        setVideoRenderId(result.videoRenderId);
        setProgress('Video completado.');
      }
    } catch (err: any) {
      setError(`Error al generar: ${err.message}`);
      setProgress('');
    } finally { setIsLoading(false); }
  }, [startFrame, endFrame, cameraMovement, sceneDescription]);

  // ── Descarga ──────────────────────────────────────────────────────────────
  // Pasa por downloadFromUrl y no por un <a download>: la URL firmada de
  // Supabase es de otro origen y el navegador navegaría a ella, perdiendo el
  // estado del wizard.
  const handleDownload = useCallback(async () => {
    if (!videoUrl) return;
    setIsDownloading(true);
    try {
      await downloadFromUrl(videoUrl, 'video_transition_1080p.mp4');
    } finally { setIsDownloading(false); }
  }, [videoUrl]);

  const handleStartNew = useCallback(() => {
    setStartFrame(null); setStartFramePreview(null);
    setEndFrame(null); setEndFramePreview(null);
    if (startFileInputRef.current) startFileInputRef.current.value = '';
    if (endFileInputRef.current) endFileInputRef.current.value = '';
    setSceneDescription(''); setCameraMovement('dolly_in');
    setVideoUrl(null); setVideoRenderId(null); setError(null); setProgress(''); setCurrentStep(1);
  }, []);

  // ── Step content ──────────────────────────────────────────────────────────
  const renderFrameSlot = (which: 'start' | 'end') => {
    const file = which === 'start' ? startFrame : endFrame;
    const preview = which === 'start' ? startFramePreview : endFramePreview;
    const ref = which === 'start' ? startFileInputRef : endFileInputRef;
    const label = which === 'start' ? 'Start Frame' : 'End Frame';
    return (
      <div className="space-y-2">
        <label className={labelClass}>{label}</label>
        <input ref={ref} type="file" accept="image/*" onChange={handleFrameChange(which)} className="hidden" disabled={isLoading} />
        {preview ? (
          <div className="group relative overflow-hidden rounded-3xl bg-white">
            <img src={preview} alt={label} className="h-40 w-full object-cover" />
            <button onClick={() => ref.current?.click()} disabled={isLoading}
              className="absolute inset-0 flex items-center justify-center bg-ink/0 text-[12px] font-semibold uppercase tracking-[0.12em] text-bone opacity-0 transition group-hover:bg-ink/50 group-hover:opacity-100">
              Cambiar
            </button>
          </div>
        ) : (
          <button onClick={() => ref.current?.click()} disabled={isLoading}
            className="flex h-40 w-full items-center justify-center rounded-3xl border border-dashed border-line bg-white/50 text-[14px] text-ink-mute transition hover:border-ink disabled:opacity-40">
            Seleccionar archivo
          </button>
        )}
        {file && <p className={`truncate ${note}`}>{file.name}</p>}
      </div>
    );
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-5">
            <div>
              <h2 className={heading}>Sube el Start Frame y el End Frame</h2>
              <p className={`mt-2 ${subheading}`}>Sube dos imágenes de render donde se aprecien los mismos objetos de tu escena. Nuestro modelo analizará la geometría y generará un recorrido virtual fluido que conecte ambas tomas.</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {renderFrameSlot('start')}
              {renderFrameSlot('end')}
            </div>
            {isLoading && progress.startsWith('Optimizando') && (
              <div className="flex items-center gap-2 text-[14px] text-ink-soft"><LoadingSpinner /><span>{progress}</span></div>
            )}
          </div>
        );

      case 2:
        return (
          <div className="space-y-5">
            <div>
              <h2 className={heading}>Descripción de materiales</h2>
              <p className={`mt-2 ${subheading}`}>PHORMARENDER analiza los frames y describe los materiales y composición de la escena. Corrígelo ahora.</p>
            </div>
            <button onClick={handleDetect} disabled={isDetecting || isLoading}
              className={`${btnPrimary} w-full`}>
              {isDetecting ? 'Detectando...' : 'Detectar automáticamente'}
            </button>
            {isDetecting && <div className="flex items-center gap-2 text-[14px] text-ink-soft"><LoadingSpinner /><span>{progress}</span></div>}
            <div>
              <label htmlFor="scene-desc" className={labelClass}>Descripción de la escena</label>
              <textarea id="scene-desc" value={sceneDescription} onChange={(e) => setSceneDescription(e.target.value)} rows={12}
                className={`mt-2 ${textareaClass}`}
                placeholder="La descripción aparecerá aquí, o escríbela manualmente..." />
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-5">
            <div>
              <h2 className={heading}>Movimiento de Cámara</h2>
              <p className={`mt-2 ${subheading}`}>Elige cómo se mueve la cámara del Start Frame al End Frame.</p>
            </div>
            <div>
              <label htmlFor="camera-movement" className={labelClass}>Movimiento</label>
              <select id="camera-movement" value={cameraMovement} onChange={(e) => setCameraMovement(e.target.value as CameraMovement)} disabled={isLoading}
                className={`mt-2 ${selectClass}`}>
                {CAMERA_MOVEMENT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-5">
            <div>
              <h2 className={heading}>Generar Recorrido Virtual</h2>
              <p className={`mt-2 ${subheading}`}>Genera tu escena de 8 segundos en 1080p.</p>
            </div>
            <dl className={`${summaryBox} space-y-3 text-[14px]`}>
              <div className="flex justify-between gap-4"><dt className="text-ink-mute">Start Frame</dt><dd className="max-w-[60%] truncate text-right text-ink">{startFrame?.name ?? '—'}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-ink-mute">End Frame</dt><dd className="max-w-[60%] truncate text-right text-ink">{endFrame?.name ?? '—'}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-ink-mute">Movimiento</dt><dd className="text-right text-ink">{CAMERA_MOVEMENT_OPTIONS.find(o => o.value === cameraMovement)?.label}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-ink-mute">Resolución</dt><dd className="text-ink">1080p (1920×1080)</dd></div>
            </dl>
            <button onClick={handleGenerate} disabled={isLoading || !startFrame || !endFrame}
              className={`${btnPrimary} w-full py-4`}>
              {isLoading ? 'Generando recorrido...' : 'Generar recorrido'}
            </button>
            {isLoading && progress && (
              <div className="flex items-center gap-2 text-[14px] text-ink-soft"><LoadingSpinner /><span>{progress}</span></div>
            )}
            {!isLoading && error && (
              <p className={alertError}>{error}</p>
            )}
            {videoUrl && (
              <div className="space-y-3 border-t border-line pt-5">
                <p className={note}>*Los videos generados por IA pueden contener imperfecciones.</p>
                <button onClick={handleDownload} disabled={isDownloading}
                  className={`${btnSoft} w-full px-4 py-3`}>
                  {isDownloading ? 'Descargando...' : 'Descargar video 1080p'}
                </button>

                <button onClick={handleStartNew} className={`${btnSecondary} w-full py-3`}>Nuevo recorrido</button>
              </div>
            )}
          </div>
        );

      default: return null;
    }
  };

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

        {/* Error banner (steps 1-3; el paso 4 muestra su propio error inline) */}
        {error && currentStep !== 4 && (
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
          {currentStep < 4 ? (
            <button
              onClick={() => setCurrentStep(s => Math.min(4, s + 1))}
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

      {/* ── Right: preview ───────────────────────────────── */}
      <div className="flex h-full w-[40%] flex-col border-l border-line bg-sand">
        <div className="flex-1 min-h-0 flex items-center justify-center p-6">
          {videoUrl ? (
            <div className="w-full space-y-2">
              <video src={videoUrl} controls autoPlay loop className="mx-auto max-h-full max-w-full rounded-3xl" />
              <p className={`text-center ${note}`}>1080p</p>
            </div>
          ) : startFramePreview || endFramePreview ? (
            <div className="grid grid-cols-1 gap-3 w-full">
              {startFramePreview && <img src={startFramePreview} alt="Start Frame" className="max-h-full max-w-full rounded-3xl object-contain" />}
              {endFramePreview && <img src={endFramePreview} alt="End Frame" className="max-h-full max-w-full rounded-3xl object-contain" />}
            </div>
          ) : (
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-sand-deep">
                <svg className="h-7 w-7 text-ink-mute" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-[14px] text-ink-mute">Tus frames aparecerán aquí</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VideoTransition;
