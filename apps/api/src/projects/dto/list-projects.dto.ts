import { IsEnum, IsOptional, IsString, Length } from 'class-validator';
import { ProjectStatus } from '../enums/project-status.enum';

// VI: DTO loc danh sach du an cua user theo tu khoa va trang thai.
export class ListProjectsDto {
  @IsOptional()
  @IsString()
  @Length(1, 120)
  search?: string;

  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;
}
