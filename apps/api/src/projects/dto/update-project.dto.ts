import { IsEnum, IsOptional, IsString, Length, Matches } from 'class-validator';
import { ProjectStatus } from '../enums/project-status.enum';

// VI: DTO cap nhat du an, cho phep sua tung truong nhung van validate dau vao.
export class UpdateProjectDto {
  @IsOptional()
  @IsString()
  @Length(2, 180)
  name?: string;

  @IsOptional()
  @IsString()
  @Length(0, 120)
  @Matches(/^[a-zA-Z0-9-_ ]*$/)
  code?: string;

  @IsOptional()
  @IsString()
  @Length(0, 1200)
  description?: string;

  @IsOptional()
  @IsString()
  @Length(0, 180)
  customerName?: string;

  @IsOptional()
  @IsString()
  @Length(0, 40)
  customerPhone?: string;

  @IsOptional()
  @IsString()
  @Length(0, 240)
  location?: string;

  @IsOptional()
  @IsString()
  @Length(0, 1200)
  notes?: string;

  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;
}
