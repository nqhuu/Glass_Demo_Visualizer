import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './auth/AuthProvider';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { RequireRole } from './auth/RequireRole';
import { AppLayout } from './layouts/AppLayout';
import { AdminEntryPage } from './pages/AdminEntryPage';
import { BrandingSettingsPage } from './pages/BrandingSettingsPage';
import { DashboardPage } from './pages/DashboardPage';
import { EditorEntryPage } from './pages/EditorEntryPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { LoginPage } from './pages/LoginPage';
import { ProjectDetailPage } from './pages/ProjectDetailPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { RegisterPage } from './pages/RegisterPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';

// VI: Dinh nghia route Sprint 2 voi app shell duoc bao ve bang JWT.
export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route
          path="/app"
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/app/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="projects" element={<ProjectsPage />} />
          <Route path="projects/:projectId" element={<ProjectDetailPage />} />
          <Route path="editor" element={<EditorEntryPage />} />
          <Route path="editor/projects/:projectId/images/:imageId" element={<EditorEntryPage />} />
          <Route
            path="admin"
            element={
              <RequireRole allowedRoles={['admin']}>
                <AdminEntryPage />
              </RequireRole>
            }
          />
          <Route
            path="settings"
            element={
              <RequireRole allowedRoles={['admin']}>
                <BrandingSettingsPage />
              </RequireRole>
            }
          />
        </Route>
        <Route path="/dashboard" element={<Navigate to="/app/dashboard" replace />} />
        <Route path="/" element={<Navigate to="/app/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/app/dashboard" replace />} />
      </Routes>
    </AuthProvider>
  );
}
