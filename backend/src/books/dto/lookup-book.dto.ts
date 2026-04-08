import { IsString, IsOptional, IsUrl, ValidateIf } from 'class-validator';

export class LookupBookDto {
  @ValidateIf((value: LookupBookDto) => !value.url)
  @IsString()
  @IsOptional()
  isbn?: string;

  @ValidateIf((value: LookupBookDto) => !value.isbn)
  @IsUrl()
  @IsOptional()
  url?: string;
}
