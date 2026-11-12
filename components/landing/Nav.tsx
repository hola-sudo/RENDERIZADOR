import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { brand, nav } from './content';

const Nav: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <div className="mx-auto flex w-full max-w-[1180px] items-start justify-between gap-4 px-5 pt-4 sm:px-8 sm:pt-6">
        {/* Logotipo en su propia caja, como en la referencia */}
        <Link
          to="/"
          className={`flex items-center gap-3 rounded-3xl bg-white/90 px-5 py-3 backdrop-blur transition duration-300 ${
            scrolled ? 'shadow-[0_8px_30px_rgba(26,23,21,0.08)]' : ''
          }`}
        >
          <span className="font-display text-xl font-extrabold leading-none tracking-tight text-ink">
            {brand.monogram}
          </span>
          <span className="hidden text-[11px] leading-tight text-ink-mute sm:block">
            {brand.name} {brand.nameAccent}
            <br />
            {brand.tagline}
          </span>
        </Link>

        {/* Barra de navegación flotante */}
        <nav className="hidden items-center gap-1 rounded-full bg-white/90 p-2 pl-6 backdrop-blur md:flex shadow-[0_8px_30px_rgba(26,23,21,0.06)]">
          {nav.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="rounded-full px-4 py-2 text-sm font-medium text-ink-soft transition duration-200 hover:text-ink"
            >
              {item.label}
            </a>
          ))}
          <Link
            to="/login"
            className="ml-2 rounded-full bg-ink px-6 py-3 text-[12px] font-semibold uppercase tracking-[0.12em] text-bone transition duration-200 hover:bg-ink-soft"
          >
            Iniciar sesión
          </Link>
        </nav>

        {/* Móvil */}
        <button
          type="button"
          onClick={() => setOpen((p) => !p)}
          aria-label="Abrir menú"
          aria-expanded={open}
          className="flex h-[50px] w-[50px] items-center justify-center rounded-full bg-ink text-bone md:hidden"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
            {open ? (
              <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />
            )}
          </svg>
        </button>
      </div>

      {open && (
        <div className="mx-5 mt-3 rounded-3xl bg-white p-4 shadow-[0_18px_50px_rgba(26,23,21,0.12)] md:hidden">
          <div className="flex flex-col">
            {nav.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="border-b border-line/70 px-2 py-3 text-sm font-medium text-ink-soft last:border-0"
              >
                {item.label}
              </a>
            ))}
          </div>
          <Link
            to="/login"
            onClick={() => setOpen(false)}
            className="mt-3 block rounded-full bg-ink px-6 py-3.5 text-center text-[12px] font-semibold uppercase tracking-[0.12em] text-bone"
          >
            Iniciar sesión
          </Link>
        </div>
      )}
    </header>
  );
};

export default Nav;
