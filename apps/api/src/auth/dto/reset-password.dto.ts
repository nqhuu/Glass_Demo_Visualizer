import { IsString, Matches, MinLength } from 'class-validator';

// VI: DTO reset mat khau dung token mot lan va mat khau moi co do manh toi thieu.
export class ResetPasswordDto {
  @IsString()
  token!: string;

  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[A-Za-z])(?=.*\d).+$/)
  password!: string;
}
