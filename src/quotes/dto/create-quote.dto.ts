import { Type } from 'class-transformer';
import {
  IsArray,
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

class CustomerInfoDto {
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsString()
  @IsNotEmpty()
  companyName: string;

  @IsEmail()
  email: string;

  @IsString()
  phone: string;

  @IsString()
  @IsNotEmpty()
  streetAddress: string;

  @IsString()
  @IsNotEmpty()
  city: string;

  @IsString()
  @IsNotEmpty()
  state: string;

  @IsString()
  @IsNotEmpty()
  zip: string;

  @IsString()
  @IsOptional()
  country?: string;
}

class SelectedOptionDto {
  @IsNumber()
  id: number;

  @IsNumber()
  @IsOptional()
  optionGroupId?: number;

  @IsString()
  name: string;

  @IsString()
  price: string;

  @IsString()
  @IsOptional()
  groupName?: string;

  @IsString()
  @IsOptional()
  groupType?: string;

  @IsString()
  @IsOptional()
  description?: string;
}

class SelectedProductDto {
  @IsNumber()
  id: number;

  @IsString()
  title: string;

  @IsString()
  basePrice: string;

  @IsNumber()
  quantity: number;

  @IsString()
  unitType: string;

  @IsNumber()
  unitQuantity: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SelectedOptionDto)
  selectedOptions: SelectedOptionDto[];
}

class ShippingInfoDto {
  @IsString()
  @IsOptional()
  method?: string;

  @IsString()
  @IsOptional()
  cost?: string;

  @IsString()
  @IsOptional()
  estimatedDays?: string;
}

class EmailMessageDto {
  @IsString()
  @IsNotEmpty()
  subject: string;

  @IsString()
  @IsNotEmpty()
  message: string;
}

export class CreateQuoteDto {
  @IsObject()
  @ValidateNested()
  @Type(() => CustomerInfoDto)
  customerInfo: CustomerInfoDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SelectedProductDto)
  selectedProducts: SelectedProductDto[];

  @IsObject()
  @ValidateNested()
  @Type(() => ShippingInfoDto)
  @IsOptional()
  shippingInfo?: ShippingInfoDto;

  @IsObject()
  @ValidateNested()
  @Type(() => EmailMessageDto)
  @IsOptional()
  emailMessage?: EmailMessageDto;

  @IsNumber()
  @IsOptional()
  createdBy?: number;
}
