import React, { useCallback, useRef, useState } from 'react';
import { ArrowButton, Container, Eyebrow, Media, PillButton, SectionTitle } from './primitives';
import { showcase } from './content';

const Showcase: React.FC = () => {
  const [index, setIndex] = useState(0);
  const [split, setSplit] = useState(55);
  const frameRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const item = showcase.items[index];
  const total = showcase.items.length;

  const updateFromPointer = useCallback((clientX: number) => {
    const rect = frameRef.current?.getBoundingClientRect();
    if (!rect) return;
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setSplit(Math.min(98, Math.max(2, pct)));
  }, []);

  const go = (delta: number) => {
    setIndex((prev) => (prev + delta + total) % total);
    setSplit(55);
  };

  return (
    <section id="seccion-galeria" className="pt-24 sm:pt-32">
      <Container>
        <Eyebrow>{showcase.eyebrow}</Eyebrow>

        <div className="mt-7 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <SectionTitle top={showcase.titleTop} bottom={showcase.titleBottom} />
          <p className="max-w-sm text-[15px] leading-relaxed text-ink-soft lg:pb-3">
            {showcase.description}
          </p>
        </div>

        {/* Comparador antes / después */}
        <div
          ref={frameRef}
          onPointerDown={(e) => {
            dragging.current = true;
            e.currentTarget.setPointerCapture(e.pointerId);
            updateFromPointer(e.clientX);
          }}
          onPointerMove={(e) => dragging.current && updateFromPointer(e.clientX)}
          onPointerUp={() => (dragging.current = false)}
          onPointerCancel={() => (dragging.current = false)}
          className="relative mt-10 touch-none select-none overflow-hidden rounded-5xl bg-sand-deep"
        >
          <Media
            src={item.after}
            alt={`${item.title} — render generado`}
            label="Render generado"
            className="h-[300px] w-full sm:h-[460px] lg:h-[580px]"
          />

          {/* Capa "antes", recortada hasta la posición del control */}
          <div
            className="absolute inset-0"
            style={{ clipPath: `inset(0 ${100 - split}% 0 0)` }}
          >
            <Media
              src={item.before}
              alt={`${item.title} — modelo 3D`}
              label="Modelo 3D"
              className="h-full w-full"
            />
          </div>

          {/* Control deslizante */}
          <div
            className="absolute inset-y-0 w-px bg-white/90"
            style={{ left: `${split}%` }}
            aria-hidden="true"
          >
            <span className="absolute top-1/2 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize items-center justify-center rounded-full bg-white text-ink shadow-[0_6px_20px_rgba(26,23,21,0.2)]">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 7l-4 5 4 5M14 7l4 5-4 5" />
              </svg>
            </span>
          </div>

          <input
            type="range"
            min={2}
            max={98}
            value={Math.round(split)}
            onChange={(e) => setSplit(Number(e.target.value))}
            aria-label="Comparar modelo 3D con el render"
            className="sr-only"
          />
        </div>

        {/* Ficha del caso */}
        <div className="mt-4 rounded-5xl bg-sand p-7 sm:p-10">
          <div className="grid gap-8 lg:grid-cols-[1fr_1.15fr]">
            <div>
              <p className="text-[13px] text-ink-mute">
                <span className="text-ink">{String(index + 1).padStart(2, '0')}</span> / {String(total).padStart(2, '0')}
              </p>
              <h3 className="mt-3 font-serif text-3xl font-normal tracking-tight text-ink sm:text-[2.4rem]">
                {item.title}
              </h3>
              <p className="mt-3 text-[13px] text-ink-mute">
                {item.kind} <span className="mx-1">•</span> {item.place}
              </p>
            </div>

            <dl>
              <div className="flex flex-col gap-1 border-b border-line py-4 sm:flex-row sm:gap-8">
                <dt className="w-28 shrink-0 text-[14px] font-semibold text-ink">Objetivo</dt>
                <dd className="text-[14px] leading-relaxed text-ink-soft">{item.goal}</dd>
              </div>
              <div className="flex flex-col gap-1 py-4 sm:flex-row sm:gap-8">
                <dt className="w-28 shrink-0 text-[14px] font-semibold text-ink">Solución</dt>
                <dd className="text-[14px] leading-relaxed text-ink-soft">{item.solution}</dd>
              </div>
            </dl>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-7">
            <div className="flex items-center gap-3">
              <ArrowButton variant="outline" direction="left" label="Caso anterior" onClick={() => go(-1)} />
              <span className="text-sm text-ink-mute">Anterior</span>
              <span className="ml-4 text-sm font-semibold text-ink">Siguiente</span>
              <ArrowButton variant="outline" label="Caso siguiente" onClick={() => go(1)} />
            </div>
            <div className="flex items-center gap-2">
              <PillButton to="/login">{showcase.cta}</PillButton>
              <ArrowButton to="/login" label={showcase.cta} />
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
};

export default Showcase;
