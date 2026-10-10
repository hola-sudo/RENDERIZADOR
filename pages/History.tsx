import React, { useEffect, useState } from 'react';
import { listRenders, listVideoRenders, upscaleVideoToEnd, type RenderItem } from '../services/apiService';
import type { VideoRenderItem } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString('es', { dateStyle: 'medium', timeStyle: 'short' });

type Tab = 'images' | 'videos';

const History: React.FC = () => {
  const [tab, setTab] = useState<Tab>('images');

  const [images, setImages] = useState<RenderItem[]>([]);
  const [imagesLoading, setImagesLoading] = useState(true);
  const [imagesError, setImagesError] = useState<string | null>(null);

  const [videos, setVideos] = useState<VideoRenderItem[]>([]);
  const [videosLoading, setVideosLoading] = useState(true);
  const [videosError, setVideosError] = useState<string | null>(null);

  // Upscaling (proceso aparte): progreso/error por video, indexado por id.
  const [upscaling, setUpscaling] = useState<Record<string, string>>({});
  const [upscaleErrors, setUpscaleErrors] = useState<Record<string, string>>({});

  const handleUpscale = async (id: string) => {
    setUpscaleErrors((prev) => {
      const { [id]: _removed, ...rest } = prev;
      return rest;
    });
    setUpscaling((prev) => ({ ...prev, [id]: 'Enviando el video al upscaler...' }));
    const result = await upscaleVideoToEnd(id, (message) => setUpscaling((prev) => ({ ...prev, [id]: message })));
    setUpscaling((prev) => {
      const { [id]: _removed, ...rest } = prev;
      return rest;
    });
    if (result.error) {
      setUpscaleErrors((prev) => ({ ...prev, [id]: result.error! }));
      return;
    }
    // Refleja la nueva versión 4K sin recargar todo el historial.
    setVideos((prev) =>
      prev.map((video) =>
        video.id === id
          ? { ...video, upscaled_url: result.url, upscale_status: 'done', upscale_resolution: '4k', upscale_error: null }
          : video,
      ),
    );
  };

  useEffect(() => {
    let active = true;
    listRenders()
      .then((data) => { if (active) setImages(data); })
      .catch((err) => { if (active) setImagesError(err.message ?? 'No se pudo cargar el historial.'); })
      .finally(() => { if (active) setImagesLoading(false); });
    listVideoRenders()
      .then((data) => { if (active) setVideos(data); })
      .catch((err) => { if (active) setVideosError(err.message ?? 'No se pudo cargar el historial.'); })
      .finally(() => { if (active) setVideosLoading(false); });
    return () => { active = false; };
  }, []);

  const loading = tab === 'images' ? imagesLoading : videosLoading;
  const error = tab === 'images' ? imagesError : videosError;

  return (
    <div className="max-w-6xl mx-auto w-full px-6 py-8">
      <h1 className="text-xl font-bold text-stone-900 dark:text-stone-100 mb-1">Historial</h1>
      <p className="text-sm text-stone-500 dark:text-stone-400 mb-6">Tus renders y videos generados, más recientes primero.</p>

      <div className="flex items-center bg-stone-200 dark:bg-stone-800 rounded-lg p-1 gap-1 mb-6 max-w-xs">
        <button
          onClick={() => setTab('images')}
          className={`flex-1 py-2 text-xs font-semibold rounded-md transition ${tab === 'images' ? 'bg-white dark:bg-stone-600 text-stone-900 dark:text-white shadow-sm' : 'text-stone-500 hover:text-stone-700 dark:hover:text-stone-200'}`}
        >
          Imágenes ({images.length})
        </button>
        <button
          onClick={() => setTab('videos')}
          className={`flex-1 py-2 text-xs font-semibold rounded-md transition ${tab === 'videos' ? 'bg-white dark:bg-stone-600 text-stone-900 dark:text-white shadow-sm' : 'text-stone-500 hover:text-stone-700 dark:hover:text-stone-200'}`}
        >
          Videos ({videos.length})
        </button>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-stone-500 dark:text-stone-400"><LoadingSpinner /><span>Cargando...</span></div>
      )}

      {error && (
        <p className="text-red-700 dark:text-red-300 text-sm bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg p-3">{error}</p>
      )}

      {tab === 'images' && !loading && !error && images.length === 0 && (
        <div className="border-2 border-dashed border-stone-300 dark:border-stone-700 rounded-lg p-12 text-center text-stone-400 dark:text-stone-600 text-sm">
          Aún no has generado ningún render.
        </div>
      )}

      {tab === 'images' && images.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {images.map((item) => (
            <div key={item.id} className="border border-stone-200 dark:border-stone-800 rounded-xl overflow-hidden bg-white dark:bg-stone-900">
              {item.url ? (
                <a href={item.url} target="_blank" rel="noreferrer">
                  <img src={item.url} alt="Render" className="w-full aspect-video object-cover" />
                </a>
              ) : (
                <div className="w-full aspect-video flex items-center justify-center bg-stone-100 dark:bg-stone-800 text-stone-400 text-xs">
                  Imagen no disponible
                </div>
              )}
              <div className="p-3 space-y-1">
                <p className="text-xs text-stone-400">{formatDate(item.created_at)}</p>
                <p className="text-sm text-stone-700 dark:text-stone-300 capitalize">
                  {item.lighting_type ?? '—'} · {item.color_temperature ?? '—'}
                </p>
                {item.scene_description && (
                  <p className="text-xs text-stone-500 dark:text-stone-400 line-clamp-2">{item.scene_description}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'videos' && !loading && !error && videos.length === 0 && (
        <div className="border-2 border-dashed border-stone-300 dark:border-stone-700 rounded-lg p-12 text-center text-stone-400 dark:text-stone-600 text-sm">
          Aún no has generado ningún video.
        </div>
      )}

      {tab === 'videos' && videos.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {videos.map((item) => (
            <div key={item.id} className="border border-stone-200 dark:border-stone-800 rounded-xl overflow-hidden bg-white dark:bg-stone-900">
              {item.url ? (
                <video src={item.url} controls className="w-full aspect-video object-cover bg-black" />
              ) : (
                <div className="w-full aspect-video flex items-center justify-center bg-stone-100 dark:bg-stone-800 text-stone-400 text-xs">
                  Video no disponible
                </div>
              )}
              <div className="p-3 space-y-2">
                <p className="text-xs text-stone-400">{formatDate(item.created_at)}</p>
                <p className="text-sm text-stone-700 dark:text-stone-300 capitalize">
                  {item.camera_movement?.replace('_', ' ') ?? '—'} · {item.duration_seconds ?? '—'}s · {item.resolution ?? '1080p'}
                </p>
                {item.start_description && (
                  <p className="text-xs text-stone-500 dark:text-stone-400 line-clamp-2">{item.start_description}</p>
                )}

                {/* Upscale a 4K: proceso aparte sobre este video ya generado */}
                {item.upscaled_url ? (
                  <a href={item.upscaled_url} download={`video_${item.id}_4k.mp4`}
                    className="block text-center py-2 px-3 bg-stone-800 dark:bg-stone-200 text-white dark:text-stone-900 hover:bg-stone-700 dark:hover:bg-stone-300 text-xs font-semibold rounded-lg transition">
                    Descargar {item.upscale_resolution?.toUpperCase() ?? '4K'}
                  </a>
                ) : upscaling[item.id] ? (
                  <div className="flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400"><LoadingSpinner /><span>{upscaling[item.id]}</span></div>
                ) : (
                  <button onClick={() => handleUpscale(item.id)} disabled={!item.url}
                    className="w-full py-2 px-3 rounded-lg bg-stone-100 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300 text-xs font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed">
                    {item.upscale_status === 'processing'
                      ? 'Reanudar upscale a 4K'
                      : item.upscale_status === 'error'
                        ? 'Reintentar upscale a 4K'
                        : 'Escalar a 4K'}
                  </button>
                )}
                {(upscaleErrors[item.id] ?? (!upscaling[item.id] && !item.upscaled_url ? item.upscale_error : null)) && (
                  <p className="text-xs text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg p-2">
                    {upscaleErrors[item.id] ?? item.upscale_error}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default History;
