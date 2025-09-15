import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../database/database-connection';
import { eq, and, desc, asc, sql } from 'drizzle-orm';
import { products } from './products.schema';
import { productDimensions } from './product-dimensions.schema';
import {
  productOptionGroups,
  productOptions,
} from './product-option-groups.schema';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(@Inject(DATABASE_CONNECTION) private db: any) {}

  async getAllProducts(shopifyId?: string) {
    this.logger.log('Getting all products');

    let query = this.db
      .select()
      .from(products)
      .where(eq(products.isActive, true));

    if (shopifyId) {
      query = query.where(
        and(eq(products.isActive, true), eq(products.shopifyId, shopifyId)),
      );
    }

    const allProducts = await query.orderBy(asc(products.title));

    return allProducts;
  }

  async getProductById(productId: number) {
    this.logger.log(`Getting product ${productId}`);

    const product = await this.db
      .select()
      .from(products)
      .where(and(eq(products.id, productId), eq(products.isActive, true)))
      .limit(1);

    if (product.length === 0) {
      return null;
    }

    return product[0];
  }

  async getProductWithOptions(productId: number) {
    this.logger.log(`Getting product ${productId} with options`);

    const product = await this.getProductById(productId);
    if (!product) {
      return null;
    }

    // Get product option groups
    const optionGroups = await this.db
      .select()
      .from(productOptionGroups)
      .where(eq(productOptionGroups.productId, productId))
      .orderBy(asc(productOptionGroups.displayOrder));

    // Get options for each group
    const groupsWithOptions = await Promise.all(
      optionGroups.map(async (group) => {
        const options = await this.db
          .select()
          .from(productOptions)
          .where(eq(productOptions.productOptionGroupId, group.id))
          .orderBy(asc(productOptions.displayOrder));

        return {
          ...group,
          options,
        };
      }),
    );

    return {
      ...product,
      optionGroups: groupsWithOptions,
    };
  }

  async getProductDimensions(productId: number) {
    this.logger.log(`Getting dimensions for product ${productId}`);

    const dimensions = await this.db
      .select()
      .from(productDimensions)
      .where(eq(productDimensions.productId, productId))
      .orderBy(asc(productDimensions.name));

    return dimensions;
  }

  async createProduct(productData: {
    title: string;
    description?: string;
    basePrice: string;
    imageUrl?: string;
    weightKg?: string;
    lengthCm?: string;
    widthCm?: string;
    heightCm?: string;
    volumeCbm?: string;
    shopifyId?: string;
  }) {
    this.logger.log(`Creating product: ${productData.title}`);

    const result = await this.db
      .insert(products)
      .values(productData)
      .returning();

    return result[0];
  }

  async createProductOptionGroup(groupData: {
    productId: number;
    name: string;
    type: 'COLOR' | 'ADDON' | 'SIZE' | 'MATERIAL' | 'CUSTOM';
    isRequired?: boolean;
    isMultiSelect?: boolean;
    displayOrder?: number;
    description?: string;
  }) {
    this.logger.log(
      `Creating option group: ${groupData.name} for product ${groupData.productId}`,
    );

    const result = await this.db
      .insert(productOptionGroups)
      .values(groupData)
      .returning();

    return result[0];
  }

  async createProductOption(optionData: {
    productOptionGroupId: number;
    name: string;
    price: string;
    description?: string;
    isAvailable?: boolean;
    displayOrder?: number;
    shopifyVariantId?: string;
    shopifyProductId?: string;
    shopifySku?: string;
  }) {
    this.logger.log(`Creating option: ${optionData.name}`);

    const result = await this.db
      .insert(productOptions)
      .values(optionData)
      .returning();

    return result[0];
  }

  async createProductDimension(dimensionData: {
    productId: number;
    name: string;
    type: 'pallet' | 'box';
    quantity?: number;
    weightKg: string;
    lengthCm: string;
    widthCm: string;
    heightCm: string;
    volumeCbm?: string;
    price?: string;
  }) {
    this.logger.log(
      `Creating dimension: ${dimensionData.name} for product ${dimensionData.productId}`,
    );

    const result = await this.db
      .insert(productDimensions)
      .values(dimensionData)
      .returning();

    return result[0];
  }

  async createOptionGroup(optionGroupData: {
    productId: number;
    name: string;
    type: 'COLOR' | 'ADDON' | 'SIZE' | 'MATERIAL' | 'CUSTOM';
    isRequired?: boolean;
    isMultiSelect?: boolean;
    displayOrder?: number;
    description?: string;
  }) {
    this.logger.log(
      `Creating option group: ${optionGroupData.name} for product ${optionGroupData.productId}`,
    );

    const result = await this.db
      .insert(productOptionGroups)
      .values({
        productId: optionGroupData.productId,
        name: optionGroupData.name,
        type: optionGroupData.type,
        isRequired: optionGroupData.isRequired || false,
        isMultiSelect: optionGroupData.isMultiSelect || false,
        displayOrder: optionGroupData.displayOrder || 0,
        description: optionGroupData.description,
      })
      .returning();

    return result[0];
  }

  async createOption(optionData: {
    productOptionGroupId: number;
    name: string;
    price?: string;
    description?: string;
    shopifyVariantId?: string;
    shopifyProductId?: string;
    shopifySku?: string;
    isAvailable?: boolean;
    displayOrder?: number;
  }) {
    this.logger.log(
      `Creating option: ${optionData.name} for group ${optionData.productOptionGroupId}`,
    );

    const result = await this.db
      .insert(productOptions)
      .values({
        productOptionGroupId: optionData.productOptionGroupId,
        name: optionData.name,
        price: optionData.price || '0',
        description: optionData.description,
        shopifyVariantId: optionData.shopifyVariantId,
        shopifyProductId: optionData.shopifyProductId,
        shopifySku: optionData.shopifySku,
        isAvailable:
          optionData.isAvailable !== undefined ? optionData.isAvailable : true,
        displayOrder: optionData.displayOrder || 0,
      })
      .returning();

    return result[0];
  }

  async getAllProductOptionGroups() {
    this.logger.log('Getting all product option groups');

    const optionGroups = await this.db
      .select({
        id: productOptionGroups.id,
        productId: productOptionGroups.productId,
        name: productOptionGroups.name,
        type: productOptionGroups.type,
        isRequired: productOptionGroups.isRequired,
        isMultiSelect: productOptionGroups.isMultiSelect,
        displayOrder: productOptionGroups.displayOrder,
        description: productOptionGroups.description,
        createdAt: productOptionGroups.createdAt,
        updatedAt: productOptionGroups.updatedAt,
        productTitle: products.title,
      })
      .from(productOptionGroups)
      .leftJoin(products, eq(productOptionGroups.productId, products.id))
      .orderBy(asc(products.title), asc(productOptionGroups.displayOrder));

    // Get options count for each group
    const optionGroupsWithCounts = await Promise.all(
      optionGroups.map(async (group) => {
        const optionsCount = await this.db
          .select({ count: sql<number>`count(*)` })
          .from(productOptions)
          .where(eq(productOptions.productOptionGroupId, group.id));

        return {
          ...group,
          optionsCount: optionsCount[0]?.count || 0,
        };
      }),
    );

    return optionGroupsWithCounts;
  }

  async getProductsWithOptionCounts() {
    this.logger.log('Getting products with option counts');

    const productsWithCounts = await this.db
      .select({
        id: products.id,
        title: products.title,
        description: products.description,
        basePrice: products.basePrice,
        imageUrl: products.imageUrl,
        isActive: products.isActive,
        createdAt: products.createdAt,
        shopifyId: products.shopifyId,
        weightKg: products.weightKg,
        lengthCm: products.lengthCm,
        widthCm: products.widthCm,
        heightCm: products.heightCm,
        volumeCbm: products.volumeCbm,
        optionGroupsCount: sql<number>`count(distinct ${productOptionGroups.id})`,
        totalOptionsCount: sql<number>`count(${productOptions.id})`,
      })
      .from(products)
      .leftJoin(
        productOptionGroups,
        eq(products.id, productOptionGroups.productId),
      )
      .leftJoin(
        productOptions,
        eq(productOptionGroups.id, productOptions.productOptionGroupId),
      )
      .where(eq(products.isActive, true))
      .groupBy(
        products.id,
        products.title,
        products.description,
        products.basePrice,
        products.imageUrl,
        products.isActive,
        products.createdAt,
        products.shopifyId,
        products.weightKg,
        products.lengthCm,
        products.widthCm,
        products.heightCm,
        products.volumeCbm,
      )
      .orderBy(asc(products.title));

    return productsWithCounts;
  }

  async updateProductDimension(dimensionId: number, dimensionData: any) {
    this.logger.log(`Updating product dimension ${dimensionId}`);

    const result = await this.db
      .update(productDimensions)
      .set({
        ...dimensionData,
        updatedAt: new Date(),
      })
      .where(eq(productDimensions.id, dimensionId))
      .returning();

    if (result.length === 0) {
      throw new Error(`Product dimension with ID ${dimensionId} not found`);
    }

    return result[0];
  }

  async deleteProductDimension(dimensionId: number) {
    this.logger.log(`Deleting product dimension ${dimensionId}`);

    const result = await this.db
      .delete(productDimensions)
      .where(eq(productDimensions.id, dimensionId))
      .returning();

    if (result.length === 0) {
      throw new Error(`Product dimension with ID ${dimensionId} not found`);
    }

    return result[0];
  }
}
