import { useTranslation } from 'react-i18next';
import { PageHeader } from '../components/PageHeader';
import { ShellCard } from '../components/ShellCard';

// VI: Shell cai dat thuong hieu cho Sprint 2, chua upload logo hay luu cau hinh.
export function BrandingSettingsPage() {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <PageHeader kicker={t('settings.kicker')} title={t('settings.title')} description={t('settings.description')} />
      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <ShellCard>
          <h3 className="text-lg font-semibold text-neutral-950">{t('settings.brandPreviewTitle')}</h3>
          <div className="mt-5 rounded-md border border-neutral-200 bg-stone-50 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-md bg-brand-black text-sm font-bold text-white">
                {t('brand.initials')}
              </div>
              <div>
                <p className="font-semibold text-neutral-950">{t('brand.name')}</p>
                <p className="text-sm text-neutral-600">{t('brand.subtitle')}</p>
              </div>
            </div>
            <div className="mt-5 flex gap-2">
              <span className="h-8 w-16 rounded-md bg-brand-red" />
              <span className="h-8 w-16 rounded-md bg-brand-black" />
              <span className="h-8 w-16 rounded-md bg-stone-200" />
            </div>
          </div>
        </ShellCard>
        <ShellCard>
          <h3 className="text-lg font-semibold text-neutral-950">{t('settings.futureFieldsTitle')}</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <PlaceholderField label={t('settings.companyLogo')} />
            <PlaceholderField label={t('settings.headerLogo')} />
            <PlaceholderField label={t('settings.watermarkLogo')} />
            <PlaceholderField label={t('settings.copyrightText')} />
          </div>
        </ShellCard>
      </div>
    </div>
  );
}

function PlaceholderField({ label }: { label: string }) {
  const { t } = useTranslation();

  return (
    <div className="rounded-md border border-neutral-200 bg-stone-50 p-3">
      <p className="text-sm font-semibold text-neutral-800">{label}</p>
      <p className="mt-1 text-xs text-neutral-500">{t('settings.sprint4Label')}</p>
    </div>
  );
}
