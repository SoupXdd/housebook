import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import type { ReadingStatus } from '../types';

const READING_STATUS_VALUES: ReadingStatus[] = ['unread', 'reading', 'read'];

class ManualBookStoreLinkDto {
  @ApiProperty({ example: 'Лабиринт' })
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name!: string;

  @ApiProperty({ example: 'https://www.labirint.ru/books/123456/' })
  @IsUrl({ require_protocol: true })
  @MaxLength(1000)
  url!: string;
}

export class CreateManualBookDto {
  @ApiProperty({ example: 'Братья Карамазовы' })
  @IsString()
  @MinLength(1)
  @MaxLength(300)
  title!: string;

  @ApiPropertyOptional({ example: 'Федор Достоевский' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  author?: string;

  @ApiPropertyOptional({
    example: ['Федор Достоевский'],
    description: 'Use this for multiple authors. If omitted, author is used.',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(12)
  @IsString({ each: true })
  @MaxLength(200, { each: true })
  authors?: string[];

  @ApiPropertyOptional({ example: '9785170900074' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  isbn?: string;

  @ApiPropertyOptional({ example: 'Последний роман Федора Достоевского.' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @ApiPropertyOptional({ example: 'https://example.com/cover.jpg' })
  @IsOptional()
  @IsUrl({ require_protocol: true })
  @MaxLength(1000)
  coverUrl?: string;

  @ApiPropertyOptional({ example: 840 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100000)
  pagesCount?: number;

  @ApiPropertyOptional({ example: 1880 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(3000)
  year?: number;

  @ApiPropertyOptional({ example: 'Классика' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  genre?: string;

  @ApiPropertyOptional({ example: 'Russian' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  language?: string;

  @ApiPropertyOptional({ enum: READING_STATUS_VALUES, example: 'unread' })
  @IsOptional()
  @IsIn(READING_STATUS_VALUES)
  readingStatus?: ReadingStatus;

  @ApiPropertyOptional({
    type: [ManualBookStoreLinkDto],
    example: [{ name: 'Лабиринт', url: 'https://www.labirint.ru/books/123456/' }],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => ManualBookStoreLinkDto)
  storeLinks?: ManualBookStoreLinkDto[];
}
