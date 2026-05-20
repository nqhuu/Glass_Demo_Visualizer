import type { GlassCategory, GlassProduct, GlassProductPayload, GlassProductQuery } from './glass-catalog.types';

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

  return params.toString();
}

export function listActiveGlassProducts(query: GlassProductQuery = {}): Promise<GlassProduct[]> {
  const queryString = toQueryString(query);
  return publicCatalogRequest<GlassProduct[]>(`/glass-products${queryString ? `?${queryString}` : ''}`);
}

// VI: API danh muc kinh cho man hinh admin catalog.
export function listAdminGlassCategories(accessToken: string): Promise<GlassCategory[]> {
  return catalogRequest<GlassCategory[]>('/admin/glass-categories', accessToken);
}

export function createAdminGlassCategory(
  accessToken: string,
  payload: Pick<GlassCategory, 'name' | 'slug' | 'description' | 'isActive' | 'sortOrder'>,
): Promise<GlassCategory> {
  return catalogRequest<GlassCategory>('/admin/glass-categories', accessToken, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateAdminGlassCategory(
  accessToken: string,
  categoryId: number,
  payload: Partial<Pick<GlassCategory, 'name' | 'slug' | 'description' | 'isActive' | 'sortOrder'>>,
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
