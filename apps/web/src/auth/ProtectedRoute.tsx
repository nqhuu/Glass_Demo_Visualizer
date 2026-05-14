import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from './use-auth';

// VI: Chan route frontend neu JWT chua duoc xac nhan bang /auth/me.
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const { status } = useAuth();

  if (status === 'loading') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-stone-50 px-4 text-sm text-neutral-700">
        {t('auth.loadingSession')}
      </main>
    );
  }

  if (status !== 'authenticated') {
    return <Navigate to="/login" replace />;
  }

  return children;
}
