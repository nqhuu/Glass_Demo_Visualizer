import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsEnum, IsInt, IsNumber, IsOptional, IsString, Length, Max, Min, ValidateNested } from 'class-validator';
import { GlassRegionBoundaryType } from '../enums/glass-region-boundary-type.enum';

// VI: DTO diem toa do chuan hoa tren anh, gia tri 0..1 de khong phu thuoc kich thuoc hien thi.
export class BoundaryPointDto {
  @Type(() => Number)
  @IsNumber({ allowInfinity: false, allowNaN: false })
  @Min(0)
  @Max(1)
  x!: number;

  @Type(() => Number)
  @IsNumber({ allowInfinity: false, allowNaN: false })
  @Min(0)
  @Max(1)
  y!: number;
}

// VI: DTO tao region Sprint 7, khong nhan glassProductId de tranh gan kinh truoc scope.
export class CreateGlassRegionDto {
  @IsString()
  @Length(2, 180)
  name!: string;

  @IsEnum(GlassRegionBoundaryType)
  boundaryType!: GlassRegionBoundaryType;

  @ValidateNested({ each: true })
  @Type(() => BoundaryPointDto)
  @ArrayMinSize(4)
  @ArrayMaxSize(12)
  boundaryPoints!: BoundaryPointDto[];

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  rows!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  columns!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(9999)
  sortOrder?: number;
}
