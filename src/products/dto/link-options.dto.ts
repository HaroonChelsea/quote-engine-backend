import { IsArray, IsNumber } from 'class-validator';

export class LinkOptionsDto {
  @IsArray()
  @IsNumber({}, { each: true })
  optionIds: number[];
}
