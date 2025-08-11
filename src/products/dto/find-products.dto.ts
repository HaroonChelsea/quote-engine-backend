import { IsOptional, IsString, IsNumberString } from 'class-validator';

export class FindProductsDto {
  @IsOptional()
  @IsNumberString()
  page?: string;

  @IsOptional()
  @IsNumberString()
  limit?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  vendor?: string;
}
