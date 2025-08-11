import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../database/database-connection';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { eq, inArray } from 'drizzle-orm';
import { fullSchema } from 'src/database/database.module';

@Injectable()
export class QuotesService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly database: NodePgDatabase<typeof fullSchema>,
  ) {}

  async createQuote(dto: CreateQuoteDto) {
    let customer = await this.database.query.customers.findFirst({
      where: eq(fullSchema.customers.email, dto.customerInfo.email),
    });
    if (!customer) {
      [customer] = await this.database
        .insert(fullSchema.customers)
        .values(dto.customerInfo)
        .returning();
    }

    const product = await this.database.query.products.findFirst({
      where: eq(fullSchema.products.id, dto.productId),
    });
    if (!product) throw new NotFoundException('Product not found');

    const selectedOptions =
      dto.optionIds.length > 0
        ? await this.database.query.options.findMany({
            where: inArray(fullSchema.options.id, dto.optionIds),
          })
        : [];

    const basePrice = parseFloat(product.basePrice);
    const optionsPrice = selectedOptions.reduce(
      (sum, opt) => sum + parseFloat(opt.price),
      0,
    );
    const totalAmount = basePrice + optionsPrice;

    const [newQuote] = await this.database
      .insert(fullSchema.quotes)
      .values({
        customerId: customer.id,
        productId: product.id,
        status: 'DRAFT',
        basePrice: basePrice.toFixed(2),
        optionsPrice: optionsPrice.toFixed(2),
        totalAmount: totalAmount.toFixed(2),
      })
      .returning();

    if (selectedOptions.length > 0) {
      const quoteOptionsToInsert = selectedOptions.map((opt) => ({
        quoteId: newQuote.id,
        optionId: opt.id,
        price: opt.price,
      }));
      await this.database
        .insert(fullSchema.quoteOptions)
        .values(quoteOptionsToInsert);
    }

    return this.findQuoteById(newQuote.id);
  }

  async findQuoteById(id: number) {
    return this.database.query.quotes.findFirst({
      where: eq(fullSchema.quotes.id, id),
      with: { customer: true, selectedOptions: true },
    });
  }
}
