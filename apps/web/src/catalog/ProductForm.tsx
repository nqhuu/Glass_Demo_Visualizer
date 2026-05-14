import { Save, X } from 'lucide-react';
import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { ShellCard } from '../components/ShellCard';
import { NumberField, RangeField, SelectField, TextAreaField, TextField } from './CatalogFormFields';
import type { GlassCategory, GlassMaterialType, GlassProduct, GlassProductPayload, GlassRealismPreset } from './glass-catalog.types';

const materialTypes: GlassMaterialType[] = ['clear', 'tinted', 'reflective', 'frosted', 'patterned'];
const realismPresets: GlassRealismPreset[] = ['standard', 'balcony', 'facade', 'window', 'railing'];

// VI: Form tao/sua san pham kinh va cac thong so vat lieu chi danh cho admin.
export function ProductForm({
  productForm,
  selectedProduct,
  categories,
  isSaving,
  onSubmit,
  onCancel,
  onChange,
}: {
  productForm: GlassProductPayload;
  selectedProduct: GlassProduct | null;
  categories: GlassCategory[];
  isSaving: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
  onChange: (value: GlassProductPayload) => void;
}) {
  const { t } = useTranslation();

  return (
    <ShellCard>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-neutral-950">
            {t(selectedProduct ? 'catalog.form.editProductTitle' : 'catalog.form.createProductTitle')}
          </h2>
          <p className="mt-1 text-sm text-neutral-600">{t('catalog.form.productDescription')}</p>
        </div>
        {selectedProduct ? (
          <button className="rounded-md border border-neutral-300 p-2 text-neutral-700" type="button" onClick={onCancel} aria-label={t('catalog.actions.cancel')}>
            <X size={16} />
          </button>
        ) : null}
      </div>

      <form className="space-y-4" onSubmit={onSubmit}>
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField label={t('catalog.fields.name')} value={productForm.name} onChange={(name) => onChange({ ...productForm, name })} required />
          <TextField label={t('catalog.fields.code')} value={productForm.code} onChange={(code) => onChange({ ...productForm, code })} required />
        </div>
        <SelectField
          label={t('catalog.fields.category')}
          value={productForm.categoryId ? String(productForm.categoryId) : ''}
          onChange={(categoryId) => onChange({ ...productForm, categoryId: categoryId ? Number(categoryId) : undefined })}
        >
          <option value="">{t('catalog.noCategory')}</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </SelectField>
        <TextAreaField label={t('catalog.fields.description')} value={productForm.description ?? ''} onChange={(description) => onChange({ ...productForm, description })} />
        <div className="grid gap-3 sm:grid-cols-2">
          <SelectField label={t('catalog.fields.materialType')} value={productForm.materialType} onChange={(materialType) => onChange({ ...productForm, materialType: materialType as GlassMaterialType })}>
            {materialTypes.map((materialType) => (
              <option key={materialType} value={materialType}>
                {t(`catalog.materialTypes.${materialType}`)}
              </option>
            ))}
          </SelectField>
          <SelectField label={t('catalog.fields.realismPreset')} value={productForm.realismPreset} onChange={(realismPreset) => onChange({ ...productForm, realismPreset: realismPreset as GlassRealismPreset })}>
            {realismPresets.map((realismPreset) => (
              <option key={realismPreset} value={realismPreset}>
                {t(`catalog.realismPresets.${realismPreset}`)}
              </option>
            ))}
          </SelectField>
        </div>
        <label className="block">
          <span className="text-sm font-semibold text-neutral-800">{t('catalog.fields.baseColor')}</span>
          <input
            className="mt-1 h-11 w-full rounded-md border border-neutral-300 bg-white p-1"
            type="color"
            value={productForm.baseColor}
            onChange={(event) => onChange({ ...productForm, baseColor: event.target.value })}
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <RangeField label={t('catalog.fields.tintStrength')} value={productForm.tintStrength} onChange={(tintStrength) => onChange({ ...productForm, tintStrength })} />
          <RangeField label={t('catalog.fields.reflectivityLevel')} value={productForm.reflectivityLevel} onChange={(reflectivityLevel) => onChange({ ...productForm, reflectivityLevel })} />
          <RangeField label={t('catalog.fields.transmissionLevel')} value={productForm.transmissionLevel} onChange={(transmissionLevel) => onChange({ ...productForm, transmissionLevel })} />
          <RangeField label={t('catalog.fields.shadowLevel')} value={productForm.shadowLevel} onChange={(shadowLevel) => onChange({ ...productForm, shadowLevel })} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField label={t('catalog.fields.previewImageUrl')} value={productForm.previewImageUrl ?? ''} onChange={(previewImageUrl) => onChange({ ...productForm, previewImageUrl })} />
          <TextField label={t('catalog.fields.textureImageUrl')} value={productForm.textureImageUrl ?? ''} onChange={(textureImageUrl) => onChange({ ...productForm, textureImageUrl })} />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm font-semibold text-neutral-800">
            <input type="checkbox" checked={productForm.isActive} onChange={(event) => onChange({ ...productForm, isActive: event.target.checked })} />
            {t('catalog.fields.isActive')}
          </label>
          <NumberField label={t('catalog.fields.sortOrder')} value={productForm.sortOrder} onChange={(sortOrder) => onChange({ ...productForm, sortOrder })} />
        </div>
        <button className="flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-brand-red px-4 py-2 text-sm font-semibold text-white" type="submit" disabled={isSaving}>
          <Save size={16} />
          {t(isSaving ? 'catalog.actions.saving' : 'catalog.actions.saveProduct')}
        </button>
      </form>
    </ShellCard>
  );
}
