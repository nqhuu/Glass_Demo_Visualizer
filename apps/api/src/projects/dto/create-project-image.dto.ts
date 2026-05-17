import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, IsUrl, Length, Max, Min, ValidateIf } from 'class-validator';
import { ProjectImageSourceType } from '../enums/project-image-source-type.enum';

// VI: DTO them metadata anh vao du an; upload file that se duoc lam o sprint sau.
export class CreateProjectImageDto {
  @IsString()
  @Length(2, 180)
  title!: string;

  @IsOptional()
  @IsString()
  @Length(0, 800)
  description?: string;

  @IsOptional()
  @IsEnum(ProjectImageSourceType)
  sourceType?: ProjectImageSourceType;

  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== '')
  @IsUrl({ require_protocol: true })
  @Length(0, 700)
  imageUrl?: string | null;

  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== '')
  @IsUrl({ require_protocol: true })
  @Length(0, 700)
  thumbnailUrl?: string | null;

  @IsOptional()
  @IsString()
  @Length(0, 255)
  originalFileName?: string | null;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50000)
  width?: number | null;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50000)
  height?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(9999)
  sortOrder?: number;
}
