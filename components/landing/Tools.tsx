import React, { useState } from 'react';
import { ArrowButton, Container, Eyebrow, Media, PillButton, SectionTitle } from './primitives';
import { tools } from './content';

const Tools: React.FC = () => {
  const [active, setActive] = useState(0);
  const item = tools.items[active];

  return (
    <section id="seccion-herramientas" className="pt-24 sm:pt-32">
      <Container>
        <Eyebrow>{tools.eyebrow}</Eyebrow>

        <div className="mt-7 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <SectionTitle top={tools.titleTop} bottom={tools.titleBottom} />
            <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-ink-soft">
              {tools.description}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <PillButton to="/login">{tools.cta}</PillButton>
            <ArrowButton to="/login" label={tools.cta} />
          </div>
        </div>

        <div className="mt-10 grid gap-4 lg:grid-cols-2">
          {/* Imagen de la herramienta activa + miniaturas */}
          <div className="relative overflow-hidden rounded-5xl bg-sand">
            <Media
              src={item.image}
              alt={item.title}
              label={item.title}
              className="h-[320px] w-full sm:h-[440px] lg:h-[560px]"
            />
            <div className="absolute inset-x-0 bottom-0 flex justify-center gap-2 p-4">
              {tools.items.map((t, i) => (
                <button
                  key={t.tab}
                  type="button"
                  onClick={() => setActive(i)}
                  aria-label={t.tab}
                  aria-current={i === active}
                  className={`h-14 w-16 overflow-hidden rounded-xl border-2 bg-sand-deep transition duration-200 sm:h-16 sm:w-20 ${
                    i === active ? 'border-white' : 'border-white/40 opacity-70 hover:opacity-100'
                  }`}
                >
                  <Media src={t.image} alt={t.tab} label="" className="h-full w-full" />
                </button>
              ))}
            </div>
          </div>

          {/* Panel de contenido */}
          <div className="flex flex-col rounded-5xl bg-sand p-7 sm:p-10">
            <div className="-mx-1 flex flex-wrap gap-x-5 gap-y-2">
              {tools.items.map((t, i) => (
                <button
                  key={t.tab}
                  type="button"
                  onClick={() => setActive(i)}
                  className={`px-1 text-sm transition duration-200 ${
                    i === active ? 'font-semibold text-ink' : 'text-ink-mute hover:text-ink-soft'
                  }`}
                >
                  {t.tab}
                </button>
              ))}
            </div>

            <div className="flex flex-1 flex-col justify-center py-10 text-center sm:py-14">
              <h3 className="font-serif text-3xl font-normal tracking-tight text-ink sm:text-[2.6rem]">
                {item.title}
              </h3>
              <p className="mx-auto mt-4 max-w-md text-[15px] leading-relaxed text-ink-soft">
                {item.description}
              </p>
            </div>

            <ul className="border-t border-line pt-6">
              {item.specs.map((spec) => (
                <li
                  key={spec}
                  className="flex items-start gap-3 border-b border-line/70 py-3 text-[14px] text-ink-soft last:border-0"
                >
                  <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-ink" />
                  {spec}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Container>
    </section>
  );
};

export default Tools;
