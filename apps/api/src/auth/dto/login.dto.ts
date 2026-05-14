import { IsEmail, IsString, MinLength } from 'class-validator';

// VI: DTO login chi nhan email va mat khau, duoc ValidationPipe chan input bat hop le.
export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}
