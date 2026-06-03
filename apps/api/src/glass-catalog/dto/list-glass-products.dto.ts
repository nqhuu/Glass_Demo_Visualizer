import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, Length, Min } from 'class-validator';

// VI: DTO loc danh sach san pham kinh theo category, active va tu khoa tim kiem.
export class ListGlassProductsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  categoryId?: number;

  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  isArchived?: boolean;

  @IsOptional()
  @IsString()
  @Length(1, 120)
  search?: string;
}
