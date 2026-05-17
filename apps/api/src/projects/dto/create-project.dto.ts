import { IsEnum, IsOptional, IsString, Length, Matches } from 'class-validator';
import { ProjectStatus } from '../enums/project-status.enum';

// VI: DTO tao du an, chi nhan cac truong text an toan va status hop le.
export class CreateProjectDto {
  @IsString()
  @Length(2, 180)
  name!: string;

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
