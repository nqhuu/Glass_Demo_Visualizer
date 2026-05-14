import { Edit2, Plus, Trash2, X } from 'lucide-react';
import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { ShellCard } from '../components/ShellCard';
import { NumberField, TextAreaField, TextField } from './CatalogFormFields';
import type { GlassCategory } from './glass-catalog.types';

export interface CategoryFormState {
  name: string;
  slug: string;
  description: string;
  isActive: boolean;
  sortOrder: number;
}

// VI: Panel quan ly danh muc kinh de admin tao, sua va xoa danh muc trong Sprint 3.
export function CategoryPanel({
  categories,
  categoryForm,
  isSaving,
  editingCategoryId,
  onSubmit,
  onChange,
  onEdit,
  onDelete,
  onCancel,
}: {
  categories: GlassCategory[];
  categoryForm: CategoryFormState;
  isSaving: boolean;
  editingCategoryId: number | null;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onChange: (value: CategoryFormState) => void;
  onEdit: (category: GlassCategory) => void;
  onDelete: (category: GlassCategory) => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();

  return (
    <ShellCard>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-neutral-950">{t(editingCategoryId ? 'catalog.form.editCategoryTitle' : 'catalog.form.createCategoryTitle')}</h2>
          <p className="mt-1 text-sm text-neutral-600">{t('catalog.form.categoryDescription')}</p>
        </div>
        {editingCategoryId ? (
          <button className="rounded-md border border-neutral-300 p-2 text-neutral-700" type="button" onClick={onCancel} aria-label={t('catalog.actions.cancel')}>
            <X size={16} />
          </button>
        ) : null}
      </div>
      <form className="space-y-3" onSubmit={onSubmit}>
        <TextField label={t('catalog.fields.name')} value={categoryForm.name} onChange={(name) => onChange({ ...categoryForm, name })} required />
        <TextField label={t('catalog.fields.slug')} value={categoryForm.slug} onChange={(slug) => onChange({ ...categoryForm, slug })} required />
        <TextAreaField label={t('catalog.fields.description')} value={categoryForm.description} onChange={(description) => onChange({ ...categoryForm, description })} />
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm font-semibold text-neutral-800">
            <input type="checkbox" checked={categoryForm.isActive} onChange={(event) => onChange({ ...categoryForm, isActive: event.target.checked })} />
            {t('catalog.fields.isActive')}
          </label>
          <NumberField label={t('catalog.fields.sortOrder')} value={categoryForm.sortOrder} onChange={(sortOrder) => onChange({ ...categoryForm, sortOrder })} />
        </div>
        <button className="flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-brand-black px-4 py-2 text-sm font-semibold text-white" type="submit" disabled={isSaving}>
          <Plus size={16} />
          {t(isSaving ? 'catalog.actions.saving' : 'catalog.actions.saveCategory')}
        </button>
      </form>
      <div className="mt-5 space-y-2">
        {categories.map((category) => (
          <div key={category.id} className="flex items-center justify-between gap-3 rounded-md border border-neutral-200 bg-stone-50 px-3 py-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-neutral-900">{category.name}</p>
              <p className="truncate text-xs text-neutral-500">{category.slug}</p>
            </div>
            <div className="flex gap-1">
              <button className="rounded-md border border-neutral-300 p-2 text-neutral-700" type="button" onClick={() => onEdit(category)} aria-label={t('catalog.actions.edit')}>
                <Edit2 size={15} />
              </button>
              <button className="rounded-md border border-red-200 p-2 text-brand-red" type="button" onClick={() => onDelete(category)} aria-label={t('catalog.actions.delete')}>
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </ShellCard>
  );
}
