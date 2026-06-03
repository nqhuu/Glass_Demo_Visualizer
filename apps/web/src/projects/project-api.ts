import type {
  CreateGlassRegionPayload,
  GlassRegion,
  Project,
  ProjectExport,
  ProjectImage,
  ProjectImagePayload,
  ProjectImageUploadPayload,
  ProjectPayload,
  ProjectQuery,
  UpdateGlassRegionPayload,
  UpdateRegionRenderPresetPayload,
} from './project.types';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api';

// VI: Helper API du an gui JWT va chi hien message an toan len UI.
async function projectRequest<T>(path: string, accessToken: string, init: RequestInit = {}): Promise<T> {
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
    throw new Error((payload as { message?: string } | null)?.message ?? 'Project request failed.');
  }

  return payload as T;
}

async function projectFormRequest<T>(path: string, accessToken: string, formData: FormData): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: formData,
  });

  const payload = (await response.json().catch(() => null)) as { message?: string } | T | null;

  if (!response.ok) {
    throw new Error((payload as { message?: string } | null)?.message ?? 'Project upload failed.');
  }

  return payload as T;
}

async function projectBlobRequest(path: string, accessToken: string): Promise<Blob> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(payload?.message ?? 'Project download failed.');
  }

  return response.blob();
}

function toProjectQuery(query: ProjectQuery): string {
  const params = new URLSearchParams();

  if (query.search) {
    params.set('search', query.search);
  }

  if (query.status && query.status !== 'all' && query.status !== 'current') {
    params.set('status', query.status);
  }

  return params.toString();
}

function cleanPayload<T extends object>(payload: T): T {
  return Object.fromEntries(
    Object.entries(payload).map(([key, value]) => [key, typeof value === 'string' && value.trim() === '' ? undefined : value]),
  ) as T;
}

// VI: API CRUD project cua user dang nhap; admin all-project do backend quyet dinh theo role.
export function listProjects(accessToken: string, query: ProjectQuery): Promise<Project[]> {
  const queryString = toProjectQuery(query);
  return projectRequest<Project[]>(`/projects${queryString ? `?${queryString}` : ''}`, accessToken);
}

export function getProject(accessToken: string, projectId: number): Promise<Project> {
  return projectRequest<Project>(`/projects/${projectId}`, accessToken);
}

export function createProject(accessToken: string, payload: ProjectPayload): Promise<Project> {
  return projectRequest<Project>('/projects', accessToken, {
    method: 'POST',
    body: JSON.stringify(cleanPayload(payload)),
  });
}

export function updateProject(accessToken: string, projectId: number, payload: ProjectPayload): Promise<Project> {
  return projectRequest<Project>(`/projects/${projectId}`, accessToken, {
    method: 'PATCH',
    body: JSON.stringify(cleanPayload(payload)),
  });
}

export function archiveProject(accessToken: string, projectId: number): Promise<Project> {
  return projectRequest<Project>(`/projects/${projectId}/archive`, accessToken, {
    method: 'PATCH',
  });
}

export function deleteProject(accessToken: string, projectId: number): Promise<{ success: true }> {
  return projectRequest<{ success: true }>(`/projects/${projectId}`, accessToken, {
    method: 'DELETE',
  });
}

// VI: API metadata anh; Sprint 4 khong upload binary nen chi luu URL/size/sort order.
export function listProjectImages(accessToken: string, projectId: number): Promise<ProjectImage[]> {
  return projectRequest<ProjectImage[]>(`/projects/${projectId}/images`, accessToken);
}

export function createProjectImage(accessToken: string, projectId: number, payload: ProjectImagePayload): Promise<ProjectImage> {
  return projectRequest<ProjectImage>(`/projects/${projectId}/images`, accessToken, {
    method: 'POST',
    body: JSON.stringify(cleanPayload(payload)),
  });
}

export function uploadProjectImage(accessToken: string, projectId: number, payload: ProjectImageUploadPayload): Promise<ProjectImage> {
  const formData = new FormData();
  formData.append('file', payload.file);

  if (payload.title?.trim()) {
    formData.append('title', payload.title.trim());
  }

  if (payload.description?.trim()) {
    formData.append('description', payload.description.trim());
  }

  if (payload.sortOrder !== undefined) {
    formData.append('sortOrder', String(payload.sortOrder));
  }

  return projectFormRequest<ProjectImage>(`/projects/${projectId}/images/upload`, accessToken, formData);
}

export function updateProjectImage(
  accessToken: string,
  projectId: number,
  imageId: number,
  payload: ProjectImagePayload,
): Promise<ProjectImage> {
  return projectRequest<ProjectImage>(`/projects/${projectId}/images/${imageId}`, accessToken, {
    method: 'PATCH',
    body: JSON.stringify(cleanPayload(payload)),
  });
}

export function deleteProjectImage(accessToken: string, projectId: number, imageId: number): Promise<{ deleted: true }> {
  return projectRequest<{ deleted: true }>(`/projects/${projectId}/images/${imageId}`, accessToken, {
    method: 'DELETE',
  });
}

// VI: API export Sprint 10 luon goi backend de bat buoc watermark va luu lich su.
export function exportProjectImage(accessToken: string, projectId: number, imageId: number): Promise<ProjectExport> {
  return projectRequest<ProjectExport>(`/projects/${projectId}/images/${imageId}/export-demo`, accessToken, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export function listProjectExports(accessToken: string, projectId: number): Promise<ProjectExport[]> {
  return projectRequest<ProjectExport[]>(`/projects/${projectId}/exports`, accessToken);
}

export function getProjectExport(accessToken: string, projectId: number, exportId: number): Promise<ProjectExport> {
  return projectRequest<ProjectExport>(`/projects/${projectId}/exports/${exportId}`, accessToken);
}

export function downloadProjectExport(accessToken: string, projectId: number, exportId: number): Promise<Blob> {
  return projectBlobRequest(`/projects/${projectId}/exports/${exportId}/download`, accessToken);
}

// VI: Tai anh upload qua endpoint co JWT; khong dat access token trong URL cua the img.
export function downloadProjectImageFile(accessToken: string, projectId: number, imageId: number): Promise<Blob> {
  return projectBlobRequest(`/projects/${projectId}/images/${imageId}/file`, accessToken);
}

// VI: API region Sprint 8/9; backend van la nguon kiem tra ownership, overlap va gan mau kinh active.
export function listGlassRegions(accessToken: string, projectId: number, imageId: number): Promise<GlassRegion[]> {
  return projectRequest<GlassRegion[]>(`/projects/${projectId}/images/${imageId}/regions`, accessToken);
}

export function createGlassRegion(accessToken: string, projectId: number, imageId: number, payload: CreateGlassRegionPayload): Promise<GlassRegion> {
  return projectRequest<GlassRegion>(`/projects/${projectId}/images/${imageId}/regions`, accessToken, {
    method: 'POST',
    body: JSON.stringify(cleanPayload(payload)),
  });
}

export function updateGlassRegion(
  accessToken: string,
  projectId: number,
  imageId: number,
  regionId: number,
  payload: UpdateGlassRegionPayload,
): Promise<GlassRegion> {
  return projectRequest<GlassRegion>(`/projects/${projectId}/images/${imageId}/regions/${regionId}`, accessToken, {
    method: 'PATCH',
    body: JSON.stringify(cleanPayload(payload)),
  });
}

export function duplicateGlassRegion(accessToken: string, projectId: number, imageId: number, regionId: number): Promise<GlassRegion> {
  return projectRequest<GlassRegion>(`/projects/${projectId}/images/${imageId}/regions/${regionId}/duplicate`, accessToken, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export function deleteGlassRegion(accessToken: string, projectId: number, imageId: number, regionId: number): Promise<{ deleted: true }> {
  return projectRequest<{ deleted: true }>(`/projects/${projectId}/images/${imageId}/regions/${regionId}`, accessToken, {
    method: 'DELETE',
  });
}

export function assignGlassToRegion(accessToken: string, projectId: number, imageId: number, regionId: number, glassProductId: number): Promise<GlassRegion> {
  return projectRequest<GlassRegion>(`/projects/${projectId}/images/${imageId}/regions/${regionId}/glass`, accessToken, {
    method: 'PATCH',
    body: JSON.stringify({ glassProductId }),
  });
}

export function removeGlassFromRegion(accessToken: string, projectId: number, imageId: number, regionId: number): Promise<GlassRegion> {
  return projectRequest<GlassRegion>(`/projects/${projectId}/images/${imageId}/regions/${regionId}/glass`, accessToken, {
    method: 'DELETE',
  });
}

export function updateRegionRenderPreset(
  accessToken: string,
  projectId: number,
  imageId: number,
  regionId: number,
  payload: UpdateRegionRenderPresetPayload,
): Promise<GlassRegion> {
  return projectRequest<GlassRegion>(`/projects/${projectId}/images/${imageId}/regions/${regionId}/render-preset`, accessToken, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function resolveProjectImageUrl(url: string | null): string | null {
  if (!url) {
    return null;
  }

  if (url.startsWith('/uploads/')) {
    // VI: Khong render URL uploads legacy truc tiep; anh upload phai di qua blob JWT.
    return null;
  }

  return url;
}

export function resolveCatalogTextureUrl(url: string | null): string | null {
  if (!url) {
    return null;
  }

  const localPrefixes = ['/catalog-assets/', '/uploads/catalog/'];
  const prefix = localPrefixes.find((candidate) => url.startsWith(candidate));

  if (prefix) {
    const fileName = url.slice(prefix.length);
    if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]*\.(jpe?g|png|webp)$/i.test(fileName)) {
      return null;
    }

    // VI: Texture public chi qua route catalog gioi han; khong dung endpoint anh project can JWT.
    return `${apiBaseUrl}/catalog-assets/${encodeURIComponent(fileName)}`;
  }

  if (url.startsWith('/uploads/')) {
    return null;
  }

  return url;
}
