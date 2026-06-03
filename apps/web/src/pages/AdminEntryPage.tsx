import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../auth/use-auth';
import {
  createAdminGlassCategory,
  createAdminGlassMaterialType,
  createAdminGlassProduct,
  createAdminGlassRenderPreset,
  deleteAdminGlassCategory,
  deleteAdminGlassMaterialType,
  deleteAdminGlassProduct,
  deleteAdminGlassRenderPreset,
  listAdminGlassCategories,
  listAdminGlassMaterialTypes,
  listAdminGlassProducts,
  listAdminGlassRenderPresets,
  updateAdminGlassCategory,
  updateAdminGlassMaterialType,
  updateAdminGlassProduct,
  updateAdminGlassRenderPreset,
} from '../catalog/glass-catalog-api';
import { CategoryPanel, type CategoryFormState } from '../catalog/CategoryPanel';
import { ProductCard } from '../catalog/ProductCard';
import { ProductForm } from '../catalog/ProductForm';
import type { GlassCategory, GlassMaterialTypeConfig, GlassProduct, GlassProductPayload, GlassRenderPreset } from '../catalog/glass-catalog.types';
import { PageHeader } from '../components/PageHeader';
import { ShellCard } from '../components/ShellCard';
import { SelectField, TextField } from '../catalog/CatalogFormFields';
import { logSafeUiError } from '../utils/safe-log';

const emptyProductForm: GlassProductPayload = {
  name: '',
  code: '',
  description: '',
  materialType: 'clear',
  materialTypeId: null,
  baseColor: '#dbeafe',
  tintStrength: 0.25,
  reflectivityLevel: 0.35,
  transmissionLevel: 0.65,
  shadowLevel: 0.2,
  realismPreset: 'standard',
  renderPresetId: null,
  previewImageUrl: '',
  textureImageUrl: '',
  isActive: true,
  isArchived: false,
  sortOrder: 0,
};

const emptyCategoryForm: CategoryFormState = {
  name: '',
  slug: '',
  description: '',
  isActive: true,
  isArchived: false,
  sortOrder: 0,
};

const emptyMaterialTypeForm: Omit<GlassMaterialTypeConfig, 'id'> = {
  name: '',
  code: '',
  description: '',
  isActive: true,
  isArchived: false,
  sortOrder: 0,
};

const emptyRenderPresetForm: Omit<GlassRenderPreset, 'id'> = {
  name: '',
  code: '',
  description: '',
  defaultTintPercent: 25,
  defaultReflectivityPercent: 35,
  defaultTransmissionPercent: 65,
  defaultShadowPercent: 20,
  isActive: true,
  isArchived: false,
  sortOrder: 0,
};

type CatalogLifecycleFilter = 'active' | 'inactive' | 'archived';

// VI: Trang admin catalog quan ly mau kinh va profile render dinh san cho luong demo noi bo.
export function AdminEntryPage() {
  const { t } = useTranslation();
  const { accessToken } = useAuth();
  const [categories, setCategories] = useState<GlassCategory[]>([]);
  const [products, setProducts] = useState<GlassProduct[]>([]);
  const [materialTypes, setMaterialTypes] = useState<GlassMaterialTypeConfig[]>([]);
  const [renderPresets, setRenderPresets] = useState<GlassRenderPreset[]>([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [lifecycleFilter, setLifecycleFilter] = useState<CatalogLifecycleFilter>('active');
  const [productForm, setProductForm] = useState<GlassProductPayload>(emptyProductForm);
  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const [categoryForm, setCategoryForm] = useState<CategoryFormState>(emptyCategoryForm);
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
  const [materialTypeForm, setMaterialTypeForm] = useState<Omit<GlassMaterialTypeConfig, 'id'>>(emptyMaterialTypeForm);
  const [editingMaterialTypeId, setEditingMaterialTypeId] = useState<number | null>(null);
  const [renderPresetForm, setRenderPresetForm] = useState<Omit<GlassRenderPreset, 'id'>>(emptyRenderPresetForm);
  const [editingRenderPresetId, setEditingRenderPresetId] = useState<number | null>(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const selectedProduct = useMemo(
    () => products.find((product) => product.id === editingProductId) ?? null,
    [editingProductId, products],
  );
  const assignableMaterialTypes = useMemo(
    () => materialTypes.filter((materialType) => materialType.isActive && !materialType.isArchived),
    [materialTypes],
  );
  const assignableRenderPresets = useMemo(
    () => renderPresets.filter((renderPreset) => renderPreset.isActive && !renderPreset.isArchived),
    [renderPresets],
  );

  const loadCatalog = async () => {
    if (!accessToken) {
      return;
    }

    setIsLoading(true);
    try {
      const query = {
        search: search.trim() || undefined,
        categoryId: categoryFilter ? Number(categoryFilter) : undefined,
        isActive: lifecycleFilter === 'active' ? true : lifecycleFilter === 'inactive' ? false : undefined,
        isArchived: lifecycleFilter === 'archived',
      };
      const [loadedCategories, loadedProducts, loadedMaterialTypes, loadedRenderPresets] = await Promise.all([
        listAdminGlassCategories(accessToken),
        listAdminGlassProducts(accessToken, query),
        listAdminGlassMaterialTypes(accessToken),
        listAdminGlassRenderPresets(accessToken),
      ]);
      setCategories(loadedCategories);
      setProducts(loadedProducts);
      setMaterialTypes(loadedMaterialTypes);
      setRenderPresets(loadedRenderPresets);
    } catch (error) {
      // VI: Hien thong bao ngan gon, log ngu canh an toan va khong in token.
      logSafeUiError('AdminEntryPage', 'loadCatalog', 'Failed to load glass catalog', error);
      setStatusMessage(t('catalog.messages.loadFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadCatalog();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, search, categoryFilter, lifecycleFilter]);

  const resetProductForm = () => {
    setEditingProductId(null);
    setProductForm(emptyProductForm);
  };

  const resetCategoryForm = () => {
    setEditingCategoryId(null);
    setCategoryForm(emptyCategoryForm);
  };

  const resetMaterialTypeForm = () => {
    setEditingMaterialTypeId(null);
    setMaterialTypeForm(emptyMaterialTypeForm);
  };

  const resetRenderPresetForm = () => {
    setEditingRenderPresetId(null);
    setRenderPresetForm(emptyRenderPresetForm);
  };

  const saveProduct = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!accessToken) {
      return;
    }

    setIsSaving(true);
    setStatusMessage('');

    try {
      const payload = normalizeProductPayload(productForm, editingProductId !== null);

      if (editingProductId) {
        await updateAdminGlassProduct(accessToken, editingProductId, payload);
        setStatusMessage(t('catalog.messages.productUpdated'));
      } else {
        await createAdminGlassProduct(accessToken, payload);
        setStatusMessage(t('catalog.messages.productCreated'));
      }

      resetProductForm();
      await loadCatalog();
    } catch (error) {
      logSafeUiError('AdminEntryPage', 'saveProduct', 'Failed to save glass product', error, { productId: editingProductId ?? undefined });
      setStatusMessage(t('catalog.messages.productSaveFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  const saveCategory = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!accessToken) {
      return;
    }

    setIsSaving(true);
    setStatusMessage('');

    try {
      const payload = {
        ...categoryForm,
        description: categoryForm.description.trim(),
        slug: categoryForm.slug.trim(),
      };

      if (editingCategoryId) {
        await updateAdminGlassCategory(accessToken, editingCategoryId, payload);
        setStatusMessage(t('catalog.messages.categoryUpdated'));
      } else {
        await createAdminGlassCategory(accessToken, payload);
        setStatusMessage(t('catalog.messages.categoryCreated'));
      }

      resetCategoryForm();
      await loadCatalog();
    } catch (error) {
      logSafeUiError('AdminEntryPage', 'saveCategory', 'Failed to save glass category', error, { categoryId: editingCategoryId ?? undefined });
      setStatusMessage(t('catalog.messages.categorySaveFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  const saveMaterialType = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!accessToken) {
      return;
    }

    setIsSaving(true);
    try {
      const payload = { ...materialTypeForm, name: materialTypeForm.name.trim(), code: materialTypeForm.code.trim(), description: materialTypeForm.description?.trim() || null };
      if (editingMaterialTypeId) {
        await updateAdminGlassMaterialType(accessToken, editingMaterialTypeId, payload);
      } else {
        await createAdminGlassMaterialType(accessToken, payload);
      }
      resetMaterialTypeForm();
      setStatusMessage(t('catalog.messages.configSaved'));
      await loadCatalog();
    } catch (error) {
      logSafeUiError('AdminEntryPage', 'saveMaterialType', 'Failed to save material type', error, { materialTypeId: editingMaterialTypeId ?? undefined });
      setStatusMessage(t('catalog.messages.configSaveFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  const saveRenderPreset = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!accessToken) {
      return;
    }

    setIsSaving(true);
    try {
      const payload = { ...renderPresetForm, name: renderPresetForm.name.trim(), code: renderPresetForm.code.trim(), description: renderPresetForm.description?.trim() || null };
      if (editingRenderPresetId) {
        await updateAdminGlassRenderPreset(accessToken, editingRenderPresetId, payload);
      } else {
        await createAdminGlassRenderPreset(accessToken, payload);
      }
      resetRenderPresetForm();
      setStatusMessage(t('catalog.messages.configSaved'));
      await loadCatalog();
    } catch (error) {
      logSafeUiError('AdminEntryPage', 'saveRenderPreset', 'Failed to save render preset', error, { renderPresetId: editingRenderPresetId ?? undefined });
      setStatusMessage(t('catalog.messages.configSaveFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  const startEditProduct = (product: GlassProduct) => {
    setEditingProductId(product.id);
    setProductForm({
      name: product.name,
      code: product.code,
      description: product.description ?? '',
      categoryId: product.categoryId ?? undefined,
      materialType: product.materialType,
      materialTypeId: product.materialTypeId ?? null,
      baseColor: product.baseColor,
      tintStrength: product.tintStrength,
      reflectivityLevel: product.reflectivityLevel,
      transmissionLevel: product.transmissionLevel,
      shadowLevel: product.shadowLevel,
      realismPreset: product.realismPreset,
      renderPresetId: product.renderPresetId ?? null,
      previewImageUrl: product.previewImageUrl ?? '',
      textureImageUrl: product.textureImageUrl ?? '',
      isActive: product.isActive,
      isArchived: product.isArchived,
      sortOrder: product.sortOrder,
    });
  };

  const startEditCategory = (category: GlassCategory) => {
    setEditingCategoryId(category.id);
    setCategoryForm({
      name: category.name,
      slug: category.slug,
      description: category.description ?? '',
      isActive: category.isActive,
      isArchived: category.isArchived,
      sortOrder: category.sortOrder,
    });
  };

  const startEditMaterialType = (materialType: GlassMaterialTypeConfig) => {
    setEditingMaterialTypeId(materialType.id);
    setMaterialTypeForm({
      name: materialType.name,
      code: materialType.code,
      description: materialType.description ?? '',
      isActive: materialType.isActive,
      isArchived: materialType.isArchived,
      sortOrder: materialType.sortOrder,
    });
  };

  const startEditRenderPreset = (renderPreset: GlassRenderPreset) => {
    setEditingRenderPresetId(renderPreset.id);
    setRenderPresetForm({
      name: renderPreset.name,
      code: renderPreset.code,
      description: renderPreset.description ?? '',
      defaultTintPercent: renderPreset.defaultTintPercent,
      defaultReflectivityPercent: renderPreset.defaultReflectivityPercent,
      defaultTransmissionPercent: renderPreset.defaultTransmissionPercent,
      defaultShadowPercent: renderPreset.defaultShadowPercent,
      isActive: renderPreset.isActive,
      isArchived: renderPreset.isArchived,
      sortOrder: renderPreset.sortOrder,
    });
  };

  const toggleProductActive = async (product: GlassProduct) => {
    if (!accessToken) {
      return;
    }

    try {
      await updateAdminGlassProduct(accessToken, product.id, { isActive: !product.isActive });
      await loadCatalog();
    } catch (error) {
      logSafeUiError('AdminEntryPage', 'toggleProductActive', 'Failed to update product active status', error, { productId: product.id });
      setStatusMessage(t('catalog.messages.statusFailed'));
    }
  };

  const restoreProduct = async (product: GlassProduct) => {
    if (!accessToken) {
      return;
    }

    try {
      await updateAdminGlassProduct(accessToken, product.id, { isArchived: false });
      setStatusMessage(t('catalog.messages.productRestored'));
      await loadCatalog();
    } catch (error) {
      logSafeUiError('AdminEntryPage', 'restoreProduct', 'Failed to restore glass product', error, { productId: product.id });
      setStatusMessage(t('catalog.messages.productRestoreFailed'));
    }
  };

  const confirmDeleteProduct = async (product: GlassProduct) => {
    if (!accessToken || !window.confirm(t('catalog.confirmDeleteProduct', { name: product.name }))) {
      return;
    }

    try {
      await deleteAdminGlassProduct(accessToken, product.id);
      await loadCatalog();
      setStatusMessage(t('catalog.messages.productArchived'));
    } catch (error) {
      logSafeUiError('AdminEntryPage', 'confirmDeleteProduct', 'Failed to delete glass product', error, { productId: product.id });
      setStatusMessage(t('catalog.messages.productDeleteFailed'));
    }
  };

  const toggleCategoryActive = async (category: GlassCategory) => {
    if (!accessToken) {
      return;
    }

    try {
      await updateAdminGlassCategory(accessToken, category.id, { isActive: !category.isActive });
      await loadCatalog();
    } catch (error) {
      logSafeUiError('AdminEntryPage', 'toggleCategoryActive', 'Failed to update category active status', error, { categoryId: category.id });
      setStatusMessage(t('catalog.messages.statusFailed'));
    }
  };

  const restoreCategory = async (category: GlassCategory) => {
    if (!accessToken) {
      return;
    }

    try {
      await updateAdminGlassCategory(accessToken, category.id, { isArchived: false });
      setStatusMessage(t('catalog.messages.categoryRestored'));
      await loadCatalog();
    } catch (error) {
      logSafeUiError('AdminEntryPage', 'restoreCategory', 'Failed to restore glass category', error, { categoryId: category.id });
      setStatusMessage(t('catalog.messages.categoryRestoreFailed'));
    }
  };

  const confirmDeleteCategory = async (category: GlassCategory) => {
    if (!accessToken || !window.confirm(t('catalog.confirmDeleteCategory', { name: category.name }))) {
      return;
    }

    try {
      await deleteAdminGlassCategory(accessToken, category.id);
      await loadCatalog();
      setStatusMessage(t('catalog.messages.categoryArchived'));
    } catch (error) {
      logSafeUiError('AdminEntryPage', 'confirmDeleteCategory', 'Failed to delete glass category', error, { categoryId: category.id });
      setStatusMessage(t('catalog.messages.categoryDeleteFailed'));
    }
  };

  const archiveMaterialType = async (materialType: GlassMaterialTypeConfig) => {
    if (!accessToken) {
      return;
    }
    try {
      await deleteAdminGlassMaterialType(accessToken, materialType.id);
      await loadCatalog();
      setStatusMessage(t('catalog.messages.configArchived'));
    } catch (error) {
      logSafeUiError('AdminEntryPage', 'archiveMaterialType', 'Failed to archive material type', error, { materialTypeId: materialType.id });
      setStatusMessage(t('catalog.messages.configSaveFailed'));
    }
  };

  const archiveRenderPreset = async (renderPreset: GlassRenderPreset) => {
    if (!accessToken) {
      return;
    }
    try {
      await deleteAdminGlassRenderPreset(accessToken, renderPreset.id);
      await loadCatalog();
      setStatusMessage(t('catalog.messages.configArchived'));
    } catch (error) {
      logSafeUiError('AdminEntryPage', 'archiveRenderPreset', 'Failed to archive render preset', error, { renderPresetId: renderPreset.id });
      setStatusMessage(t('catalog.messages.configSaveFailed'));
    }
  };

  const toggleMaterialTypeActive = async (materialType: GlassMaterialTypeConfig) => {
    if (!accessToken) {
      return;
    }
    try {
      await updateAdminGlassMaterialType(accessToken, materialType.id, { isActive: !materialType.isActive });
      await loadCatalog();
      setStatusMessage(t('catalog.messages.configStatusUpdated'));
    } catch (error) {
      logSafeUiError('AdminEntryPage', 'toggleMaterialTypeActive', 'Failed to update material type status', error, { materialTypeId: materialType.id });
      setStatusMessage(t('catalog.messages.configStatusFailed'));
    }
  };

  const restoreMaterialType = async (materialType: GlassMaterialTypeConfig) => {
    if (!accessToken) {
      return;
    }
    try {
      await updateAdminGlassMaterialType(accessToken, materialType.id, { isArchived: false, isActive: true });
      await loadCatalog();
      setStatusMessage(t('catalog.messages.configRestored'));
    } catch (error) {
      logSafeUiError('AdminEntryPage', 'restoreMaterialType', 'Failed to restore material type', error, { materialTypeId: materialType.id });
      setStatusMessage(t('catalog.messages.configRestoreFailed'));
    }
  };

  const toggleRenderPresetActive = async (renderPreset: GlassRenderPreset) => {
    if (!accessToken) {
      return;
    }
    try {
      await updateAdminGlassRenderPreset(accessToken, renderPreset.id, { isActive: !renderPreset.isActive });
      await loadCatalog();
      setStatusMessage(t('catalog.messages.configStatusUpdated'));
    } catch (error) {
      logSafeUiError('AdminEntryPage', 'toggleRenderPresetActive', 'Failed to update render preset status', error, { renderPresetId: renderPreset.id });
      setStatusMessage(t('catalog.messages.configStatusFailed'));
    }
  };

  const restoreRenderPreset = async (renderPreset: GlassRenderPreset) => {
    if (!accessToken) {
      return;
    }
    try {
      await updateAdminGlassRenderPreset(accessToken, renderPreset.id, { isArchived: false, isActive: true });
      await loadCatalog();
      setStatusMessage(t('catalog.messages.configRestored'));
    } catch (error) {
      logSafeUiError('AdminEntryPage', 'restoreRenderPreset', 'Failed to restore render preset', error, { renderPresetId: renderPreset.id });
      setStatusMessage(t('catalog.messages.configRestoreFailed'));
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader kicker={t('adminEntry.kicker')} title={t('adminEntry.title')} description={t('adminEntry.description')} />

      {statusMessage ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-brand-red">{statusMessage}</div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
        <section className="space-y-5">
          <ShellCard>
            <div className="mb-4 grid grid-cols-3 gap-2 rounded-md bg-neutral-100 p-1 text-sm font-semibold">
              {(['active', 'inactive', 'archived'] as CatalogLifecycleFilter[]).map((status) => (
                <button
                  key={status}
                  className={`min-h-10 rounded-md px-3 py-2 ${lifecycleFilter === status ? 'bg-white text-brand-red shadow-sm' : 'text-neutral-600'}`}
                  type="button"
                  onClick={() => setLifecycleFilter(status)}
                >
                  {t(`catalog.lifecycle.${status}`)}
                </button>
              ))}
            </div>
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
              <TextField label={t('catalog.filters.search')} value={search} onChange={setSearch} placeholder={t('catalog.filters.searchPlaceholder')} />
              <SelectField label={t('catalog.fields.category')} value={categoryFilter} onChange={setCategoryFilter}>
                <option value="">{t('catalog.filters.allCategories')}</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </SelectField>
            </div>
          </ShellCard>

          <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onEdit={() => startEditProduct(product)}
                onToggleActive={() => void toggleProductActive(product)}
                onArchive={() => void confirmDeleteProduct(product)}
                onRestore={() => void restoreProduct(product)}
              />
            ))}
          </div>

          {isLoading ? (
            <ShellCard>
              <p className="text-sm font-semibold text-neutral-700">{t('catalog.messages.loading')}</p>
            </ShellCard>
          ) : null}

          {!isLoading && products.length === 0 ? (
            <ShellCard>
              <p className="text-sm font-semibold text-neutral-700">{t('catalog.emptyProducts')}</p>
            </ShellCard>
          ) : null}
        </section>

        <aside className="space-y-5">
          <ProductForm
            productForm={productForm}
            selectedProduct={selectedProduct}
            categories={categories}
            materialTypeConfigs={assignableMaterialTypes}
            renderPresets={assignableRenderPresets}
            isSaving={isSaving}
            onSubmit={saveProduct}
            onCancel={resetProductForm}
            onChange={setProductForm}
          />
          <CategoryPanel
            categories={categories}
            categoryForm={categoryForm}
            isSaving={isSaving}
            editingCategoryId={editingCategoryId}
            onSubmit={saveCategory}
            onChange={setCategoryForm}
            onEdit={startEditCategory}
            onToggleActive={(category) => void toggleCategoryActive(category)}
            onDelete={(category) => void confirmDeleteCategory(category)}
            onRestore={(category) => void restoreCategory(category)}
            onCancel={resetCategoryForm}
          />
          <CatalogConfigPanel
            materialTypes={materialTypes}
            renderPresets={renderPresets}
            materialTypeForm={materialTypeForm}
            renderPresetForm={renderPresetForm}
            editingMaterialTypeId={editingMaterialTypeId}
            editingRenderPresetId={editingRenderPresetId}
            isSaving={isSaving}
            onMaterialTypeChange={setMaterialTypeForm}
            onRenderPresetChange={setRenderPresetForm}
            onSaveMaterialType={saveMaterialType}
            onSaveRenderPreset={saveRenderPreset}
            onEditMaterialType={startEditMaterialType}
            onEditRenderPreset={startEditRenderPreset}
            onToggleMaterialTypeActive={(materialType) => void toggleMaterialTypeActive(materialType)}
            onToggleRenderPresetActive={(renderPreset) => void toggleRenderPresetActive(renderPreset)}
            onRestoreMaterialType={(materialType) => void restoreMaterialType(materialType)}
            onRestoreRenderPreset={(renderPreset) => void restoreRenderPreset(renderPreset)}
            onArchiveMaterialType={(materialType) => void archiveMaterialType(materialType)}
            onArchiveRenderPreset={(renderPreset) => void archiveRenderPreset(renderPreset)}
            onCancelMaterialType={resetMaterialTypeForm}
            onCancelRenderPreset={resetRenderPresetForm}
          />
        </aside>
      </div>
    </div>
  );
}

function normalizeProductPayload(productForm: GlassProductPayload, isEditing: boolean): GlassProductPayload {
  // VI: Khi sua, chuoi URL rong gui null de xoa asset; khi tao, bo trong de backend luu null mac dinh.
  const payload: GlassProductPayload = {
    ...productForm,
    categoryId: productForm.categoryId ?? null,
    description: productForm.description?.trim() || undefined,
    tintStrength: toPercentInteger(productForm.tintStrength),
    reflectivityLevel: toPercentInteger(productForm.reflectivityLevel),
    transmissionLevel: toPercentInteger(productForm.transmissionLevel),
    shadowLevel: toPercentInteger(productForm.shadowLevel),
    previewImageUrl: normalizeMediaUrlField(productForm.previewImageUrl, isEditing),
    textureImageUrl: normalizeMediaUrlField(productForm.textureImageUrl, isEditing),
  };

  return payload;
}

function toPercentInteger(value: number): number {
  // VI: UI giu ratio 0-1 de preview, API luu bang percent nguyen 0-100 theo yeu cau admin.
  return Math.min(100, Math.max(0, Math.round(value * 100)));
}

function normalizeMediaUrlField(value: string | null | undefined, isEditing: boolean): string | null | undefined {
  const trimmedValue = typeof value === 'string' ? value.trim() : '';
  return trimmedValue || (isEditing ? null : undefined);
}

function CatalogConfigPanel({
  materialTypes,
  renderPresets,
  materialTypeForm,
  renderPresetForm,
  editingMaterialTypeId,
  editingRenderPresetId,
  isSaving,
  onMaterialTypeChange,
  onRenderPresetChange,
  onSaveMaterialType,
  onSaveRenderPreset,
  onEditMaterialType,
  onEditRenderPreset,
  onToggleMaterialTypeActive,
  onToggleRenderPresetActive,
  onRestoreMaterialType,
  onRestoreRenderPreset,
  onArchiveMaterialType,
  onArchiveRenderPreset,
  onCancelMaterialType,
  onCancelRenderPreset,
}: {
  materialTypes: GlassMaterialTypeConfig[];
  renderPresets: GlassRenderPreset[];
  materialTypeForm: Omit<GlassMaterialTypeConfig, 'id'>;
  renderPresetForm: Omit<GlassRenderPreset, 'id'>;
  editingMaterialTypeId: number | null;
  editingRenderPresetId: number | null;
  isSaving: boolean;
  onMaterialTypeChange: (value: Omit<GlassMaterialTypeConfig, 'id'>) => void;
  onRenderPresetChange: (value: Omit<GlassRenderPreset, 'id'>) => void;
  onSaveMaterialType: (event: FormEvent<HTMLFormElement>) => void;
  onSaveRenderPreset: (event: FormEvent<HTMLFormElement>) => void;
  onEditMaterialType: (value: GlassMaterialTypeConfig) => void;
  onEditRenderPreset: (value: GlassRenderPreset) => void;
  onToggleMaterialTypeActive: (value: GlassMaterialTypeConfig) => void;
  onToggleRenderPresetActive: (value: GlassRenderPreset) => void;
  onRestoreMaterialType: (value: GlassMaterialTypeConfig) => void;
  onRestoreRenderPreset: (value: GlassRenderPreset) => void;
  onArchiveMaterialType: (value: GlassMaterialTypeConfig) => void;
  onArchiveRenderPreset: (value: GlassRenderPreset) => void;
  onCancelMaterialType: () => void;
  onCancelRenderPreset: () => void;
}) {
  const { t } = useTranslation();

  return (
    <ShellCard>
      <details>
        <summary className="cursor-pointer text-lg font-semibold text-neutral-950">{t('catalog.config.title')}</summary>
        <p className="mt-2 text-sm leading-6 text-neutral-600">{t('catalog.config.description')}</p>

        <form className="mt-4 space-y-3 rounded-md border border-neutral-200 p-3" onSubmit={onSaveMaterialType}>
          <h3 className="text-sm font-semibold text-neutral-900">{t('catalog.config.materialTypes')}</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField label={t('catalog.fields.name')} value={materialTypeForm.name} onChange={(name) => onMaterialTypeChange({ ...materialTypeForm, name })} required />
            <TextField label={t('catalog.fields.code')} value={materialTypeForm.code} onChange={(code) => onMaterialTypeChange({ ...materialTypeForm, code })} required />
          </div>
          <label className="flex items-center gap-2 text-sm font-semibold text-neutral-800">
            <input type="checkbox" checked={materialTypeForm.isActive} onChange={(event) => onMaterialTypeChange({ ...materialTypeForm, isActive: event.target.checked })} />
            {t('catalog.fields.isActive')}
          </label>
          <div className="flex gap-2">
            <button className="min-h-10 rounded-md bg-brand-red px-3 py-2 text-sm font-semibold text-white" type="submit" disabled={isSaving}>
              {t(editingMaterialTypeId ? 'catalog.actions.updateConfig' : 'catalog.actions.addConfig')}
            </button>
            {editingMaterialTypeId ? (
              <button className="min-h-10 rounded-md border border-neutral-300 px-3 py-2 text-sm font-semibold text-neutral-700" type="button" onClick={onCancelMaterialType}>
                {t('catalog.actions.cancel')}
              </button>
            ) : null}
          </div>
          <ConfigList
            items={materialTypes}
            renderMeta={(item) => item.code}
            onEdit={onEditMaterialType}
            onToggleActive={onToggleMaterialTypeActive}
            onRestore={onRestoreMaterialType}
            onArchive={onArchiveMaterialType}
          />
        </form>

        <form className="mt-4 space-y-3 rounded-md border border-neutral-200 p-3" onSubmit={onSaveRenderPreset}>
          <h3 className="text-sm font-semibold text-neutral-900">{t('catalog.config.renderPresets')}</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField label={t('catalog.fields.name')} value={renderPresetForm.name} onChange={(name) => onRenderPresetChange({ ...renderPresetForm, name })} required />
            <TextField label={t('catalog.fields.code')} value={renderPresetForm.code} onChange={(code) => onRenderPresetChange({ ...renderPresetForm, code })} required />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField label={t('catalog.fields.defaultTintPercent')} value={String(renderPresetForm.defaultTintPercent)} onChange={(value) => onRenderPresetChange({ ...renderPresetForm, defaultTintPercent: Number(value) })} />
            <TextField label={t('catalog.fields.defaultReflectivityPercent')} value={String(renderPresetForm.defaultReflectivityPercent)} onChange={(value) => onRenderPresetChange({ ...renderPresetForm, defaultReflectivityPercent: Number(value) })} />
            <TextField label={t('catalog.fields.defaultTransmissionPercent')} value={String(renderPresetForm.defaultTransmissionPercent)} onChange={(value) => onRenderPresetChange({ ...renderPresetForm, defaultTransmissionPercent: Number(value) })} />
            <TextField label={t('catalog.fields.defaultShadowPercent')} value={String(renderPresetForm.defaultShadowPercent)} onChange={(value) => onRenderPresetChange({ ...renderPresetForm, defaultShadowPercent: Number(value) })} />
          </div>
          <label className="flex items-center gap-2 text-sm font-semibold text-neutral-800">
            <input type="checkbox" checked={renderPresetForm.isActive} onChange={(event) => onRenderPresetChange({ ...renderPresetForm, isActive: event.target.checked })} />
            {t('catalog.fields.isActive')}
          </label>
          <div className="flex gap-2">
            <button className="min-h-10 rounded-md bg-brand-red px-3 py-2 text-sm font-semibold text-white" type="submit" disabled={isSaving}>
              {t(editingRenderPresetId ? 'catalog.actions.updateConfig' : 'catalog.actions.addConfig')}
            </button>
            {editingRenderPresetId ? (
              <button className="min-h-10 rounded-md border border-neutral-300 px-3 py-2 text-sm font-semibold text-neutral-700" type="button" onClick={onCancelRenderPreset}>
                {t('catalog.actions.cancel')}
              </button>
            ) : null}
          </div>
          <ConfigList
            items={renderPresets}
            renderMeta={(item) => t('catalog.config.renderPresetMeta', { tint: item.defaultTintPercent, reflectivity: item.defaultReflectivityPercent })}
            onEdit={onEditRenderPreset}
            onToggleActive={onToggleRenderPresetActive}
            onRestore={onRestoreRenderPreset}
            onArchive={onArchiveRenderPreset}
          />
        </form>
      </details>
    </ShellCard>
  );
}

function ConfigList<T extends { id: number; name: string; isActive: boolean; isArchived: boolean }>({
  items,
  renderMeta,
  onEdit,
  onToggleActive,
  onRestore,
  onArchive,
}: {
  items: T[];
  renderMeta: (item: T) => string;
  onEdit: (item: T) => void;
  onToggleActive: (item: T) => void;
  onRestore: (item: T) => void;
  onArchive: (item: T) => void;
}) {
  const { t } = useTranslation();
  const sections = [
    { key: 'active', items: items.filter((item) => item.isActive && !item.isArchived) },
    { key: 'inactive', items: items.filter((item) => !item.isActive && !item.isArchived) },
    { key: 'archived', items: items.filter((item) => item.isArchived) },
  ] as const;
  // VI: Tach lifecycle de admin phan biet cau hinh dang dung, tam tat va da archive.

  return (
    <div className="space-y-2">
      {sections.map((section) => (
        <div key={section.key} className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{t(`catalog.config.state${section.key[0].toUpperCase()}${section.key.slice(1)}`)}</p>
          {section.items.length === 0 ? (
            <p className="rounded-md bg-neutral-50 px-3 py-2 text-xs font-semibold text-neutral-500">{t('catalog.config.emptyState')}</p>
          ) : null}
          {section.items.map((item) => (
            <div key={item.id} className={`flex items-center justify-between gap-3 rounded-md px-3 py-2 text-sm ${item.isArchived ? 'bg-neutral-100 text-neutral-500' : 'bg-neutral-50'}`}>
              <div>
                <p className="font-semibold text-neutral-900">{item.name}</p>
                <p className="text-xs text-neutral-500">{renderMeta(item)}</p>
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                {!item.isArchived ? (
                  <button className="rounded-md border border-neutral-300 px-2 py-1 font-semibold text-neutral-700" type="button" onClick={() => onEdit(item)}>
                    {t('catalog.actions.edit')}
                  </button>
                ) : null}
                {!item.isArchived ? (
                  <button className="rounded-md border border-neutral-300 px-2 py-1 font-semibold text-neutral-700" type="button" onClick={() => onToggleActive(item)}>
                    {t(item.isActive ? 'catalog.actions.deactivate' : 'catalog.actions.reactivate')}
                  </button>
                ) : null}
                {item.isArchived ? (
                  <button className="rounded-md border border-neutral-300 px-2 py-1 font-semibold text-neutral-700" type="button" onClick={() => onRestore(item)}>
                    {t('catalog.actions.restore')}
                  </button>
                ) : (
                  <button className="rounded-md border border-red-200 px-2 py-1 font-semibold text-brand-red" type="button" onClick={() => onArchive(item)}>
                    {t('catalog.actions.archive')}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ))}
      {items.length === 0 ? (
        <p className="rounded-md bg-neutral-50 px-3 py-2 text-sm font-semibold text-neutral-600">{t('catalog.config.emptyState')}</p>
      ) : null}
    </div>
  );
}
