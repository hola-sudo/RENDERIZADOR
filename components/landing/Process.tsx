import React from 'react';
import { Container, Eyebrow, Media, SectionTitle } from './primitives';
import { process } from './content';

const icons = [
  // Subir
  <path key="1" strokeLinecap="round" strokeLinejoin="round" d="M12 16V4m0 0L8 8m4-4l4 4M4 17v2a1 1 0 001 1h14a1 1 0 001-1v-2" />,
  // Luz
  <path key="2" strokeLinecap="round" strokeLinejoin="round" d="M12 3v1.5M5.6 5.6l1 1M3 12h1.5M19.5 12H21m-2.6-6.4l-1 1M9.5 17h5M10 20h4m-2-13a5 5 0 013 9h-6a5 5 0 013-9z" />,
  // Comparar
  <path key="3" strokeLinecap="round" strokeLinejoin="round" d="M12 4v16M5 7h4v10H5zM15 7h4v10h-4z" />,
  // Descargar
  <path key="4" strokeLinecap="round" strokeLinejoin="round" d="M12 4v12m0 0l-4-4m4 4l4-4M4 18v1a1 1 0 001 1h14a1 1 0 001-1v-1" />,
];

const Process: React.FC = () => (
  <section id="seccion-proceso" className="pt-24 sm:pt-32">
    <Container>
      <Eyebrow>{process.eyebrow}</Eyebrow>

      <div className="mt-7 grid gap-8 lg:grid-cols-2 lg:items-end">
        <SectionTitle top={process.titleTop} bottom={process.titleBottom} />
        <p className="max-w-xl text-[15px] leading-relaxed text-ink-soft lg:pb-3">
          {process.description}
        </p>
      </div>

      <div className="mt-10 grid gap-4 rounded-5xl bg-sand p-4 sm:p-6 lg:grid-cols-[0.85fr_1fr]">
        {/* Columna de imagen */}
        <div className="flex flex-col rounded-4xl bg-transparent p-4 sm:p-6">
          <h3 className="font-display text-xl font-semibold tracking-tight text-ink">
            {process.imageTitle}
          </h3>
          <div className="mt-5 flex-1 overflow-hidden rounded-3xl bg-sand-deep">
            <Media
              src={process.image}
              alt={process.imageTitle}
              label={process.imageTitle}
              className="h-[260px] w-full sm:h-full sm:min-h-[380px]"
            />
          </div>
        </div>

        {/* Lista de pasos */}
        <ol className="flex flex-col justify-center px-2 sm:px-6">
          {process.steps.map((step, i) => (
            <li key={step.title} className="border-b border-line py-7 last:border-0">
              <div className="flex items-center gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-ink/25 text-ink">
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                    {icons[i % icons.length]}
                  </svg>
                </span>
                <h4 className="font-serif text-2xl font-normal tracking-tight text-ink sm:text-[1.7rem]">
                  {step.title}
                </h4>
              </div>
              <p className="mt-3 max-w-lg text-[14px] leading-relaxed text-ink-soft sm:pl-[60px]">
                {step.description}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </Container>
  </section>
);

export default Process;
