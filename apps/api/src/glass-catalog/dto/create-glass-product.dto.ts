import { IsBoolean, IsEnum, IsHexColor, IsInt, IsNumber, IsOptional, IsString, Length, Max, Min, ValidateIf } from 'class-validator';
import { Type } from 'class-transformer';
import { GlassMaterialType } from '../enums/glass-material-type.enum';
import { GlassRealismPreset } from '../enums/glass-realism-preset.enum';
import { IsCatalogMediaUrl } from './catalog-media-url.validator';

// VI: DTO tao san pham kinh va profile vat lieu do admin quan ly, khong phai slider cho user thuong.
export class CreateGlassProductDto {
  @IsString()
  @Length(2, 160)
  name!: string;

  @IsString()
  @Length(2, 80)
  code!: string;

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

  @IsEnum(GlassMaterialType)
  materialType!: GlassMaterialType;

  @IsHexColor()
  baseColor!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  tintStrength!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  reflectivityLevel!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  transmissionLevel!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  shadowLevel!: number;

  @IsEnum(GlassRealismPreset)
  realismPreset!: GlassRealismPreset;

  @IsOptional()
  // VI: Null/chuoi trong xoa URL; URL co gia tri chi duoc dung HTTP(S) hoac asset catalog an toan.
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
