import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

export class CreateLoanDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  bookId!: number;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  borrowerUserId?: number;

  @ApiPropertyOptional({ example: 'Мария Иванова', maxLength: 120 })
  @ValidateIf(
    (object: CreateLoanDto) =>
      !object.borrowerUserId || Boolean(object.borrowerName),
  )
  @IsOptional()
  @IsString()
  @MaxLength(120)
  borrowerName?: string;

  @ApiPropertyOptional({ example: '2026-04-05T12:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  lentAt?: string;

  @ApiPropertyOptional({ example: '2026-04-20T12:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  dueAt?: string;
}
