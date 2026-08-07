import { ArrayMinSize, ArrayUnique, IsArray, IsUUID } from 'class-validator';

export class VerifyUsersDto {
  @IsArray({ message: 'User IDs must be an array' })
  @ArrayMinSize(1, { message: 'At least one user ID is required' })
  @ArrayUnique({ message: 'User IDs must be unique' })
  @IsUUID('4', {
    each: true,
    message: 'Each user ID must be a valid UUID',
  })
  userIds!: string[];
}
