import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../database/database-connection';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { CreateOptionGroupDto } from './dto/create-option-group.dto';
import { CreateOptionDto } from './dto/create-option.dto';
import { fullSchema } from 'src/database/database.module';
import { UpdateOptionDto } from './dto/update-option.dto';
import { eq } from 'drizzle-orm';

@Injectable()
export class OptionsService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly database: NodePgDatabase<typeof fullSchema>,
  ) {}

  async createGroup(dto: CreateOptionGroupDto) {
    const valuesToInsert = {
      name: dto.name,
      type: dto.type,
      step: dto.step || 2, // Default to step 2 if not provided
      description: dto.description,
    };

    return this.database
      .insert(fullSchema.optionGroups)
      .values(valuesToInsert)
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

  async updateOption(id: number, dto: UpdateOptionDto) {
    const valuesToUpdate: Partial<{ title: string; price: string }> = {};
    if (dto.title) valuesToUpdate.title = dto.title;
    if (dto.price) valuesToUpdate.price = dto.price.toString();

    const [updatedOption] = await this.database
      .update(fullSchema.options)
      .set(valuesToUpdate)
      .where(eq(fullSchema.options.id, id))
      .returning();

    if (!updatedOption) throw new NotFoundException('Option not found');
    return updatedOption;
  }

  async removeOption(id: number) {
    await this.database
      .delete(fullSchema.options)
      .where(eq(fullSchema.options.id, id));
    return { message: 'Option deleted successfully' };
  }

  async removeGroup(id: number) {
    // The 'onDelete: cascade' in the schema will automatically delete all options in this group.
    await this.database
      .delete(fullSchema.optionGroups)
      .where(eq(fullSchema.optionGroups.id, id));
    return { message: 'Option group and its options deleted successfully' };
  }

  async findOne(id: number) {
    const option = await this.database.query.productOptions.findFirst({
      where: eq(fullSchema.productOptions.id, id),
      with: { optionGroup: true },
    });

    if (!option) {
      throw new NotFoundException(`Option with ID ${id} not found`);
    }

    return option;
  }
}
