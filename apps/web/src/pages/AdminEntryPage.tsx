import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../auth/use-auth';
import {
  createAdminGlassCategory,
  createAdminGlassProduct,
  deleteAdminGlassCategory,
  deleteAdminGlassProduct,
  listAdminGlassCategories,
  listAdminGlassProducts,
  updateAdminGlassCategory,
  updateAdminGlassProduct,
} from '../catalog/glass-catalog-api';
import { CategoryPanel, type CategoryFormState } from '../catalog/CategoryPanel';
import { ProductCard } from '../catalog/ProductCard';
import { ProductForm } from '../catalog/ProductForm';
import type { GlassCategory, GlassProduct, GlassProductPayload } from '../catalog/glass-catalog.types';
import { PageHeader } from '../components/PageHeader';
import { ShellCard } from '../components/ShellCard';
import { SelectField, TextField } from '../catalog/CatalogFormFields';
import { logSafeUiError } from '../utils/safe-log';

const emptyProductForm: GlassProductPayload = {
  name: '',
  code: '',
  description: '',
  materialType: 'clear',
  baseColor: '#dbeafe',
  tintStrength: 0.25,
  reflectivityLevel: 0.35,
  transmissionLevel: 0.65,
  shadowLevel: 0.2,
  realismPreset: 'standard',
  previewImageUrl: '',
  textureImageUrl: '',
  isActive: true,
  sortOrder: 0,
};

const emptyCategoryForm: CategoryFormState = {
  name: '',
  slug: '',
  description: '',
  isActive: true,
  sortOrder: 0,
};

// VI: Trang admin catalog Sprint 3 ket noi CRUD danh muc, san pham va profile vat lieu kinh.
export function AdminEntryPage() {
  const { t } = useTranslation();
  const { accessToken } = useAuth();
  const [categories, setCategories] = useState<GlassCategory[]>([]);
  const [products, setProducts] = useState<GlassProduct[]>([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [productForm, setProductForm] = useState<GlassProductPayload>(emptyProductForm);
  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const [categoryForm, setCategoryForm] = useState<CategoryFormState>(emptyCategoryForm);
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const selectedProduct = useMemo(
    () => products.find((product) => product.id === editingProductId) ?? null,
    [editingProductId, products],
  );

  const loadCatalog = async () => {
    if (!accessToken) {
      return;
    }

    try {
      const query = {
        search: search.trim() || undefined,
        categoryId: categoryFilter ? Number(categoryFilter) : undefined,
      };
      const [loadedCategories, loadedProducts] = await Promise.all([
        listAdminGlassCategories(accessToken),
        listAdminGlassProducts(accessToken, query),
      ]);
      setCategories(loadedCategories);
      setProducts(loadedProducts);
    } catch (error) {
      // VI: Hien thong bao ngan gon, log ngu canh an toan va khong in token.
      logSafeUiError('AdminEntryPage', 'loadCatalog', 'Failed to load glass catalog', error);
      setStatusMessage(t('catalog.messages.loadFailed'));
    }
  };

  useEffect(() => {
    void loadCatalog();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, search, categoryFilter]);

  const resetProductForm = () => {
    setEditingProductId(null);
    setProductForm(emptyProductForm);
  };

  const resetCategoryForm = () => {
    setEditingCategoryId(null);
    setCategoryForm(emptyCategoryForm);
  };

  const saveProduct = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!accessToken) {
      return;
    }

    setIsSaving(true);
    setStatusMessage('');

    try {
      const payload = normalizeProductPayload(productForm);

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

  const startEditProduct = (product: GlassProduct) => {
    setEditingProductId(product.id);
    setProductForm({
      name: product.name,
      code: product.code,
      description: product.description ?? '',
      categoryId: product.categoryId ?? undefined,
      materialType: product.materialType,
      baseColor: product.baseColor,
      tintStrength: product.tintStrength,
      reflectivityLevel: product.reflectivityLevel,
      transmissionLevel: product.transmissionLevel,
      shadowLevel: product.shadowLevel,
      realismPreset: product.realismPreset,
      previewImageUrl: product.previewImageUrl ?? '',
      textureImageUrl: product.textureImageUrl ?? '',
      isActive: product.isActive,
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
      sortOrder: category.sortOrder,
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

  const confirmDeleteProduct = async (product: GlassProduct) => {
    if (!accessToken || !window.confirm(t('catalog.confirmDeleteProduct', { name: product.name }))) {
      return;
    }

    try {
      await deleteAdminGlassProduct(accessToken, product.id);
      await loadCatalog();
      setStatusMessage(t('catalog.messages.productDeleted'));
    } catch (error) {
      logSafeUiError('AdminEntryPage', 'confirmDeleteProduct', 'Failed to delete glass product', error, { productId: product.id });
      setStatusMessage(t('catalog.messages.productDeleteFailed'));
    }
  };

  const confirmDeleteCategory = async (category: GlassCategory) => {
    if (!accessToken || !window.confirm(t('catalog.confirmDeleteCategory', { name: category.name }))) {
      return;
    }

    try {
      await deleteAdminGlassCategory(accessToken, category.id);
      await loadCatalog();
      setStatusMessage(t('catalog.messages.categoryDeleted'));
    } catch (error) {
      logSafeUiError('AdminEntryPage', 'confirmDeleteCategory', 'Failed to delete glass category', error, { categoryId: category.id });
      setStatusMessage(t('catalog.messages.categoryDeleteFailed'));
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
                onDelete={() => void confirmDeleteProduct(product)}
              />
            ))}
          </div>

          {products.length === 0 ? (
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
            onDelete={(category) => void confirmDeleteCategory(category)}
            onCancel={resetCategoryForm}
          />
        </aside>
      </div>
    </div>
  );
}

function normalizeProductPayload(productForm: GlassProductPayload): GlassProductPayload {
  // VI: categoryId null nghia la xoa danh muc; undefined moi la khong gui thay doi.
  const payload: GlassProductPayload = {
    ...productForm,
    categoryId: productForm.categoryId ?? null,
    description: productForm.description?.trim() || undefined,
    previewImageUrl: productForm.previewImageUrl?.trim() || undefined,
    textureImageUrl: productForm.textureImageUrl?.trim() || undefined,
  };

  return payload;
}
