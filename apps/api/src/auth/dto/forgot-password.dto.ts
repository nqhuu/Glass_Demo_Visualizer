import { IsEmail } from 'class-validator';

// VI: DTO quen mat khau chi nhan email va luon tra thong bao chung.
export class ForgotPasswordDto {
  @IsEmail()
  email!: string;
}
