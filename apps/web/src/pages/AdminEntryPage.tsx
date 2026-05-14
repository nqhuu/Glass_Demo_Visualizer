import { useTranslation } from 'react-i18next';
import { PageHeader } from '../components/PageHeader';
import { ShellCard } from '../components/ShellCard';

// VI: Entry shell admin/catalog cho Sprint 2, CRUD that se duoc lam tu Sprint 3.
export function AdminEntryPage() {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <PageHeader kicker={t('adminEntry.kicker')} title={t('adminEntry.title')} description={t('adminEntry.description')} />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <AdminShellCard title={t('adminEntry.catalogTitle')} description={t('adminEntry.catalogDescription')} />
        <AdminShellCard title={t('adminEntry.templatesTitle')} description={t('adminEntry.templatesDescription')} />
        <AdminShellCard title={t('adminEntry.appearanceTitle')} description={t('adminEntry.appearanceDescription')} />
      </div>
    </div>
  );
}

function AdminShellCard({ title, description }: { title: string; description: string }) {
  return (
    <ShellCard>
      <p className="text-lg font-semibold text-neutral-950">{title}</p>
      <p className="mt-2 text-sm leading-6 text-neutral-600">{description}</p>
    </ShellCard>
  );
}
