import { Inject, Injectable } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../database/database-connection';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { fullSchema } from 'src/database/database.module';

@Injectable()
export class CustomersService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly database: NodePgDatabase<typeof fullSchema>,
  ) {}

  async create(createCustomerDto: CreateCustomerDto) {
    const [newCustomer] = await this.database
      .insert(fullSchema.customers)
      .values(createCustomerDto)
      .returning();
    return newCustomer;
  }

  async findAll() {
    return this.database.query.customers.findMany();
  }
}
