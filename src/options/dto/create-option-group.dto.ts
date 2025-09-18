import {
  IsEnum,
  IsNotEmpty,
  IsString,
  IsOptional,
  IsNumber,
} from 'class-validator';

export class CreateOptionGroupDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(['SINGLE_SELECT', 'MULTI_SELECT'])
  type: 'SINGLE_SELECT' | 'MULTI_SELECT';

  @IsOptional()
  @IsNumber()
  step?: number;

  @IsOptional()
  @IsString()
  description?: string;
}
