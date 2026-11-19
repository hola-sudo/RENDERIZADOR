import React from 'react';
import { Link } from 'react-router-dom';
import { brand } from '../components/landing/content';
import { btnPrimary, card, heading, subheading } from '../components/ui';

const tools = [
  {
    to: '/render',
    title: 'Renderizador',
    description:
      'Transforma una escena de tu modelaje 3D en un render fotorrealista de tu proyecto. Configura la iluminación, describe tu escena y crea el ambiente que prefieras: de día, de noche o al atardecer.',
    image: '/landing/tool-render.jpg',
  },
  {
    to: '/video-transition',
    title: 'Recorrido virtual',
    description:
      'Crea recorridos virtuales con transiciones de video proporcionando un start frame y un end frame.',
    image: '/landing/tool-video.jpg',
  },
];

const Landing: React.FC = () => (
  <div className="min-h-0 flex-1 overflow-y-auto">
    <div className="mx-auto w-full max-w-[1180px] px-5 py-14 sm:px-8 sm:py-20">
      <span className="inline-flex items-center gap-2 rounded-full bg-sand px-4 py-1.5 text-[13px] font-medium text-ink">
        <span className="h-1.5 w-1.5 rounded-full bg-ink" />
        Tus herramientas
      </span>

      <h1 className="mt-6 font-display text-[2.4rem] font-bold leading-[1.05] tracking-[-0.03em] text-ink sm:text-5xl">
        {brand.name}
        {brand.nameAccent}
        <br />
        <span className="text-ink-mute">listo para renderizar</span>
      </h1>
      <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-ink-soft">
        Herramientas de renderización para profesionales de arquitectura y diseño de interiores
        con inteligencia artificial.
      </p>

      <div className="mt-10 grid gap-4 lg:grid-cols-2">
        {tools.map((tool) => (
          <div key={tool.to} className={`${card} flex flex-col gap-5`}>
            <div className="overflow-hidden rounded-3xl bg-sand-deep">
              <img
                src={tool.image}
                alt={tool.title}
                loading="lazy"
                className="h-44 w-full object-cover sm:h-52"
              />
            </div>

            <div className="flex items-start justify-between gap-3">
              <h2 className={heading}>{tool.title}</h2>
              <span className="mt-1.5 shrink-0 rounded-full bg-ink px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-bone">
                Disponible
              </span>
            </div>

            <p className={`${subheading} flex-1`}>{tool.description}</p>

            <Link to={tool.to} className={`${btnPrimary} w-full`}>
              Abrir herramienta
            </Link>
          </div>
        ))}
      </div>
    </div>
  </div>
);

export default Landing;
