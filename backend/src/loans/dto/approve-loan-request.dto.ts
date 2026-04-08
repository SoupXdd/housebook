import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional } from 'class-validator';

export class ApproveLoanRequestDto {
  @ApiPropertyOptional({ example: '2026-04-20T12:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  dueAt?: string;
}
