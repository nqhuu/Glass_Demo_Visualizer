import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '../components/PageHeader';
import { ShellCard } from '../components/ShellCard';

// VI: Shell danh sach du an cho Sprint 2, chua co CRUD hay API du an.
export function ProjectsPage() {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <PageHeader
        kicker={t('projects.kicker')}
        title={t('projects.title')}
        description={t('projects.description')}
        action={
          <button className="min-h-11 rounded-md bg-brand-red px-4 py-2 text-sm font-semibold text-white" type="button">
            {t('projects.createPlaceholder')}
          </button>
        }
      />

      <ShellCard>
        <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-neutral-800">{t('projects.searchLabel')}</span>
            <input
              className="w-full rounded-md border border-neutral-300 px-3 py-3 text-base outline-none ring-brand-red focus:ring-2"
              disabled
              value={t('projects.searchPlaceholder')}
              readOnly
            />
          </label>
          <button className="min-h-11 rounded-md border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-800" type="button">
            {t('projects.filterPlaceholder')}
          </button>
        </div>
      </ShellCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <ProjectCard
          title={t('projects.sampleOneTitle')}
          customer={t('projects.sampleOneCustomer')}
          meta={t('projects.sampleOneMeta')}
        />
        <ProjectCard
          title={t('projects.sampleTwoTitle')}
          customer={t('projects.sampleTwoCustomer')}
          meta={t('projects.sampleTwoMeta')}
        />
      </div>
    </div>
  );
}

function ProjectCard({ title, customer, meta }: { title: string; customer: string; meta: string }) {
  const { t } = useTranslation();

  return (
    <ShellCard>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-lg font-semibold text-neutral-950">{title}</p>
          <p className="mt-1 text-sm text-neutral-600">{customer}</p>
          <p className="mt-3 text-sm text-neutral-700">{meta}</p>
        </div>
        <Link className="inline-flex min-h-11 items-center justify-center rounded-md border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-800" to="/app/projects/demo">
          {t('projects.openShell')}
        </Link>
      </div>
    </ShellCard>
  );
}
