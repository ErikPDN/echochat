import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { ContentType } from '../enums/content-type.enum';

export class SendMessageDto {
  @IsOptional()
  @IsUUID(4, { message: 'messageId must be a valid UUID v4' })
  messageId?: string;

  @ValidateIf((dto) => dto.contentType === ContentType.TEXT)
  @IsString({ message: 'Content must be a string' })
  @MinLength(1, { message: 'Content must not be empty' })
  @MaxLength(10000, { message: 'Content must not exceed 10000 characters' })
  content?: string;

  @IsEnum(ContentType, { message: 'Content type must be a valid ContentType' })
  contentType!: ContentType;

  @IsOptional()
  @IsArray({ message: 'fileIds must be an array' })
  @IsUUID('4', { each: true, message: 'Each fileId must be a valid UUID v4' })
  fileIds?: string[];
}
