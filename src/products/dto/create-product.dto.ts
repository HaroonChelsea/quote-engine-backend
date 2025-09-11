import {
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsArray,
  Min,
} from 'class-validator';
import { CreateProductDimensionDto } from './create-product-dimension.dto';

export class CreateProductDto {
  @IsString()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @Min(0)
  basePrice: number;

  @IsString()
  @IsOptional()
  imageUrl?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsString()
  @IsOptional()
  shopifyId?: string;

  // Product dimensions for shipping calculations
  @IsNumber()
  @IsOptional()
  weightKg?: number;

  @IsNumber()
  @IsOptional()
  lengthCm?: number;

  @IsNumber()
  @IsOptional()
  widthCm?: number;

  @IsNumber()
  @IsOptional()
  heightCm?: number;

  @IsNumber()
  @IsOptional()
  volumeCbm?: number;

  // Goods value for shipping insurance and customs
  @IsNumber()
  @IsOptional()
  goodsValue?: number;

  // Detailed shipping dimensions
  @IsArray()
  @IsOptional()
  dimensions?: CreateProductDimensionDto[];
}
