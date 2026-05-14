import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '../components/PageHeader';
import { ShellCard } from '../components/ShellCard';

// VI: Shell chi tiet du an, chi mo phong gallery/entry point cho Sprint 2.
export function ProjectDetailPage() {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <PageHeader kicker={t('projectDetail.kicker')} title={t('projectDetail.title')} description={t('projectDetail.description')} />

      <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
        <ShellCard>
          <h3 className="text-lg font-semibold text-neutral-950">{t('projectDetail.infoTitle')}</h3>
          <dl className="mt-4 space-y-3 text-sm">
            <InfoRow label={t('projectDetail.customerLabel')} value={t('projectDetail.customerValue')} />
            <InfoRow label={t('projectDetail.statusLabel')} value={t('projectDetail.statusValue')} />
            <InfoRow label={t('projectDetail.noteLabel')} value={t('projectDetail.noteValue')} />
          </dl>
        </ShellCard>

        <ShellCard>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-neutral-950">{t('projectDetail.imagesTitle')}</h3>
              <p className="text-sm text-neutral-600">{t('projectDetail.imagesDescription')}</p>
            </div>
            <button className="min-h-11 rounded-md bg-brand-red px-4 py-2 text-sm font-semibold text-white" type="button">
              {t('projectDetail.addImagePlaceholder')}
            </button>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <ImageShell title={t('projectDetail.imageOneTitle')} meta={t('projectDetail.imageOneMeta')} />
            <ImageShell title={t('projectDetail.imageTwoTitle')} meta={t('projectDetail.imageTwoMeta')} />
          </div>
        </ShellCard>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-semibold text-neutral-800">{label}</dt>
      <dd className="mt-1 text-neutral-600">{value}</dd>
    </div>
  );
}

function ImageShell({ title, meta }: { title: string; meta: string }) {
  const { t } = useTranslation();

  return (
    <div className="rounded-md border border-neutral-200 bg-stone-50 p-3">
      <div className="aspect-[4/3] rounded-md bg-gradient-to-br from-neutral-200 to-neutral-100" />
      <p className="mt-3 font-semibold text-neutral-950">{title}</p>
      <p className="mt-1 text-sm text-neutral-600">{meta}</p>
      <Link className="mt-3 inline-flex min-h-10 items-center rounded-md border border-neutral-300 px-3 py-2 text-sm font-semibold text-neutral-800" to="/app/editor">
        {t('projectDetail.openEditorShell')}
      </Link>
    </div>
  );
}
