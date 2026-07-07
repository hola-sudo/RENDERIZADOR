import React, { useState } from 'react';
import { useAuth } from '../AuthContext';

const Login: React.FC = () => {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await signIn(email, password);
      // Al iniciar sesión, AuthContext actualiza la sesión y App muestra la app.
    } catch (err: any) {
      setError(err.message ?? 'No se pudo iniciar sesión.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center px-4 py-16">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl p-8 shadow-sm"
      >
        <div>
          <h1 className="text-xl font-bold text-stone-900 dark:text-stone-100">Iniciar sesión</h1>
          <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">Accede a Event Render AI.</p>
        </div>

        <div>
          <label htmlFor="email" className="block text-xs font-semibold text-stone-600 dark:text-stone-400 uppercase tracking-wider mb-1.5">Email</label>
          <input
            id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            required autoComplete="email"
            className="w-full p-2.5 rounded-lg bg-white dark:bg-stone-950 border border-stone-300 dark:border-stone-700 text-stone-900 dark:text-stone-100 text-sm focus:ring-2 focus:ring-stone-400 outline-none transition"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-xs font-semibold text-stone-600 dark:text-stone-400 uppercase tracking-wider mb-1.5">Contraseña</label>
          <input
            id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            required autoComplete="current-password"
            className="w-full p-2.5 rounded-lg bg-white dark:bg-stone-950 border border-stone-300 dark:border-stone-700 text-stone-900 dark:text-stone-100 text-sm focus:ring-2 focus:ring-stone-400 outline-none transition"
          />
        </div>

        {error && (
          <p className="text-red-700 dark:text-red-300 text-sm bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg p-3">{error}</p>
        )}

        <button
          type="submit" disabled={loading}
          className="w-full py-2.5 rounded-lg bg-stone-800 dark:bg-stone-200 text-white dark:text-stone-900 text-sm font-bold hover:bg-stone-700 dark:hover:bg-stone-300 transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </div>
  );
};

export default Login;
