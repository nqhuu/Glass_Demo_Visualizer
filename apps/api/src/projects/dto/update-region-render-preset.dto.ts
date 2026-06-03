import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min, ValidateIf } from 'class-validator';

// VI: User chi chon preset ngu canh cho region, khong gui slider vat lieu tuy y.
export class UpdateRegionRenderPresetDto {
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  renderPresetId?: number | null;
}
