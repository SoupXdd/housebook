import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import type { ReadingStatus } from '../types';

const READING_STATUS_VALUES: ReadingStatus[] = ['unread', 'reading', 'read'];

export class UpdateReadingStatusDto {
  @ApiProperty({ enum: READING_STATUS_VALUES, example: 'reading' })
  @IsIn(READING_STATUS_VALUES)
  readingStatus!: ReadingStatus;
}
