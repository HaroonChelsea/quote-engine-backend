import { Controller, Post, Body, Get } from '@nestjs/common';
import { OptionsService } from './options.service';
import { CreateOptionGroupDto } from './dto/create-option-group.dto';
import { CreateOptionDto } from './dto/create-option.dto';

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
}
