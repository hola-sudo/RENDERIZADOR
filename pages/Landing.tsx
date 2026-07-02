import React from 'react';
import { Link } from 'react-router-dom';

const tools = [
  {
    to: '/render',
    title: 'Event Render AI',
    description: 'Transforma una escena de SketchUp en un render fotorrealista de evento. Configura iluminación, temperatura de color, exposición y referencias visuales.',
    badge: 'Available',
  },
  {
    to: '/tool',
    title: 'Other Tool',
    description: 'Próximamente. Una nueva herramienta para ampliar tu flujo de trabajo creativo.',
    badge: 'Coming Soon',
  },
];

const Landing: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-20 min-h-[calc(100vh-57px)]">
      <p className="text-xs font-semibold tracking-[0.25em] uppercase text-stone-400 mb-6">
        AI Creative Suite
      </p>
      <h1 className="text-5xl md:text-7xl font-bold text-stone-900 dark:text-stone-100 text-center mb-5 tracking-tight leading-none">
        Studio AI
      </h1>
      <p className="text-stone-500 dark:text-stone-400 text-base md:text-lg text-center max-w-lg mb-16 leading-relaxed">
        Herramientas de inteligencia artificial para profesionales del diseño y los eventos.
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
