import { IsString, IsNotEmpty, MinLength } from 'class-validator';

export class SearchBookDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  title: string;
}
