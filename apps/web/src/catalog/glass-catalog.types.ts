// VI: Type dung chung cho UI admin catalog kinh va payload goi backend.
export type GlassMaterialType = 'clear' | 'tinted' | 'reflective' | 'frosted' | 'patterned';

export type GlassRealismPreset = 'standard' | 'balcony' | 'facade' | 'window' | 'railing';

export interface GlassCategory {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  isActive: boolean;
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
  baseColor: string;
  tintStrength: number;
  reflectivityLevel: number;
  transmissionLevel: number;
  shadowLevel: number;
  realismPreset: GlassRealismPreset;
  previewImageUrl: string | null;
  textureImageUrl: string | null;
  isActive: boolean;
  sortOrder: number;
}

export interface GlassProductPayload {
  name: string;
  code: string;
  description?: string;
  categoryId?: number | null;
  materialType: GlassMaterialType;
  baseColor: string;
  tintStrength: number;
  reflectivityLevel: number;
  transmissionLevel: number;
  shadowLevel: number;
  realismPreset: GlassRealismPreset;
  previewImageUrl?: string;
  textureImageUrl?: string;
  isActive: boolean;
  sortOrder: number;
}

export interface GlassProductQuery {
  search?: string;
  categoryId?: number;
}
