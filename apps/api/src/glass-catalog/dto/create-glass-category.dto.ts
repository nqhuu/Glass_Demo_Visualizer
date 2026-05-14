import { IsBoolean, IsInt, IsOptional, IsString, Length, Matches, Max, Min } from 'class-validator';

// VI: DTO tao danh muc kinh voi gioi han text de tranh du lieu khong hop le.
export class CreateGlassCategoryDto {
  @IsString()
  @Length(2, 120)
  name!: string;

  @IsString()
  @Length(2, 140)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  slug!: string;

  @IsOptional()
  @IsString()
  @Length(0, 500)
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(9999)
  sortOrder?: number;
}
