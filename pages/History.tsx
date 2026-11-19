import React, { useEffect, useState } from 'react';
import { listRenders, listVideoRenders, type RenderItem } from '../services/apiService';
import type { VideoRenderItem } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';
import { alertError, emptyBox, note, toggleGroup, toggleOption } from '../components/ui';

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

  const loading = tab === 'images' ? imagesLoading : videosLoading;
  const error = tab === 'images' ? imagesError : videosError;

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-[1180px] px-5 py-12 sm:px-8 sm:py-16">
        <h1 className="font-display text-[2rem] font-bold leading-[1.05] tracking-[-0.03em] text-ink sm:text-4xl">
          Historial
          <br />
          <span className="text-ink-mute">y privacidad</span>
        </h1>
        <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-ink-soft">
          Tus renders y recorridos quedan disponibles hasta por 7 días, más recientes primero.
          Solo tú los ves.
        </p>

        <div className={`mt-8 max-w-xs ${toggleGroup}`}>
          <button onClick={() => setTab('images')} className={toggleOption(tab === 'images')}>
            Imágenes ({images.length})
          </button>
          <button onClick={() => setTab('videos')} className={toggleOption(tab === 'videos')}>
            Recorridos ({videos.length})
          </button>
        </div>

        <div className="mt-8">
          {loading && (
            <div className="flex items-center gap-2 text-[14px] text-ink-soft">
              <LoadingSpinner />
              <span>Cargando...</span>
            </div>
          )}

          {error && <p className={alertError}>{error}</p>}

          {tab === 'images' && !loading && !error && images.length === 0 && (
            <div className={`${emptyBox} py-16`}>Aún no has generado ningún render.</div>
          )}

          {tab === 'images' && images.length > 0 && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {images.map((item) => (
                <div key={item.id} className="overflow-hidden rounded-4xl bg-sand">
                  {item.url ? (
                    <a href={item.url} target="_blank" rel="noreferrer">
                      <img src={item.url} alt="Render" className="aspect-video w-full object-cover" />
                    </a>
                  ) : (
                    <div className="flex aspect-video w-full items-center justify-center bg-sand-deep text-[13px] text-ink-mute">
                      Imagen no disponible
                    </div>
                  )}
                  <div className="space-y-1.5 p-5">
                    <p className="text-[12px] uppercase tracking-[0.1em] text-ink-mute">
                      {formatDate(item.created_at)}
                    </p>
                    <p className="text-[14px] capitalize text-ink">
                      {item.lighting_type ?? '—'} · {item.color_temperature ?? '—'}
                    </p>
                    {item.scene_description && (
                      <p className={`line-clamp-2 ${note}`}>{item.scene_description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'videos' && !loading && !error && videos.length === 0 && (
            <div className={`${emptyBox} py-16`}>Aún no has generado ningún recorrido.</div>
          )}

          {tab === 'videos' && videos.length > 0 && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {videos.map((item) => (
                <div key={item.id} className="overflow-hidden rounded-4xl bg-sand">
                  {item.url ? (
                    <video src={item.url} controls className="aspect-video w-full bg-ink object-cover" />
                  ) : (
                    <div className="flex aspect-video w-full items-center justify-center bg-sand-deep text-[13px] text-ink-mute">
                      Video no disponible
                    </div>
                  )}
                  <div className="space-y-1.5 p-5">
                    <p className="text-[12px] uppercase tracking-[0.1em] text-ink-mute">
                      {formatDate(item.created_at)}
                    </p>
                    <p className="text-[14px] capitalize text-ink">
                      {item.camera_movement?.replace('_', ' ') ?? '—'} · {item.duration_seconds ?? '—'}s ·{' '}
                      {item.resolution ?? '1080p'}
                    </p>
                    {item.start_description && (
                      <p className={`line-clamp-2 ${note}`}>{item.start_description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default History;
