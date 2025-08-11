import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class CreateOptionDto {
  @IsNumber()
  groupId: number;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsNumber()
  price: number;
}
