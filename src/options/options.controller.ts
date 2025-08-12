import {
  Controller,
  Post,
  Body,
  Get,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { OptionsService } from './options.service';
import { CreateOptionGroupDto } from './dto/create-option-group.dto';
import { CreateOptionDto } from './dto/create-option.dto';
import { UpdateOptionDto } from './dto/update-option.dto';

@Controller('options')
export class OptionsController {
  constructor(private readonly optionsService: OptionsService) {}

  @Post('groups')
  createGroup(@Body() createOptionGroupDto: CreateOptionGroupDto) {
    return this.optionsService.createGroup(createOptionGroupDto);
  }

  @Get('groups')
  findAllGroups() {
    return this.optionsService.findAllGroups();
  }

  @Post()
  createOption(@Body() createOptionDto: CreateOptionDto) {
    return this.optionsService.createOption(createOptionDto);
  }

  @Patch(':id')
  updateOption(
    @Param('id') id: string,
    @Body() updateOptionDto: UpdateOptionDto,
  ) {
    return this.optionsService.updateOption(Number(id), updateOptionDto);
  }

  @Delete(':id')
  removeOption(@Param('id') id: string) {
    return this.optionsService.removeOption(Number(id));
  }

  @Delete('groups/:id')
  removeGroup(@Param('id') id: string) {
    return this.optionsService.removeGroup(Number(id));
  }
}
