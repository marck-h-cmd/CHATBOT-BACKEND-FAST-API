import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '../contexts/AuthContext';
import { SyllabusProvider } from '../contexts/SyllabusContext';
import { ChatProvider } from '../contexts/ChatContext';
import { CourseProvider } from '../contexts/CourseContext';
import { ServiceDeskProvider } from '../contexts/ServiceDeskContext';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import PrivateRoute from './PrivateRoute';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';

// Importar páginas
import LoginPage from '../pages/Auth/LoginPage';
import RegisterPage from '../pages/Auth/RegisterPage';
import DashboardPage from '../pages/DashboardPage';
import ChatPage from '../pages/ChatPage';
import SyllabusManagerPage from '../pages/SyllabusManagerPage';
import MetricsPage from '../pages/MetricsPage';
import ProfilePage from '../pages/ProfilePage';
import CourseListPage from '../pages/CourseListPage';
import EnrollmentPage from '../pages/EnrollmentPage';
import MyCoursesPage from '../pages/MyCoursesPage';
import AdminDashboardPage from '../pages/admin/AdminDashboardPage';
import AdminSummaryPage from '../pages/admin/AdminSummaryPage';
import CourseManagementPage from '../pages/admin/CourseManagementPage';
import PeriodManagementPage from '../pages/admin/PeriodManagementPage';
import PendingSyllabiPage from '../pages/admin/PendingSyllabiPage';
import ServiceDeskPage from '../pages/admin/ServiceDeskPage';
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

const AutoRoleRedirect = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user?.rol === 'admin') return <Navigate to="/admin" replace />;
  return children;
};

const AppRoutes = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CourseProvider>
          <ServiceDeskProvider>
            <SyllabusProvider>
              <ChatProvider>
                <Routes>
                  {/* Rutas públicas (sin layout Navbar/Footer) */}
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/register" element={<RegisterPage />} />

                  {/* Rutas protegidas (con layout Navbar/Footer) */}
                  <Route path="/" element={
                    <PrivateRoute>
                      <AutoRoleRedirect>
                        <AppLayout>
                          <DashboardPage />
                        </AppLayout>
                      </AutoRoleRedirect>
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
                  <Route path="/cursos" element={
                    <PrivateRoute>
                      <AppLayout>
                        <CourseListPage />
                      </AppLayout>
                    </PrivateRoute>
                  } />
                  <Route path="/inscripcion" element={
                    <PrivateRoute>
                      <AppLayout>
                        <EnrollmentPage />
                      </AppLayout>
                    </PrivateRoute>
                  } />
                  <Route path="/mis-cursos" element={
                    <PrivateRoute>
                      <AppLayout>
                        <MyCoursesPage />
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
                  <Route path="/admin/*" element={
                    <PrivateRoute requiredRole="admin">
                      <AdminDashboardPage />
                    </PrivateRoute>
                  }>
                    <Route index element={<AdminSummaryPage />} />
                    <Route path="cursos" element={<CourseManagementPage />} />
                    <Route path="periodos" element={<PeriodManagementPage />} />
                    <Route path="silabos/pendientes" element={<PendingSyllabiPage />} />
                    <Route path="service-desk" element={<ServiceDeskPage />} />
                  </Route>
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
          </ServiceDeskProvider>
        </CourseProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default AppRoutes;