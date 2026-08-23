import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateUserDto {
  @IsString({ message: 'Name must be a string' })
  @MinLength(1, { message: 'Name must not be empty' })
  @MaxLength(255, { message: 'Name must not exceed 255 characters' })
  @IsOptional()
  name?: string;

  @IsString({ message: 'Username must be a string' })
  @MinLength(1, { message: 'Username must not be empty' })
  @MaxLength(255, { message: 'Username must not exceed 255 characters' })
  @IsOptional()
  username?: string;
}
