import { IsEnum, IsNotEmpty, IsString } from 'class-validator';

export class CreateOptionGroupDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(['SINGLE_SELECT', 'MULTI_SELECT'])
  type: 'SINGLE_SELECT' | 'MULTI_SELECT';
}
