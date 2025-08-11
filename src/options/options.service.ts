import { Inject, Injectable } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../database/database-connection';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { CreateOptionGroupDto } from './dto/create-option-group.dto';
import { CreateOptionDto } from './dto/create-option.dto';
import { fullSchema } from 'src/database/database.module';

@Injectable()
export class OptionsService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly database: NodePgDatabase<typeof fullSchema>,
  ) {}

  async createGroup(dto: CreateOptionGroupDto) {
    return this.database
      .insert(fullSchema.optionGroups)
      .values(dto)
      .returning();
  }

  async findAllGroups() {
    return this.database.query.optionGroups.findMany({
      with: { options: true },
    });
  }

  async createOption(dto: CreateOptionDto) {
    const valuesToInsert = {
      ...dto,
      price: dto.price.toString(),
    };

    return this.database
      .insert(fullSchema.options)
      .values(valuesToInsert)
      .returning();
  }
}
