import React from 'react';
import { Link } from 'react-router-dom';

const tools = [
  {
    to: '/render',
    title: 'Renderizador',
    description: 'Transforma una escena de tu modelaje 3D en un render fotorrealista de tu proyecto. Configura la iluminación, describe tu escena y crea el ambiente que prefieras: de día, de noche o al atardecer.',
    badge: 'Available',
  },
  {
    to: '/video-transition',
    title: 'Recorrido virtual',
    description: 'Crea recorridos virtuales con transiciones de video proporcionando un start frame y un end frame.',
    badge: 'Available',
  },
];

const Landing: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-20 min-h-[calc(100vh-57px)]">
      <p className="text-xs font-semibold tracking-[0.25em] uppercase text-stone-400 mb-6">
        AI Creative Suite
      </p>
      <h1 className="text-4xl md:text-6xl font-bold text-stone-900 dark:text-stone-100 text-center mb-5 tracking-tight leading-none break-words">
        PHORMARENDER
      </h1>
      <p className="text-stone-500 dark:text-stone-400 text-base md:text-lg text-center max-w-lg mb-16 leading-relaxed">
        Herramientas de renderización para profesionales de arquitectura y diseño de interiores con inteligencia artificial.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 w-full max-w-3xl">
        {tools.map((tool) => (
          <div
            key={tool.to}
            className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl p-6 flex flex-col gap-4 hover:border-stone-400 dark:hover:border-stone-600 transition duration-200 group"
          >
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-stone-900 dark:text-stone-100 font-semibold text-lg leading-snug">{tool.title}</h2>
              <span className={`shrink-0 text-xs px-2 py-1 rounded-md font-medium mt-0.5 ${
                tool.badge === 'Available'
                  ? 'bg-stone-700 text-stone-100'
                  : 'bg-stone-100 dark:bg-stone-800 text-stone-400 dark:text-stone-500'
              }`}>
                {tool.badge === 'Available' ? 'Disponible' : 'Próximamente'}
              </span>
            </div>
            <p className="text-stone-500 dark:text-stone-400 text-sm flex-1 leading-relaxed">{tool.description}</p>
            {tool.badge === 'Available' ? (
              <Link
                to={tool.to}
                className="mt-2 py-2.5 px-5 bg-stone-800 dark:bg-stone-200 text-white dark:text-stone-900 text-sm font-semibold rounded-lg hover:bg-stone-700 dark:hover:bg-stone-300 transition duration-200 text-center"
              >
                Abrir herramienta
              </Link>
            ) : (
              <button
                disabled
                className="mt-2 py-2.5 px-5 bg-stone-100 dark:bg-stone-800 text-stone-400 dark:text-stone-500 text-sm font-semibold rounded-lg cursor-not-allowed text-center"
              >
                Próximamente
              </button>
            )}
          </div>
        ))}
      </div>

    </div>
  );
};

export default Landing;
