import { Transform } from 'class-transformer';
import { ArrayMaxSize, ArrayNotEmpty, IsArray, IsUUID } from 'class-validator';

export class GetSummaryQueryDto {
  @Transform(({ value }) =>
    Array.isArray(value) ? value : String(value).split(','),
  )
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(100, { message: 'Maximum of 100 conversation IDs allowed.' })
  @IsUUID('4', {
    each: true,
    message: 'Each conversation ID must be a valid UUID.',
  })
  conversationIds!: string[];
}
