import { IsEmail, IsString, Length, Matches, MinLength } from 'class-validator';

// VI: DTO dang ky cong khai, khong cho client gui role de tranh tu cap quyen admin.
export class RegisterDto {
  @IsString()
  @Length(2, 160)
  name!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[A-Za-z])(?=.*\d).+$/)
  password!: string;
}
