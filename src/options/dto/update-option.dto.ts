import { IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdateOptionDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsNumber()
  @IsOptional()
  price?: number;
}
