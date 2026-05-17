// VI: Kieu du lieu frontend cho Sprint 4 project va metadata anh du an.
export type ProjectStatus = 'draft' | 'active' | 'archived';
export type ProjectImageSourceType = 'uploaded' | 'external_url' | 'placeholder';

export interface ProjectImage {
  id: number;
  projectId: number;
  title: string;
  description: string | null;
  sourceType: ProjectImageSourceType;
  imageUrl: string | null;
  thumbnailUrl: string | null;
  originalFileName: string | null;
  width: number | null;
  height: number | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: number;
  ownerId: number;
  name: string;
  code: string | null;
  description: string | null;
  customerName: string | null;
  customerPhone: string | null;
  location: string | null;
  notes: string | null;
  status: ProjectStatus;
  images?: ProjectImage[];
  createdAt: string;
  updatedAt: string;
}

export interface ProjectPayload {
  name: string;
  code?: string;
  description?: string;
  customerName?: string;
  customerPhone?: string;
  location?: string;
  notes?: string;
  status: ProjectStatus;
}

export interface ProjectImagePayload {
  title: string;
  description?: string;
  sourceType: ProjectImageSourceType;
  imageUrl?: string;
  thumbnailUrl?: string;
  originalFileName?: string;
  width?: number | null;
  height?: number | null;
  sortOrder: number;
}

export interface ProjectQuery {
  search?: string;
  status?: ProjectStatus | 'all';
}
