import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, Length, Matches, Max, Min } from 'class-validator';

// VI: DTO render preset luu percent 0-100 de admin de hieu va region ap dung truc tiep.
export class CreateGlassRenderPresetDto {
  @IsString()
  @Length(2, 160)
  name!: string;

  @IsString()
  @Length(2, 80)
  @Matches(/^[a-z0-9][a-z0-9_-]*$/)
  code!: string;

  @IsOptional()
  @IsString()
  @Length(0, 800)
  description?: string | null;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  defaultTintPercent!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  defaultReflectivityPercent!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  defaultTransmissionPercent!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  defaultShadowPercent!: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isArchived?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(9999)
  sortOrder?: number;
}
