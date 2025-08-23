import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../database/database-connection';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { CreateProductDto } from './dto/create-product.dto';
import { and, eq, ilike, SQL, sql, inArray } from 'drizzle-orm';
import { FindProductsDto } from './dto/find-products.dto';
import { fullSchema } from 'src/database/database.module';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly database: NodePgDatabase<typeof fullSchema>,
  ) {}

  async create(dto: CreateProductDto) {
    const { dimensions, ...productData } = dto;

    const valuesToInsert = {
      ...productData,
      basePrice: dto.basePrice.toString(),
      weightKg: dto.weightKg?.toString(),
      lengthCm: dto.lengthCm?.toString(),
      widthCm: dto.widthCm?.toString(),
      heightCm: dto.heightCm?.toString(),
      volumeCbm: dto.volumeCbm?.toString(),
      goodsValue: dto.goodsValue?.toString(),
    };

    const [newProduct] = await this.database
      .insert(fullSchema.products)
      .values(valuesToInsert)
      .returning();

    // Handle dimensions if provided
    if (dimensions && dimensions.length > 0) {
      await this.createProductDimensions(newProduct.id, dimensions);
    }

    return this.findOne(newProduct.id);
  }

  async createProductDimensions(productId: number, dimensions: any[]) {
    const dimensionValues = dimensions.map((dim) => ({
      productId,
      name: dim.name,
      type: dim.type,
      quantity: dim.quantity || 1,
      weightKg: dim.weightKg.toString(),
      lengthCm: dim.lengthCm.toString(),
      widthCm: dim.widthCm.toString(),
      heightCm: dim.heightCm.toString(),
      volumeCbm: dim.volumeCbm?.toString(),
    }));

    return this.database
      .insert(fullSchema.productDimensions)
      .values(dimensionValues);
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
          with: {
            productOptions: { with: { option: { with: { group: true } } } },
          },
          limit: limit,
          offset: offset,
        })
      : this.database.query.products.findMany({
          with: {
            productOptions: { with: { option: { with: { group: true } } } },
          },
          limit: limit,
          offset: offset,
        });

    const totalPromise = this.database
      .select({ count: sql<number>`count(*)` })
      .from(fullSchema.products)
      .where(whereClause);

    const [data, total] = await Promise.all([dataPromise, totalPromise]);

    // Get dimensions for all products
    const productIds = data.map((p) => p.id);
    const allDimensions =
      productIds.length > 0
        ? await this.database.query.productDimensions.findMany({
            where: inArray(fullSchema.productDimensions.productId, productIds),
          })
        : [];

    const dimensionsByProductId = allDimensions.reduce(
      (acc, dim) => {
        if (dim.productId && !acc[dim.productId]) {
          acc[dim.productId] = [];
        }
        if (dim.productId) {
          acc[dim.productId].push(dim);
        }
        return acc;
      },
      {} as Record<number, any[]>,
    );

    // Group options by their group name for each product
    const productsWithGroupedOptions = data.map((product) => {
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

      // Remove the flat productOptions array and add the grouped options
      const { productOptions, ...productWithoutOptions } = product;
      return {
        ...productWithoutOptions,
        options: groupedOptions,
        dimensions: dimensionsByProductId[product.id] || [],
      };
    });

    const totalItems = Number(total[0].count);
    const totalPages = Math.ceil(totalItems / limit);

    return {
      data: productsWithGroupedOptions,
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

    // Get product dimensions
    const dimensions = await this.database.query.productDimensions.findMany({
      where: eq(fullSchema.productDimensions.productId, id),
    });

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

    return { ...product, options: groupedOptions, dimensions };
  }

  async linkOptionsToProduct(productId: number, optionIds: number[]) {
    // First, delete existing links for this product
    await this.database
      .delete(fullSchema.productOptions)
      .where(eq(fullSchema.productOptions.productId, productId));

    // Then insert new links
    if (optionIds.length > 0) {
      const links = optionIds.map((optionId) => ({ productId, optionId }));
      const result = await this.database
        .insert(fullSchema.productOptions)
        .values(links)
        .returning();

      return {
        message: `Successfully linked ${result.length} options to product`,
        linkedCount: result.length,
        optionIds: result.map((r) => r.optionId),
      };
    }

    return {
      message: 'No options to link',
      linkedCount: 0,
      optionIds: [],
    };
  }

  async update(id: number, dto: UpdateProductDto) {
    const valuesToUpdate: Partial<{
      title: string;
      basePrice: string;
      description: string;
    }> = {};
    if (dto.title) valuesToUpdate.title = dto.title;
    if (dto.description) valuesToUpdate.description = dto.description;
    if (dto.basePrice) valuesToUpdate.basePrice = dto.basePrice.toString();

    const [updatedProduct] = await this.database
      .update(fullSchema.products)
      .set(valuesToUpdate)
      .where(eq(fullSchema.products.id, id))
      .returning();

    if (!updatedProduct) throw new NotFoundException('Product not found');
    return updatedProduct;
  }

  async remove(id: number) {
    const [deletedProduct] = await this.database
      .delete(fullSchema.products)
      .where(eq(fullSchema.products.id, id))
      .returning();

    if (!deletedProduct) throw new NotFoundException('Product not found');
    return { message: 'Product deleted successfully' };
  }

  async getProductDimensionsByType(productId: number, type: string) {
    const dimensions = await this.database.query.productDimensions.findMany({
      where: and(
        eq(fullSchema.productDimensions.productId, productId),
        eq(fullSchema.productDimensions.type, type),
      ),
    });

    return dimensions;
  }

  async createProductDimension(productId: number, dimensionData: any) {
    const [newDimension] = await this.database
      .insert(fullSchema.productDimensions)
      .values({
        productId,
        name: dimensionData.name,
        type: dimensionData.type,
        quantity: dimensionData.quantity,
        weightKg: dimensionData.weightKg.toString(),
        lengthCm: dimensionData.lengthCm.toString(),
        widthCm: dimensionData.widthCm.toString(),
        heightCm: dimensionData.heightCm.toString(),
        volumeCbm: dimensionData.volumeCbm?.toString(),
      })
      .returning();

    return newDimension;
  }

  async updateProductDimension(productId: number, dimensionId: number, dimensionData: any) {
    const [updatedDimension] = await this.database
      .update(fullSchema.productDimensions)
      .set({
        name: dimensionData.name,
        type: dimensionData.type,
        quantity: dimensionData.quantity,
        weightKg: dimensionData.weightKg.toString(),
        lengthCm: dimensionData.lengthCm.toString(),
        widthCm: dimensionData.widthCm.toString(),
        heightCm: dimensionData.heightCm.toString(),
        volumeCbm: dimensionData.volumeCbm?.toString(),
      })
      .where(
        and(
          eq(fullSchema.productDimensions.id, dimensionId),
          eq(fullSchema.productDimensions.productId, productId)
        )
      )
      .returning();

    if (!updatedDimension) {
      throw new NotFoundException('Product dimension not found');
    }

    return updatedDimension;
  }

  async deleteProductDimension(productId: number, dimensionId: number) {
    const [deletedDimension] = await this.database
      .delete(fullSchema.productDimensions)
      .where(
        and(
          eq(fullSchema.productDimensions.id, dimensionId),
          eq(fullSchema.productDimensions.productId, productId)
        )
      )
      .returning();

    if (!deletedDimension) {
      throw new NotFoundException('Product dimension not found');
    }

    return { message: 'Product dimension deleted successfully' };
  }
}
