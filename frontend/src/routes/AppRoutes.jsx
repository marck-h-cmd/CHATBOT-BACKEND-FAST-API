import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '../contexts/AuthContext';
import { SyllabusProvider } from '../contexts/SyllabusContext';
import { ChatProvider } from '../contexts/ChatContext';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import PrivateRoute from './PrivateRoute';

// Importar páginas
import LoginPage from '../pages/Auth/LoginPage';
import RegisterPage from '../pages/Auth/RegisterPage';
import DashboardPage from '../pages/DashboardPage';
import ChatPage from '../pages/ChatPage';
import SyllabusManagerPage from '../pages/SyllabusManagerPage';
import MetricsPage from '../pages/MetricsPage';
import ProfilePage from '../pages/ProfilePage';
import NotFoundPage from '../pages/NotFoundPage';

// Layout wrapper para páginas con navegación (todas excepto auth)
const AppLayout = ({ children }) => (
  <div className="min-h-screen flex flex-col bg-gray-50">
    <Navbar />
    <main className="flex-1">
      {children}
    </main>
    <Footer />
  </div>
);

const ChatLayout = ({ children }) => (
  <div className="h-[100dvh] flex flex-col bg-gray-50 overflow-hidden">
    <Navbar />
    <main className="flex-1 min-h-0 overflow-hidden">
      {children}
    </main>
  </div>
);

const AppRoutes = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SyllabusProvider>
          <ChatProvider>
            <Routes>
              {/* Rutas públicas (sin layout Navbar/Footer) */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />

              {/* Rutas protegidas (con layout Navbar/Footer) */}
              <Route path="/" element={
                <PrivateRoute>
                  <AppLayout>
                    <DashboardPage />
                  </AppLayout>
                </PrivateRoute>
              } />
              <Route path="/dashboard" element={
                <PrivateRoute>
                  <AppLayout>
                    <DashboardPage />
                  </AppLayout>
                </PrivateRoute>
              } />
              <Route path="/chat" element={
                <PrivateRoute>
                  <ChatLayout>
                    <ChatPage />
                  </ChatLayout>
                </PrivateRoute>
              } />
              <Route path="/syllabus" element={
                <PrivateRoute>
                  <AppLayout>
                    <SyllabusManagerPage />
                  </AppLayout>
                </PrivateRoute>
              } />
              <Route path="/metrics" element={
                <PrivateRoute requiredRole="admin">
                  <AppLayout>
                    <MetricsPage />
                  </AppLayout>
                </PrivateRoute>
              } />
              <Route path="/profile" element={
                <PrivateRoute>
                  <AppLayout>
                    <ProfilePage />
                  </AppLayout>
                </PrivateRoute>
              } />

              {/* Ruta 404 */}
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </ChatProvider>
        </SyllabusProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default AppRoutes;