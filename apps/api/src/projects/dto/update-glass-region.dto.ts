import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Length, Max, Min, ValidateNested, ArrayMaxSize, ArrayMinSize } from 'class-validator';
import { BoundaryPointDto } from './create-glass-region.dto';
import { GlassRegionBoundaryType } from '../enums/glass-region-boundary-type.enum';
import { GlassRegionGridMode } from '../enums/glass-region-grid-mode.enum';

// VI: DTO cap nhat region Sprint 8; khong nhan glassProductId vi gan kinh thuoc Sprint 9.
export class UpdateGlassRegionDto {
  @IsOptional()
  @IsString()
  @Length(2, 180)
  name?: string;

  @IsOptional()
  @IsEnum(GlassRegionBoundaryType)
  boundaryType?: GlassRegionBoundaryType;

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => BoundaryPointDto)
  @ArrayMinSize(4)
  @ArrayMaxSize(12)
  boundaryPoints?: BoundaryPointDto[];

  @IsOptional()
  @IsEnum(GlassRegionGridMode)
  gridMode?: GlassRegionGridMode;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  rows?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  columns?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(9999)
  sortOrder?: number;
}
