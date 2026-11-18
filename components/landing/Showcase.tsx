import React, { useMemo, useState } from 'react';
import { ArrowButton, Container, Eyebrow, PillButton, SectionTitle } from './primitives';
import { showcase } from './content';

type Item = {
  title: string;
  render: string;
  model: string;
  video?: string;
};

/*
 * Collage de casos. Cada tarjeta muestra el render; al pasar el cursor
 * (o tocar, en móvil) se revela el modelo 3D del que salió. Las tarjetas
 * con `video` añaden un botón de play que reproduce el recorrido virtual
 * en el mismo recuadro.
 */
const Tile: React.FC<{ item: Item; tall?: boolean }> = ({ item, tall = false }) => {
  const [revealed, setRevealed] = useState(false);
  const [playing, setPlaying] = useState(false);

  const height = tall
    ? 'h-[260px] sm:h-[360px] lg:h-[460px]'
    : 'h-[220px] sm:h-[300px] lg:h-[340px]';

  return (
    <figure className={`group relative overflow-hidden rounded-4xl bg-sand-deep ${height}`}>
      {playing && item.video ? (
        <video
          src={item.video}
          className="h-full w-full object-cover"
          controls
          autoPlay
          playsInline
          onEnded={() => setPlaying(false)}
        />
      ) : (
        <>
          <button
            type="button"
            onPointerEnter={(e) => e.pointerType !== 'touch' && setRevealed(true)}
            onPointerLeave={(e) => e.pointerType !== 'touch' && setRevealed(false)}
            onClick={() => setRevealed((p) => !p)}
            aria-label={`${item.title} — ver el modelo 3D original`}
            aria-pressed={revealed}
            className="block h-full w-full cursor-pointer"
          >
            <img
              src={item.render}
              alt={`${item.title} — render generado`}
              loading="lazy"
              className="h-full w-full object-cover"
            />
            <img
              src={item.model}
              alt={`${item.title} — modelo 3D`}
              loading="lazy"
              aria-hidden={!revealed}
              className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${
                revealed ? 'opacity-100' : 'opacity-0'
              }`}
            />
          </button>

          {/* Etiqueta de lo que se está viendo */}
          <span className="pointer-events-none absolute left-4 top-4 rounded-full bg-white/90 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink backdrop-blur">
            {revealed ? 'Modelo 3D' : 'Render'}
          </span>

          {item.video && (
            <button
              type="button"
              onClick={() => setPlaying(true)}
              aria-label={`Reproducir el recorrido virtual de ${item.title}`}
              className="absolute bottom-4 right-4 flex items-center gap-2 rounded-full bg-ink/85 px-4 py-2.5 text-[12px] font-medium text-bone backdrop-blur transition duration-200 hover:bg-ink"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M8 5v14l11-7z" />
              </svg>
              Ver recorrido
            </button>
          )}

          <figcaption className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/70 to-transparent p-4 pr-32 text-[13px] font-medium text-bone opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            {item.title}
          </figcaption>
        </>
      )}
    </figure>
  );
};

const Showcase: React.FC = () => {
  const [categoryId, setCategoryId] = useState(showcase.categories[0].id);

  const items = useMemo<Item[]>(
    () => showcase.categories.find((c) => c.id === categoryId)?.items ?? [],
    [categoryId],
  );

  return (
    <section id="seccion-galeria" className="pt-24 sm:pt-32">
      <Container>
        <Eyebrow>{showcase.eyebrow}</Eyebrow>

        <div className="mt-7 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <SectionTitle top={showcase.titleTop} bottom={showcase.titleBottom} />
          <p className="max-w-md text-[15px] leading-relaxed text-ink-soft lg:pb-3">
            {showcase.description}
          </p>
        </div>

        {/* Filtros del collage */}
        <div className="mt-8 flex flex-wrap gap-2">
          {showcase.categories.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategoryId(c.id)}
              aria-pressed={c.id === categoryId}
              className={`rounded-full px-5 py-2.5 text-sm font-medium transition duration-200 ${
                c.id === categoryId
                  ? 'bg-ink text-bone'
                  : 'bg-sand text-ink-soft hover:bg-sand-deep hover:text-ink'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Collage: la primera pieza ocupa el ancho completo */}
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {items.map((item, i) => (
            <div key={item.render} className={i === 0 ? 'sm:col-span-2' : ''}>
              <Tile item={item} tall={i === 0} />
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
          <p className="text-[13px] text-ink-mute">
            Pasa el cursor sobre cualquier imagen para ver el modelo 3D de origen.
          </p>
          <div className="flex items-center gap-2">
            <PillButton to="/login">{showcase.cta}</PillButton>
            <ArrowButton to="/login" label={showcase.cta} />
          </div>
        </div>
      </Container>
    </section>
  );
};

export default Showcase;
