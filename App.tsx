import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './ThemeContext';
import { AuthProvider, useAuth } from './AuthContext';
import Navbar from './components/Navbar';
import Landing from './pages/Landing';
import EventRender from './pages/EventRender';
import OtherTool from './pages/OtherTool';
import Login from './pages/Login';

// Decide qué mostrar según el estado de la sesión.
const Gate: React.FC = () => {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-stone-400 text-sm">
        Cargando...
      </div>
    );
  }

  if (!session) {
    return <Login />;
  }

  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/render" element={<EventRender />} />
      <Route path="/tool" element={<OtherTool />} />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <div className="min-h-screen bg-stone-100 dark:bg-stone-950 flex flex-col">
            <Navbar />
            <main className="flex-1 flex flex-col">
              <Gate />
            </main>
          </div>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
