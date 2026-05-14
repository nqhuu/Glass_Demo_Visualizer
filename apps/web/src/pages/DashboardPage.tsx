import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../auth/use-auth';
import { PageHeader } from '../components/PageHeader';
import { ShellCard } from '../components/ShellCard';

// VI: Dashboard Sprint 2 la shell tong quan, chua lay du lieu du an that tu backend.
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

      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard label={t('dashboard.metrics.projects')} value={t('dashboard.metrics.projectsValue')} />
        <MetricCard label={t('dashboard.metrics.images')} value={t('dashboard.metrics.imagesValue')} />
        <MetricCard label={t('dashboard.metrics.exports')} value={t('dashboard.metrics.exportsValue')} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <ShellCard>
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-neutral-950">{t('dashboard.recentProjectsTitle')}</h3>
              <p className="mt-1 text-sm text-neutral-600">{t('dashboard.recentProjectsDescription')}</p>
            </div>
            <Link className="rounded-md border border-neutral-300 px-3 py-2 text-sm font-semibold text-neutral-800" to="/app/projects">
              {t('dashboard.viewProjects')}
            </Link>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <ProjectPreview title={t('dashboard.sampleProjectOne')} meta={t('dashboard.sampleProjectOneMeta')} />
            <ProjectPreview title={t('dashboard.sampleProjectTwo')} meta={t('dashboard.sampleProjectTwoMeta')} />
          </div>
        </ShellCard>

        <ShellCard>
          <h3 className="text-lg font-semibold text-neutral-950">{t('dashboard.nextStepsTitle')}</h3>
          <div className="mt-4 space-y-3">
            <StepItem text={t('dashboard.nextStepProjects')} />
            {isAdmin ? <StepItem text={t('dashboard.nextStepCatalog')} /> : null}
            <StepItem text={t('dashboard.nextStepEditor')} />
          </div>
        </ShellCard>
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <ShellCard>
      <p className="text-sm text-neutral-600">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-neutral-950">{value}</p>
    </ShellCard>
  );
}

function ProjectPreview({ title, meta }: { title: string; meta: string }) {
  return (
    <div className="rounded-md bg-stone-100 p-4">
      <p className="font-semibold text-neutral-950">{title}</p>
      <p className="mt-1 text-sm text-neutral-600">{meta}</p>
    </div>
  );
}

function StepItem({ text }: { text: string }) {
  return (
    <div className="flex gap-3 rounded-md bg-stone-100 p-3 text-sm text-neutral-700">
      <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-brand-red" />
      <span>{text}</span>
    </div>
  );
}
