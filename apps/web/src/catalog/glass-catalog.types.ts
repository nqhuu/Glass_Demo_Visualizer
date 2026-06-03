// VI: Type dung chung cho UI admin catalog kinh va payload goi backend.
export type GlassMaterialType = 'clear' | 'tinted' | 'reflective' | 'frosted' | 'patterned';

export type GlassRealismPreset = 'standard' | 'balcony' | 'facade' | 'window' | 'railing';

export interface GlassMaterialTypeConfig {
  id: number;
  name: string;
  code: string;
  description: string | null;
  isActive: boolean;
  isArchived: boolean;
  sortOrder: number;
}

export interface GlassRenderPreset {
  id: number;
  name: string;
  code: string;
  description: string | null;
  defaultTintPercent: number;
  defaultReflectivityPercent: number;
  defaultTransmissionPercent: number;
  defaultShadowPercent: number;
  isActive: boolean;
  isArchived: boolean;
  sortOrder: number;
}

export interface GlassCategory {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  isActive: boolean;
  isArchived: boolean;
  sortOrder: number;
}

export interface GlassProduct {
  id: number;
  name: string;
  code: string;
  description: string | null;
  categoryId: number | null;
  category: GlassCategory | null;
  materialType: GlassMaterialType;
  materialTypeId: number | null;
  materialTypeConfig: GlassMaterialTypeConfig | null;
  baseColor: string;
  tintStrength: number;
  reflectivityLevel: number;
  transmissionLevel: number;
  shadowLevel: number;
  realismPreset: GlassRealismPreset;
  renderPresetId: number | null;
  renderPreset: GlassRenderPreset | null;
  previewImageUrl: string | null;
  textureImageUrl: string | null;
  isActive: boolean;
  isArchived: boolean;
  sortOrder: number;
}

export interface GlassProductPayload {
  name: string;
  code: string;
  description?: string;
  categoryId?: number | null;
  materialType: GlassMaterialType;
  materialTypeId?: number | null;
  baseColor: string;
  tintStrength: number;
  reflectivityLevel: number;
  transmissionLevel: number;
  shadowLevel: number;
  realismPreset: GlassRealismPreset;
  renderPresetId?: number | null;
  previewImageUrl?: string | null;
  textureImageUrl?: string | null;
  isActive: boolean;
  isArchived?: boolean;
  sortOrder: number;
}

export interface GlassProductQuery {
  search?: string;
  categoryId?: number;
  isActive?: boolean;
  isArchived?: boolean;
}
