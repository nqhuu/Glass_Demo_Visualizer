import type { Project, ProjectImage, ProjectImagePayload, ProjectPayload, ProjectQuery } from './project.types';

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

function toProjectQuery(query: ProjectQuery): string {
  const params = new URLSearchParams();

  if (query.search) {
    params.set('search', query.search);
  }

  if (query.status && query.status !== 'all') {
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
  return projectRequest<Project>(`/projects/${projectId}`, accessToken, {
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
