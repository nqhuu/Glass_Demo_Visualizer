import type { GlassProduct, GlassRenderPreset } from '../catalog/glass-catalog.types';

// VI: Kieu du lieu frontend cho project/image/region; Sprint 9 region co the gan mot mau kinh active.
export type ProjectStatus = 'draft' | 'active' | 'archived';
export type ProjectImageSourceType = 'uploaded' | 'external_url' | 'placeholder';
export type GlassRegionBoundaryType = 'rectangle' | 'quadrilateral' | 'polygon';
export type GlassRegionGridMode = 'none' | 'rows_columns' | 'manual_lines';
export type GlassRegionStatus = 'unassigned' | 'assigned' | 'invalid';
export type ProjectExportStatus = 'completed' | 'failed';

export interface NormalizedPoint {
  x: number;
  y: number;
}

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

export interface ProjectExport {
  id: number;
  projectId: number;
  projectImageId: number;
  createdById: number;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  width: number;
  height: number;
  format: string;
  watermarkApplied: boolean;
  copyrightText: string | null;
  status: ProjectExportStatus;
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

export interface ProjectImageUploadPayload {
  file: File;
  title?: string;
  description?: string;
  sortOrder?: number;
}

export interface ProjectImageUploadDraft {
  payload: ProjectImageUploadPayload | null;
  errorKey: string | null;
}

export interface ProjectQuery {
  search?: string;
  status?: ProjectStatus | 'all' | 'current';
}

export interface GlassRegionPane {
  id: number;
  glassRegionId: number;
  paneCode: string;
  panePointsJson: NormalizedPoint[];
  rowIndex: number | null;
  columnIndex: number | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface GlassRegion {
  id: number;
  projectId: number;
  projectImageId: number;
  name: string;
  boundaryType: GlassRegionBoundaryType;
  boundaryPointsJson: NormalizedPoint[];
  glassProductId: number | null;
  glassProduct: GlassProduct | null;
  renderPresetId: number | null;
  renderPreset: GlassRenderPreset | null;
  appliedTintPercent: number | null;
  appliedReflectivityPercent: number | null;
  appliedTransmissionPercent: number | null;
  appliedShadowPercent: number | null;
  gridMode: GlassRegionGridMode;
  rows: number | null;
  columns: number | null;
  status: GlassRegionStatus;
  sortOrder: number;
  panes: GlassRegionPane[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateGlassRegionPayload {
  name: string;
  boundaryType: GlassRegionBoundaryType;
  boundaryPoints: NormalizedPoint[];
  rows: number;
  columns: number;
  sortOrder?: number;
}

export interface UpdateGlassRegionPayload {
  name?: string;
  boundaryType?: GlassRegionBoundaryType;
  boundaryPoints?: NormalizedPoint[];
  gridMode?: GlassRegionGridMode;
  rows?: number;
  columns?: number;
  sortOrder?: number;
}

export interface UpdateRegionRenderPresetPayload {
  renderPresetId: number | null;
}
