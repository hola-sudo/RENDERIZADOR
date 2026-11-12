import React, { useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { brand } from '../components/landing/content';

type Mode = 'signin' | 'signup';

const Login: React.FC = () => {
  const { session, loading: sessionLoading, signIn, signUp } = useAuth();
  const location = useLocation() as { state?: { from?: string } };

  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Si ya hay sesión, no tiene caso mostrar el formulario.
  if (!sessionLoading && session) {
    return <Navigate to={location.state?.from ?? '/app'} replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setLoading(true);
    try {
      if (mode === 'signin') {
        await signIn(email, password);
        // AuthContext actualiza la sesión y el Navigate de arriba hace el resto.
      } else {
        const { needsConfirmation } = await signUp(email, password);
        if (needsConfirmation) {
          setNotice('Te mandamos un correo para confirmar tu cuenta. Ábrelo y vuelve a entrar.');
        }
      }
    } catch (err: any) {
      setError(err.message ?? 'No se pudo completar la operación.');
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    'w-full rounded-2xl border border-line bg-white px-4 py-3.5 text-[15px] text-ink outline-none transition placeholder:text-ink-mute/70 focus:border-ink';

  return (
    <div className="min-h-screen bg-shell p-3">
      <div className="min-h-[calc(100vh-1.5rem)] rounded-6xl bg-bone px-5 py-10 sm:px-10">
        <div className="mx-auto flex w-full max-w-[1180px] items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-ink font-display text-sm font-extrabold text-bone">
              {brand.monogram}
            </span>
            <span className="font-display text-lg font-bold tracking-tight text-ink">
              {brand.name}
              <span className="font-normal text-ink-mute"> {brand.nameAccent}</span>
            </span>
          </Link>
          <Link
            to="/"
            className="text-sm font-medium text-ink-soft underline decoration-line underline-offset-4 transition hover:text-ink"
          >
            Volver al inicio
          </Link>
        </div>

        <div className="mx-auto mt-14 w-full max-w-[460px] sm:mt-24">
          <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-1.5 text-[13px] font-medium text-ink">
            <span className="h-1.5 w-1.5 rounded-full bg-ink" />
            {mode === 'signin' ? 'Acceso' : 'Nueva cuenta'}
          </span>

          <h1 className="mt-6 font-display text-[2.4rem] font-bold leading-[1.05] tracking-[-0.03em] text-ink sm:text-5xl">
            {mode === 'signin' ? 'Entra a tu' : 'Crea tu'}
            <br />
            <span className="text-ink-mute">{mode === 'signin' ? 'estudio' : 'cuenta'}</span>
          </h1>
          <p className="mt-4 text-[15px] leading-relaxed text-ink-soft">
            {mode === 'signin'
              ? 'Accede a tus renders, videos e historial.'
              : 'Regístrate para empezar a generar renders de tus eventos.'}
          </p>

          <form onSubmit={handleSubmit} className="mt-9 rounded-5xl bg-sand p-7 sm:p-9">
            <label htmlFor="email" className="block text-[12px] font-semibold uppercase tracking-[0.12em] text-ink-mute">
              Correo
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="tu@estudio.mx"
              className={`mt-2 ${inputClass}`}
            />

            <label
              htmlFor="password"
              className="mt-6 block text-[12px] font-semibold uppercase tracking-[0.12em] text-ink-mute"
            >
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              placeholder="••••••••"
              className={`mt-2 ${inputClass}`}
            />

            {error && (
              <p className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-[14px] text-red-800">
                {error}
              </p>
            )}
            {notice && (
              <p className="mt-5 rounded-2xl border border-line bg-white p-4 text-[14px] text-ink-soft">
                {notice}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-7 w-full rounded-full bg-ink px-6 py-4 text-[12px] font-semibold uppercase tracking-[0.12em] text-bone transition duration-200 hover:bg-ink-soft disabled:cursor-not-allowed disabled:opacity-40"
            >
              {loading
                ? 'Un momento...'
                : mode === 'signin'
                  ? 'Entrar'
                  : 'Crear cuenta'}
            </button>

            <p className="mt-6 text-center text-[14px] text-ink-soft">
              {mode === 'signin' ? '¿Todavía no tienes cuenta?' : '¿Ya tienes cuenta?'}{' '}
              <button
                type="button"
                onClick={() => {
                  setMode(mode === 'signin' ? 'signup' : 'signin');
                  setError(null);
                  setNotice(null);
                }}
                className="font-semibold text-ink underline decoration-line underline-offset-4"
              >
                {mode === 'signin' ? 'Créala aquí' : 'Inicia sesión'}
              </button>
            </p>
          </form>

          <p className="mt-6 text-center text-[13px] text-ink-mute">
            ¿Dudas con tu plan? Escríbenos a{' '}
            <a href={`mailto:${brand.email}`} className="underline decoration-line underline-offset-4">
              {brand.email}
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
