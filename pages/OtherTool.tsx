import React from 'react';
import { Link } from 'react-router-dom';
import { btnSecondary } from '../components/ui';

const OtherTool: React.FC = () => (
  <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-6 py-20">
    <span className="inline-flex items-center gap-2 rounded-full bg-sand px-4 py-1.5 text-[13px] font-medium text-ink">
      <span className="h-1.5 w-1.5 rounded-full bg-ink" />
      Próximamente
    </span>
    <h1 className="mt-6 text-center font-display text-[2.4rem] font-bold leading-[1.05] tracking-[-0.03em] text-ink sm:text-5xl">
      Nueva herramienta
    </h1>
    <p className="mt-5 max-w-md text-center text-[15px] leading-relaxed text-ink-soft">
      Esta herramienta está en desarrollo. Vuelve pronto para descubrir nuevas funcionalidades
      para tu flujo de trabajo.
    </p>
    <Link to="/app" className={`${btnSecondary} mt-9`}>
      ← Volver al inicio
    </Link>
  </div>
);

export default OtherTool;
