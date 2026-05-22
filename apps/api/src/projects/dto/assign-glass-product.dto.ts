import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

// VI: DTO gan mau kinh cho region; user chi duoc gui id san pham, khong duoc chinh profile vat lieu.
export class AssignGlassProductDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  glassProductId!: number;
}
