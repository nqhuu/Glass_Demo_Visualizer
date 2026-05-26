import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsHexColor, IsInt, IsNumber, IsOptional, IsString, Length, Max, Min, ValidateIf } from 'class-validator';
import { GlassMaterialType } from '../enums/glass-material-type.enum';
import { GlassRealismPreset } from '../enums/glass-realism-preset.enum';
import { IsCatalogMediaUrl } from './catalog-media-url.validator';

// VI: DTO cap nhat san pham kinh cho phep sua tung field profile vat lieu.
export class UpdateGlassProductDto {
  @IsOptional()
  @IsString()
  @Length(2, 160)
  name?: string;

  @IsOptional()
  @IsString()
  @Length(2, 80)
  code?: string;

  @IsOptional()
  @IsString()
  @Length(0, 800)
  description?: string;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  categoryId?: number | null;

  @IsOptional()
  @IsEnum(GlassMaterialType)
  materialType?: GlassMaterialType;

  @IsOptional()
  @IsHexColor()
  baseColor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  tintStrength?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  reflectivityLevel?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  transmissionLevel?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  shadowLevel?: number;

  @IsOptional()
  @IsEnum(GlassRealismPreset)
  realismPreset?: GlassRealismPreset;

  @IsOptional()
  // VI: Undefined giu nguyen URL hien tai; null/chuoi trong xoa URL mot cach chu dong.
  @IsCatalogMediaUrl()
  @Length(0, 500)
  previewImageUrl?: string | null;

  @IsOptional()
  @IsCatalogMediaUrl()
  @Length(0, 500)
  textureImageUrl?: string | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(9999)
  sortOrder?: number;
}
