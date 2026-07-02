import React from 'react';
import { Link } from 'react-router-dom';

const OtherTool: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center px-6 min-h-[calc(100vh-57px)]">
      <p className="text-xs font-semibold tracking-[0.25em] uppercase text-stone-400 mb-4">
        Próximamente
      </p>
      <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight text-center">
        Other Tool
      </h1>
      <p className="text-neutral-400 text-sm text-center max-w-md mb-10 leading-relaxed">
        Esta herramienta está en desarrollo. Vuelve pronto para descubrir nuevas funcionalidades para tu flujo de trabajo.
      </p>
      <Link
        to="/"
        className="py-2.5 px-6 bg-neutral-800 text-neutral-300 text-sm font-semibold rounded-lg hover:bg-neutral-700 hover:text-white transition duration-200 border border-neutral-700"
      >
        ← Volver al inicio
      </Link>
    </div>
  );
};

export default OtherTool;
