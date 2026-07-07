import React, { useEffect, useState } from 'react';
import { listRenders, type RenderItem } from '../services/apiService';
import LoadingSpinner from '../components/LoadingSpinner';

const History: React.FC = () => {
  const [items, setItems] = useState<RenderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    listRenders()
      .then((data) => { if (active) setItems(data); })
      .catch((err) => { if (active) setError(err.message ?? 'No se pudo cargar el historial.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString('es', { dateStyle: 'medium', timeStyle: 'short' });

  return (
    <div className="max-w-6xl mx-auto w-full px-6 py-8">
      <h1 className="text-xl font-bold text-stone-900 dark:text-stone-100 mb-1">Historial de renders</h1>
      <p className="text-sm text-stone-500 dark:text-stone-400 mb-6">Tus renders generados, más recientes primero.</p>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-stone-500 dark:text-stone-400"><LoadingSpinner /><span>Cargando...</span></div>
      )}

      {error && (
        <p className="text-red-700 dark:text-red-300 text-sm bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg p-3">{error}</p>
      )}

      {!loading && !error && items.length === 0 && (
        <div className="border-2 border-dashed border-stone-300 dark:border-stone-700 rounded-lg p-12 text-center text-stone-400 dark:text-stone-600 text-sm">
          Aún no has generado ningún render.
        </div>
      )}

      {items.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map((item) => (
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
    </div>
  );
};

export default History;
