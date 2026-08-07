import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsEnum,
  IsString,
  IsUUID,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { ConversationType } from '../enums/conversation-type.enum';

export class CreateConversationDto {
  @IsEnum(ConversationType, {
    message: 'Type must be either "private" or "group"',
  })
  type!: ConversationType;

  @ValidateIf((dto) => dto.type === ConversationType.GROUP)
  @IsString({ message: 'Name must be a string' })
  @MinLength(1, { message: 'Name must not be empty' })
  name?: string;

  @IsArray({ message: 'Member IDs must be an array' })
  @ArrayMinSize(1, { message: 'At least one member ID is required' })
  @ArrayUnique({ message: 'Member IDs must be unique' })
  @IsUUID('4', {
    each: true,
    message: 'Each member ID must be a valid UUID v4',
  })
  memberIds!: string[];
}
