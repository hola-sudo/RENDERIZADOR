import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { brand } from './landing/content';

const navLinks = [
  { to: '/app', label: 'Inicio' },
  { to: '/render', label: 'Renderizador' },
  { to: '/video-transition', label: 'Recorrido virtual' },
  { to: '/history', label: 'Historial' },
];

const Navbar: React.FC = () => {
  const { pathname } = useLocation();
  const { session, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const linkClass = (active: boolean) =>
    `rounded-full px-4 py-2 text-sm font-medium transition duration-200 ${
      active ? 'bg-ink text-bone' : 'text-ink-soft hover:text-ink'
    }`;

  return (
    <nav className="w-full border-b border-line bg-bone px-5 py-3.5 sm:px-8">
      <div className="mx-auto flex max-w-[1180px] items-center justify-between gap-4">
        <Link to="/app" className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-ink font-display text-[13px] font-extrabold text-bone">
            {brand.monogram}
          </span>
          <span className="font-display text-base font-bold tracking-tight text-ink">
            {brand.name}
            <span className="font-normal text-ink-mute">{brand.nameAccent}</span>
          </span>
        </Link>

        {/* Escritorio */}
        <div className="hidden items-center gap-1 sm:flex">
          {navLinks.map(({ to, label }) => (
            <Link key={to} to={to} className={linkClass(pathname === to)}>
              {label}
            </Link>
          ))}
          {session && (
            <button
              onClick={() => signOut()}
              className="ml-3 text-sm font-medium text-ink-mute transition duration-200 hover:text-ink"
            >
              Cerrar sesión
            </button>
          )}
        </div>

        {/* Móvil */}
        <button
          type="button"
          onClick={() => setMenuOpen((prev) => !prev)}
          aria-label="Abrir menú"
          aria-expanded={menuOpen}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-ink text-bone sm:hidden"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
            {menuOpen ? (
              <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Menú móvil */}
      {menuOpen && (
        <div className="mt-3 flex flex-col sm:hidden">
          {navLinks.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              onClick={() => setMenuOpen(false)}
              className={`border-b border-line/70 px-2 py-3 text-sm font-medium transition duration-200 ${
                pathname === to ? 'text-ink' : 'text-ink-soft'
              }`}
            >
              {label}
            </Link>
          ))}
          {session && (
            <button
              onClick={() => {
                setMenuOpen(false);
                signOut();
              }}
              className="px-2 py-3 text-left text-sm font-medium text-ink-mute transition duration-200 hover:text-ink"
            >
              Cerrar sesión
            </button>
          )}
        </div>
      )}
    </nav>
  );
};

export default Navbar;
