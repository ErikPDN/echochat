import { IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsString({ message: 'Identifier must be a string' })
  @MinLength(3, { message: 'Identifier must be at least 3 characters long' })
  identifier!: string;

  @IsString({ message: 'Password must be a string' })
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  password!: string;
}
