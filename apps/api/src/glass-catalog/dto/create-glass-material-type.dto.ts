import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, Length, Max, Min, Matches } from 'class-validator';

// VI: DTO material type chi cho admin, code an toan de mapping fallback renderer.
export class CreateGlassMaterialTypeDto {
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
