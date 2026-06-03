import { History, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { listAuditLogs } from '../audit/audit-log-api';
import type { AuditLogEntry } from '../audit/audit-log.types';
import { useAuth } from '../auth/use-auth';
import { PageHeader } from '../components/PageHeader';
import { ShellCard } from '../components/ShellCard';
import { logSafeUiError } from '../utils/safe-log';

const actionKeys: Record<string, string> = {
  'auth.login.success': 'audit.actions.loginSuccess',
  'auth.login.failure': 'audit.actions.loginFailure',
  'auth.register.success': 'audit.actions.registerSuccess',
  'auth.password-reset.request': 'audit.actions.passwordResetRequest',
  'auth.password-reset.success': 'audit.actions.passwordResetSuccess',
  'project.create': 'audit.actions.projectCreate',
  'project.update': 'audit.actions.projectUpdate',
  'project.archive': 'audit.actions.projectArchive',
  'project.delete': 'audit.actions.projectDelete',
  'project-image.create': 'audit.actions.imageCreate',
  'project-image.upload': 'audit.actions.imageUpload',
  'project-image.update': 'audit.actions.imageUpdate',
  'project-image.delete': 'audit.actions.imageDelete',
  'region.create': 'audit.actions.regionCreate',
  'region.update': 'audit.actions.regionUpdate',
  'region.duplicate': 'audit.actions.regionDuplicate',
  'region.delete': 'audit.actions.regionDelete',
  'region.glass.assign': 'audit.actions.glassAssign',
  'region.glass.clear': 'audit.actions.glassClear',
  'export.create': 'audit.actions.exportCreate',
  'export.download': 'audit.actions.exportDownload',
  'catalog.category.create': 'audit.actions.categoryCreate',
  'catalog.category.update': 'audit.actions.categoryUpdate',
  'catalog.category.activate': 'audit.actions.categoryActivate',
  'catalog.category.deactivate': 'audit.actions.categoryDeactivate',
  'catalog.category.reactivate': 'audit.actions.categoryReactivate',
  'catalog.category.archive': 'audit.actions.categoryArchive',
  'catalog.category.restore': 'audit.actions.categoryRestore',
  'catalog.category.delete': 'audit.actions.categoryDelete',
  'catalog.product.create': 'audit.actions.productCreate',
  'catalog.product.update': 'audit.actions.productUpdate',
  'catalog.product.activate': 'audit.actions.productActivate',
  'catalog.product.deactivate': 'audit.actions.productDeactivate',
  'catalog.product.reactivate': 'audit.actions.productReactivate',
  'catalog.product.archive': 'audit.actions.productArchive',
  'catalog.product.restore': 'audit.actions.productRestore',
  'catalog.material-type.create': 'audit.actions.materialTypeCreate',
  'catalog.material-type.update': 'audit.actions.materialTypeUpdate',
  'catalog.material-type.deactivate': 'audit.actions.materialTypeDeactivate',
  'catalog.material-type.reactivate': 'audit.actions.materialTypeReactivate',
  'catalog.material-type.archive': 'audit.actions.materialTypeArchive',
  'catalog.material-type.restore': 'audit.actions.materialTypeRestore',
  'catalog.render-preset.create': 'audit.actions.renderPresetCreate',
  'catalog.render-preset.update': 'audit.actions.renderPresetUpdate',
  'catalog.render-preset.deactivate': 'audit.actions.renderPresetDeactivate',
  'catalog.render-preset.reactivate': 'audit.actions.renderPresetReactivate',
  'catalog.render-preset.archive': 'audit.actions.renderPresetArchive',
  'catalog.render-preset.restore': 'audit.actions.renderPresetRestore',
  'region.render-preset.update': 'audit.actions.regionRenderPresetUpdate',
};

const entityKeys: Record<string, string> = {
  auth: 'audit.entities.auth',
  user: 'audit.entities.user',
  project: 'audit.entities.project',
  project_image: 'audit.entities.projectImage',
  glass_region: 'audit.entities.region',
  project_export: 'audit.entities.export',
  glass_category: 'audit.entities.category',
  glass_product: 'audit.entities.product',
  glass_material_type: 'audit.entities.materialType',
  glass_render_preset: 'audit.entities.renderPreset',
};

// VI: Trang audit admin hien dau vet thao tac da rut gon, khong hien metadata nhay cam.
export function AuditLogsPage() {
  const { t, i18n } = useTranslation();
  const { accessToken } = useAuth();
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const loadEntries = async () => {
    if (!accessToken) {
      return;
    }

    try {
      setIsLoading(true);
      setHasError(false);
      setEntries(await listAuditLogs(accessToken));
    } catch (error) {
      logSafeUiError('AuditLogsPage', 'loadEntries', 'Failed to load audit history', error);
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadEntries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  return (
    <div className="space-y-6">
      <PageHeader kicker={t('audit.kicker')} title={t('audit.title')} description={t('audit.description')} />

      <ShellCard>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-neutral-800">
            <History size={18} className="text-brand-red" />
            {t('audit.recent')}
          </div>
          <button
            className="inline-flex min-h-10 items-center gap-2 rounded-md border border-neutral-300 px-3 py-2 text-sm font-semibold text-neutral-800"
            type="button"
            onClick={() => void loadEntries()}
          >
            <RefreshCw size={15} />
            {t('common.retry')}
          </button>
        </div>

        {isLoading ? <p className="text-sm text-neutral-600">{t('audit.loading')}</p> : null}
        {hasError ? <p className="rounded-md bg-red-50 p-3 text-sm font-semibold text-red-800">{t('audit.loadFailed')}</p> : null}
        {!isLoading && !hasError && entries.length === 0 ? <p className="text-sm text-neutral-600">{t('audit.empty')}</p> : null}

        {!isLoading && !hasError && entries.length > 0 ? (
          <div className="grid gap-3">
            {entries.map((entry) => (
              <article key={entry.id} className="grid gap-2 rounded-md border border-neutral-200 p-3 sm:grid-cols-[180px_1fr_auto] sm:items-center">
                <time className="text-xs font-semibold text-neutral-500">{new Date(entry.createdAt).toLocaleString(i18n.language)}</time>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-neutral-950">{t(actionKeys[entry.action] ?? 'audit.actions.other')}</p>
                  <p className="text-xs text-neutral-600">
                    {t(entityKeys[entry.entityType] ?? 'audit.entities.other')}
                    {entry.entityId ? ` #${entry.entityId}` : ''} | {entry.actorUserId ? t('audit.actor', { id: entry.actorUserId }) : t('audit.systemActor')}
                  </p>
                </div>
                <span className={`w-fit rounded-md px-2 py-1 text-xs font-semibold ${entry.status === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                  {t(`audit.status.${entry.status}`)}
                </span>
              </article>
            ))}
          </div>
        ) : null}
      </ShellCard>
    </div>
  );
}
