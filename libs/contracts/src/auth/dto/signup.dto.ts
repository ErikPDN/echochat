import { IsString, MinLength, IsEmail, MaxLength } from 'class-validator';

export class SignupDto {
  @IsString({ message: 'Username must be a string' })
  @MinLength(1, { message: 'Username must be at least 3 characters long' })
  @MaxLength(255, { message: 'Username must not exceed 255 characters' })
  username!: string;

  @IsString({ message: 'Name must be a string' })
  @MinLength(1, { message: 'Name must be at least 3 characters long' })
  @MaxLength(255, { message: 'Name must not exceed 255 characters' })
  name!: string;

  @IsEmail({}, { message: 'Email must be a valid email address' })
  email!: string;

  @IsString({ message: 'Password must be a string' })
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  password!: string;
}
