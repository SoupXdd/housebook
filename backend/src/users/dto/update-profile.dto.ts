import { ApiPropertyOptional } from '@nestjs/swagger';
import { ValidateIf } from 'class-validator';
import {
  IsEmail,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional({
    example: 'Alexey Petrov',
    minLength: 2,
    maxLength: 120,
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional({ example: 'alexey@housebook.local' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: 'https://example.com/avatar.jpg' })
  @IsOptional()
  @ValidateIf((_object, value) => value !== '')
  @IsUrl()
  avatarUrl?: string;

  @ApiPropertyOptional({
    example: 'Люблю читать фантастику и нон-фикшн',
    maxLength: 400,
  })
  @IsOptional()
  @IsString()
  @MaxLength(400)
  bio?: string;
}
