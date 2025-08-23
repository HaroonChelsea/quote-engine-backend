import { IsString, IsNumber, IsOptional, IsIn } from 'class-validator';

export class CreateProductDimensionDto {
  @IsString()
  name: string;

  @IsIn(['pallet', 'box'])
  type: 'pallet' | 'box';

  @IsNumber()
  @IsOptional()
  quantity?: number;

  @IsNumber()
  weightKg: number;

  @IsNumber()
  lengthCm: number;

  @IsNumber()
  widthCm: number;

  @IsNumber()
  heightCm: number;

  @IsNumber()
  @IsOptional()
  volumeCbm?: number;
}
