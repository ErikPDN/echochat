import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';

export class CreateGroupConversationDto {
  @IsString({ message: 'Group name must be a string' })
  @MinLength(1, { message: 'Group name must not be empty' })
  groupName?: string;

  @IsArray({ message: 'Member IDs must be an array' })
  @ArrayMinSize(1, { message: 'At least one member ID is required' })
  @ArrayUnique({ message: 'Member IDs must be unique' })
  @IsUUID('4', {
    each: true,
    message: 'Each member ID must be a valid UUID v4',
  })
  memberIds!: string[];
}
