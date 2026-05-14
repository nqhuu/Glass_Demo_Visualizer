import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from './use-auth';
import type { UserRole } from './auth.types';

// VI: Guard frontend cho route admin-only; an toan bo sung ngoai backend role guard.
export function RequireRole({ allowedRoles, children }: { allowedRoles: UserRole[]; children: ReactNode }) {
  const { t } = useTranslation();
  const { user } = useAuth();

  if (!user || !allowedRoles.includes(user.role)) {
    return (
      <main className="min-h-[60vh] px-4 py-8">
        <div className="mx-auto max-w-xl rounded-md border border-neutral-200 bg-white p-6 text-center shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-red">{t('forbidden.kicker')}</p>
          <h2 className="mt-3 text-2xl font-semibold text-neutral-950">{t('forbidden.title')}</h2>
          <p className="mt-3 text-sm leading-6 text-neutral-700">{t('forbidden.description')}</p>
          <Link className="mt-5 inline-flex min-h-11 items-center rounded-md bg-brand-black px-4 py-2 text-sm font-semibold text-white" to="/app/dashboard">
            {t('forbidden.backToDashboard')}
          </Link>
        </div>
      </main>
    );
  }

  return children;
}
