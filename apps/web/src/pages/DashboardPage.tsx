import { ArrowRight, FolderKanban, Images, PanelsTopLeft, ShieldCheck } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../auth/use-auth';
import { PageHeader } from '../components/PageHeader';
import { ShellCard } from '../components/ShellCard';

// VI: Dashboard huong dan luong demo noi bo bang cac thao tac that, khong hien thi so lieu gia.
export function DashboardPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  return (
    <div className="space-y-6">
      <PageHeader
        kicker={t('dashboard.kicker')}
        title={t('dashboard.title', { name: user?.name ?? t('account.fallbackName') })}
        description={t(isAdmin ? 'dashboard.descriptionAdmin' : 'dashboard.descriptionUser')}
        action={
          <Link className="inline-flex min-h-11 items-center rounded-md bg-brand-red px-4 py-2 text-sm font-semibold text-white" to="/app/projects">
            {t('dashboard.primaryAction')}
          </Link>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <ShellCard>
          <h3 className="text-lg font-semibold text-neutral-950">{t('dashboard.actionsTitle')}</h3>
          <p className="mt-1 text-sm text-neutral-600">{t('dashboard.actionsDescription')}</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <ActionLink
              icon={FolderKanban}
              title={t('dashboard.actionProjectsTitle')}
              description={t('dashboard.actionProjectsDescription')}
              to="/app/projects"
            />
            <ActionLink
              icon={Images}
              title={t('dashboard.actionUploadTitle')}
              description={t('dashboard.actionUploadDescription')}
              to="/app/projects"
            />
            {isAdmin ? (
              <ActionLink
                icon={PanelsTopLeft}
                title={t('dashboard.actionCatalogTitle')}
                description={t('dashboard.actionCatalogDescription')}
                to="/app/admin"
              />
            ) : null}
            <div className="flex min-h-28 flex-col justify-between rounded-md border border-neutral-200 bg-stone-50 p-4">
              <ShieldCheck className="text-brand-red" size={21} />
              <div>
                <p className="text-sm font-semibold text-neutral-950">{t('dashboard.watermarkTitle')}</p>
                <p className="mt-1 text-xs leading-5 text-neutral-600">{t('dashboard.watermarkDescription')}</p>
              </div>
            </div>
          </div>
        </ShellCard>

        <ShellCard>
          <h3 className="text-lg font-semibold text-neutral-950">{t('dashboard.workflowTitle')}</h3>
          <p className="mt-1 text-sm text-neutral-600">{t('dashboard.workflowDescription')}</p>
          <div className="mt-4 space-y-3">
            <StepItem step="1" text={t('dashboard.workflowProject')} />
            <StepItem step="2" text={t('dashboard.workflowImage')} />
            <StepItem step="3" text={t('dashboard.workflowRegion')} />
            <StepItem step="4" text={t('dashboard.workflowGlass')} />
            <StepItem step="5" text={t('dashboard.workflowExport')} />
          </div>
        </ShellCard>
      </div>
    </div>
  );
}

function ActionLink({ icon: Icon, title, description, to }: { icon: LucideIcon; title: string; description: string; to: string }) {
  return (
    <Link className="group flex min-h-28 flex-col justify-between rounded-md border border-neutral-200 p-4 transition hover:border-red-200 hover:bg-red-50/50" to={to}>
      <div className="flex items-center justify-between">
        <Icon className="text-brand-red" size={21} />
        <ArrowRight className="text-neutral-400 transition group-hover:translate-x-0.5 group-hover:text-brand-red" size={17} />
      </div>
      <div>
        <p className="text-sm font-semibold text-neutral-950">{title}</p>
        <p className="mt-1 text-xs leading-5 text-neutral-600">{description}</p>
      </div>
    </Link>
  );
}

function StepItem({ step, text }: { step: string; text: string }) {
  return (
    <div className="flex items-center gap-3 rounded-md bg-stone-100 p-3 text-sm text-neutral-700">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-red text-xs font-semibold text-white">{step}</span>
      <span>{text}</span>
    </div>
  );
}
