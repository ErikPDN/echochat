import { ArrayUnique, IsArray, IsUUID } from 'class-validator';

export class VerifyUsersDto {
  @IsArray({ message: 'User IDs must be an array' })
  @ArrayUnique({ message: 'User IDs must be unique' })
  @IsUUID('4', {
    each: true,
    message: 'Each user ID must be a valid UUID',
  })
  userIds!: string[];
}
