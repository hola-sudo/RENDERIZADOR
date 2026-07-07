import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTheme } from '../ThemeContext';
import { useAuth } from '../AuthContext';

const navLinks = [
  { to: '/', label: 'Inicio' },
  { to: '/render', label: 'Event Render' },
  { to: '/tool', label: 'Other Tool' },
];

const SunIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
  </svg>
);

const MoonIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
  </svg>
);

const Navbar: React.FC = () => {
  const { pathname } = useLocation();
  const { isDark, toggle } = useTheme();
  const { session, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="w-full bg-white dark:bg-stone-900 border-b border-stone-200 dark:border-stone-800 px-6 py-4">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <Link to="/" className="text-stone-900 dark:text-stone-100 font-bold text-lg tracking-tight">
          Studio<span className="text-stone-400 font-normal"> AI</span>
        </Link>

        {/* Desktop links + toggle */}
        <div className="hidden sm:flex items-center gap-6">
          {navLinks.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              className={`text-sm font-medium transition duration-200 ${
                pathname === to
                  ? 'text-stone-900 dark:text-stone-100'
                  : 'text-stone-400 hover:text-stone-700 dark:hover:text-stone-200'
              }`}
            >
              {label}
            </Link>
          ))}
          <button
            onClick={toggle}
            title={isDark ? 'Modo claro' : 'Modo oscuro'}
            className="p-2 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition duration-200"
          >
            {isDark ? <SunIcon /> : <MoonIcon />}
          </button>
          {session && (
            <button
              onClick={() => signOut()}
              className="text-sm font-medium text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition duration-200"
            >
              Cerrar sesión
            </button>
          )}
        </div>

        {/* Mobile: toggle + hamburger */}
        <div className="sm:hidden flex items-center gap-2">
          <button
            onClick={toggle}
            title={isDark ? 'Modo claro' : 'Modo oscuro'}
            className="p-2 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition duration-200"
          >
            {isDark ? <SunIcon /> : <MoonIcon />}
          </button>
          <button
            className="text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition duration-200"
            onClick={() => setMenuOpen(prev => !prev)}
            aria-label="Toggle menu"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {menuOpen
                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              }
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="sm:hidden mt-4 flex flex-col gap-4 border-t border-stone-200 dark:border-stone-800 pt-4">
          {navLinks.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              onClick={() => setMenuOpen(false)}
              className={`text-sm font-medium px-2 transition duration-200 ${
                pathname === to
                  ? 'text-stone-900 dark:text-stone-100'
                  : 'text-stone-400 hover:text-stone-700 dark:hover:text-stone-200'
              }`}
            >
              {label}
            </Link>
          ))}
          {session && (
            <button
              onClick={() => { setMenuOpen(false); signOut(); }}
              className="text-left text-sm font-medium px-2 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition duration-200"
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
