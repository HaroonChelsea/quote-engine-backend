import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../database/database-connection';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { CreateProductDto } from './dto/create-product.dto';
import { and, eq, ilike, SQL, sql } from 'drizzle-orm';
import { FindProductsDto } from './dto/find-products.dto';
import { fullSchema } from 'src/database/database.module';

@Injectable()
export class ProductsService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly database: NodePgDatabase<typeof fullSchema>,
  ) {}

  async create(dto: CreateProductDto) {
    const { optionIds, ...productData } = dto;

    const valuesToInsert = {
      ...productData,
      basePrice: dto.basePrice.toString(),
    };

    const [newProduct] = await this.database
      .insert(fullSchema.products)
      .values(valuesToInsert)
      .returning();

    if (optionIds && optionIds.length > 0) {
      await this.linkOptionsToProduct(newProduct.id, optionIds);
    }

    return this.findOne(newProduct.id);
  }

  // This method was missing the implementation
  async findAll(query: FindProductsDto) {
    const page = parseInt(query.page || '1', 10);
    const limit = parseInt(query.limit || '10', 10);
    const offset = (page - 1) * limit;

    const conditions: SQL[] = [];
    if (query.search) {
      conditions.push(ilike(fullSchema.products.title, `%${query.search}%`));
    }
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const dataPromise = whereClause
      ? this.database.query.products.findMany({
          where: whereClause,
          with: { productOptions: { with: { option: true } } },
          limit: limit,
          offset: offset,
        })
      : this.database.query.products.findMany({
          with: { productOptions: { with: { option: true } } },
          limit: limit,
          offset: offset,
        });

    const totalPromise = this.database
      .select({ count: sql<number>`count(*)` })
      .from(fullSchema.products)
      .where(whereClause);

    const [data, total] = await Promise.all([dataPromise, totalPromise]);

    const totalItems = Number(total[0].count);
    const totalPages = Math.ceil(totalItems / limit);

    return {
      data,
      meta: {
        totalItems,
        itemCount: data.length,
        itemsPerPage: limit,
        totalPages,
        currentPage: page,
      },
    };
  }

  async findOne(id: number) {
    const product = await this.database.query.products.findFirst({
      where: eq(fullSchema.products.id, id),
      with: {
        productOptions: {
          with: { option: { with: { group: true } } },
        },
      },
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const groupedOptions = product.productOptions.reduce((acc, po) => {
      const groupName = po.option.group.name;
      if (!acc[groupName]) {
        acc[groupName] = {
          type: po.option.group.type,
          items: [],
        };
      }
      acc[groupName].items.push(po.option);
      return acc;
    }, {});

    return { ...product, options: groupedOptions };
  }

  async linkOptionsToProduct(productId: number, optionIds: number[]) {
    const links = optionIds.map((optionId) => ({ productId, optionId }));
    return this.database
      .insert(fullSchema.productOptions)
      .values(links)
      .onConflictDoNothing();
  }
}
