import { Edit2, Power, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ShellCard } from '../components/ShellCard';
import { GlassPreview } from './GlassPreview';
import type { GlassProduct } from './glass-catalog.types';

// VI: Card san pham kinh hien thi preview vat lieu va cac thao tac admin co ban.
export function ProductCard({
  product,
  onEdit,
  onToggleActive,
  onDelete,
}: {
  product: GlassProduct;
  onEdit: () => void;
  onToggleActive: () => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation();

  return (
    <ShellCard>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold text-neutral-950">{product.name}</p>
          <p className="text-sm font-semibold text-brand-red">{product.code}</p>
        </div>
        <span className={`rounded-md px-2 py-1 text-xs font-semibold ${product.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-neutral-100 text-neutral-500'}`}>
          {t(product.isActive ? 'catalog.status.active' : 'catalog.status.inactive')}
        </span>
      </div>
      <GlassPreview product={product} />
      <div className="mt-4 grid grid-cols-2 gap-2 text-sm text-neutral-600">
        <MetaLabel label={t('catalog.fields.category')} value={product.category?.name ?? t('catalog.noCategory')} />
        <MetaLabel label={t('catalog.fields.materialType')} value={t(`catalog.materialTypes.${product.materialType}`)} />
        <MetaLabel label={t('catalog.fields.realismPreset')} value={t(`catalog.realismPresets.${product.realismPreset}`)} />
        <MetaLabel label={t('catalog.fields.sortOrder')} value={String(product.sortOrder)} />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <ActionButton icon={<Edit2 size={16} />} label={t('catalog.actions.edit')} onClick={onEdit} />
        <ActionButton icon={<Power size={16} />} label={t(product.isActive ? 'catalog.actions.deactivate' : 'catalog.actions.activate')} onClick={onToggleActive} />
        <ActionButton icon={<Trash2 size={16} />} label={t('catalog.actions.delete')} onClick={onDelete} danger />
      </div>
    </ShellCard>
  );
}

function MetaLabel({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">{label}</p>
      <p className="mt-1 font-semibold text-neutral-800">{value}</p>
    </div>
  );
}

function ActionButton({ icon, label, onClick, danger = false }: { icon: ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      className={`flex min-h-10 items-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold ${
        danger ? 'border-red-200 text-brand-red' : 'border-neutral-300 text-neutral-800'
      }`}
      type="button"
      onClick={onClick}
    >
      {icon}
      {label}
    </button>
  );
}
