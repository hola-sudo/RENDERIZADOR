import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
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
  <div className="flex min-h-screen items-center justify-center bg-bone text-sm text-ink-mute">
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
    <div className="flex h-screen flex-col bg-bone">
      <Navbar />
      <main className="flex min-h-0 flex-1 flex-col">
        <Outlet />
      </main>
    </div>
  );
};

const App: React.FC = () => {
  return (
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
  );
};

export default App;
