import type { GlassCategory, GlassMaterialTypeConfig, GlassProduct, GlassProductPayload, GlassProductQuery, GlassRenderPreset } from './glass-catalog.types';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api';

// VI: Helper goi API catalog voi JWT admin, khong log token hoac secret.
async function catalogRequest<T>(path: string, accessToken: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      ...(init.headers ?? {}),
    },
  });

  const payload = (await response.json().catch(() => null)) as { message?: string } | T | null;

  if (!response.ok) {
    throw new Error((payload as { message?: string } | null)?.message ?? 'Catalog request failed.');
  }

  return payload as T;
}

// VI: Helper doc catalog active cho user trong editor shell, khong can token vi backend da public read-only.
async function publicCatalogRequest<T>(path: string): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`);
  const payload = (await response.json().catch(() => null)) as { message?: string } | T | null;

  if (!response.ok) {
    throw new Error((payload as { message?: string } | null)?.message ?? 'Catalog request failed.');
  }

  return payload as T;
}

function toQueryString(query: GlassProductQuery): string {
  const params = new URLSearchParams();

  if (query.search) {
    params.set('search', query.search);
  }

  if (query.categoryId) {
    params.set('categoryId', String(query.categoryId));
  }

  if (query.isActive !== undefined) {
    params.set('isActive', String(query.isActive));
  }

  if (query.isArchived !== undefined) {
    params.set('isArchived', String(query.isArchived));
  }

  return params.toString();
}

export function listActiveGlassProducts(query: GlassProductQuery = {}): Promise<GlassProduct[]> {
  const queryString = toQueryString(query);
  return publicCatalogRequest<GlassProduct[]>(`/glass-products${queryString ? `?${queryString}` : ''}`);
}

export function listActiveGlassMaterialTypes(): Promise<GlassMaterialTypeConfig[]> {
  return publicCatalogRequest<GlassMaterialTypeConfig[]>('/glass-material-types');
}

export function listActiveGlassRenderPresets(): Promise<GlassRenderPreset[]> {
  return publicCatalogRequest<GlassRenderPreset[]>('/glass-render-presets');
}

// VI: API danh muc kinh cho man hinh admin catalog.
export function listAdminGlassCategories(accessToken: string): Promise<GlassCategory[]> {
  return catalogRequest<GlassCategory[]>('/admin/glass-categories', accessToken);
}

export function createAdminGlassCategory(
  accessToken: string,
  payload: Pick<GlassCategory, 'name' | 'slug' | 'description' | 'isActive' | 'isArchived' | 'sortOrder'>,
): Promise<GlassCategory> {
  return catalogRequest<GlassCategory>('/admin/glass-categories', accessToken, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateAdminGlassCategory(
  accessToken: string,
  categoryId: number,
  payload: Partial<Pick<GlassCategory, 'name' | 'slug' | 'description' | 'isActive' | 'isArchived' | 'sortOrder'>>,
): Promise<GlassCategory> {
  return catalogRequest<GlassCategory>(`/admin/glass-categories/${categoryId}`, accessToken, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function deleteAdminGlassCategory(accessToken: string, categoryId: number): Promise<{ deleted: true }> {
  return catalogRequest<{ deleted: true }>(`/admin/glass-categories/${categoryId}`, accessToken, {
    method: 'DELETE',
  });
}

// VI: API san pham kinh va profile vat lieu cho admin.
export function listAdminGlassProducts(accessToken: string, query: GlassProductQuery): Promise<GlassProduct[]> {
  const queryString = toQueryString(query);
  return catalogRequest<GlassProduct[]>(`/admin/glass-products${queryString ? `?${queryString}` : ''}`, accessToken);
}

export function createAdminGlassProduct(accessToken: string, payload: GlassProductPayload): Promise<GlassProduct> {
  return catalogRequest<GlassProduct>('/admin/glass-products', accessToken, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateAdminGlassProduct(
  accessToken: string,
  productId: number,
  payload: Partial<GlassProductPayload>,
): Promise<GlassProduct> {
  return catalogRequest<GlassProduct>(`/admin/glass-products/${productId}`, accessToken, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function deleteAdminGlassProduct(accessToken: string, productId: number): Promise<GlassProduct> {
  return catalogRequest<GlassProduct>(`/admin/glass-products/${productId}`, accessToken, {
    method: 'DELETE',
  });
}

// VI: Admin-managed material types va render presets la cau hinh catalog, khong phai setting cho user thuong trong editor.
export function listAdminGlassMaterialTypes(accessToken: string): Promise<GlassMaterialTypeConfig[]> {
  return catalogRequest<GlassMaterialTypeConfig[]>('/admin/glass-material-types', accessToken);
}

export function createAdminGlassMaterialType(accessToken: string, payload: Omit<GlassMaterialTypeConfig, 'id'>): Promise<GlassMaterialTypeConfig> {
  return catalogRequest<GlassMaterialTypeConfig>('/admin/glass-material-types', accessToken, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateAdminGlassMaterialType(accessToken: string, id: number, payload: Partial<Omit<GlassMaterialTypeConfig, 'id'>>): Promise<GlassMaterialTypeConfig> {
  return catalogRequest<GlassMaterialTypeConfig>(`/admin/glass-material-types/${id}`, accessToken, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function deleteAdminGlassMaterialType(accessToken: string, id: number): Promise<GlassMaterialTypeConfig> {
  return catalogRequest<GlassMaterialTypeConfig>(`/admin/glass-material-types/${id}`, accessToken, {
    method: 'DELETE',
  });
}

export function listAdminGlassRenderPresets(accessToken: string): Promise<GlassRenderPreset[]> {
  return catalogRequest<GlassRenderPreset[]>('/admin/glass-render-presets', accessToken);
}

export function createAdminGlassRenderPreset(accessToken: string, payload: Omit<GlassRenderPreset, 'id'>): Promise<GlassRenderPreset> {
  return catalogRequest<GlassRenderPreset>('/admin/glass-render-presets', accessToken, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateAdminGlassRenderPreset(accessToken: string, id: number, payload: Partial<Omit<GlassRenderPreset, 'id'>>): Promise<GlassRenderPreset> {
  return catalogRequest<GlassRenderPreset>(`/admin/glass-render-presets/${id}`, accessToken, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function deleteAdminGlassRenderPreset(accessToken: string, id: number): Promise<GlassRenderPreset> {
  return catalogRequest<GlassRenderPreset>(`/admin/glass-render-presets/${id}`, accessToken, {
    method: 'DELETE',
  });
}
