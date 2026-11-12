import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { ThemeProvider } from './ThemeContext';
import { AuthProvider, useAuth } from './AuthContext';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Landing from './pages/Landing';
import EventRender from './pages/EventRender';
import VideoTransition from './pages/VideoTransition';
import OtherTool from './pages/OtherTool';
import History from './pages/History';
import Login from './pages/Login';

const FullScreenLoader: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center bg-stone-100 dark:bg-stone-950 text-stone-400 text-sm">
    Cargando...
  </div>
);

// Envuelve las rutas privadas: sin sesión manda a /login y recuerda a dónde iba.
const RequireAuth: React.FC = () => {
  const { session, loading } = useAuth();
  const location = useLocation();

  if (loading) return <FullScreenLoader />;
  if (!session) return <Navigate to="/login" state={{ from: location.pathname }} replace />;

  return (
    <div className="min-h-screen bg-stone-100 dark:bg-stone-950 flex flex-col">
      <Navbar />
      <main className="flex-1 flex flex-col">
        <Outlet />
      </main>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Públicas */}
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />

            {/* Privadas: comparten navbar y layout de la app */}
            <Route element={<RequireAuth />}>
              <Route path="/app" element={<Landing />} />
              <Route path="/render" element={<EventRender />} />
              <Route path="/video-transition" element={<VideoTransition />} />
              <Route path="/history" element={<History />} />
              <Route path="/tool" element={<OtherTool />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
