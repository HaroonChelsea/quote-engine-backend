import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../database/database-connection';
import { eq, and } from 'drizzle-orm';
import {
  shopifyProductMappings,
  shopifyVariantMappings,
  shopifyOptionMappings,
  shopifyAddonMappings,
} from './shopify-product-mapping.schema';
import {
  productOptionGroups,
  productOptions,
} from '../products/product-option-groups.schema';

export interface SelectedProductOption {
  optionGroupId: number;
  optionId: number;
  optionName: string;
  optionGroupName: string;
  optionGroupType: 'COLOR' | 'ADDON' | 'SIZE' | 'MATERIAL' | 'CUSTOM';
}

export interface VariantMatchResult {
  variantId: string;
  price: string;
  sku: string;
  variantTitle?: string;
  addonProducts?: Array<{
    productId: string;
    variantId: string;
    price: string;
    title: string;
  }>;
}

@Injectable()
export class ShopifyVariantMatcherService {
  private readonly logger = new Logger(ShopifyVariantMatcherService.name);

  constructor(@Inject(DATABASE_CONNECTION) private db: any) {}

  /**
   * Find matching Shopify variant for a product with selected options
   */
  async findMatchingVariant(
    productId: number,
    selectedOptions: SelectedProductOption[],
  ): Promise<VariantMatchResult | null> {
    try {
      this.logger.log(
        `Finding variant for product ${productId} with options:`,
        selectedOptions,
      );

      // 1. Get the product mapping
      const productMapping = await this.db
        .select()
        .from(shopifyProductMappings)
        .where(eq(shopifyProductMappings.localProductId, productId))
        .limit(1);

      if (productMapping.length === 0) {
        this.logger.warn(`No Shopify mapping found for product ${productId}`);
        return null;
      }

      const mapping = productMapping[0];

      // 2. Get all variant mappings for this product
      const variantMappings = await this.db
        .select()
        .from(shopifyVariantMappings)
        .where(eq(shopifyVariantMappings.productMappingId, mapping.id));

      // 3. Find the best matching variant
      const bestMatch = await this.findBestVariantMatch(
        mapping.id,
        variantMappings,
        selectedOptions,
      );

      if (bestMatch) {
        // 4. Get addon products if any ADDON options are selected
        const addonProducts = await this.getAddonProducts(
          mapping.id,
          selectedOptions.filter((opt) => opt.optionGroupType === 'ADDON'),
        );

        return {
          variantId: bestMatch.shopifyVariantId,
          price: bestMatch.shopifyPrice || '0',
          sku: bestMatch.shopifySku || '',
          variantTitle: bestMatch.shopifyVariantTitle,
          addonProducts,
        };
      }

      this.logger.warn(`No matching variant found for product ${productId}`);
      return null;
    } catch (error) {
      this.logger.error('Error finding matching variant:', error);
      return null;
    }
  }

  /**
   * Find the best matching variant based on selected options
   */
  private async findBestVariantMatch(
    productMappingId: number,
    variantMappings: any[],
    selectedOptions: SelectedProductOption[],
  ): Promise<any | null> {
    // Group options by type
    const colorOptions = selectedOptions.filter(
      (opt) => opt.optionGroupType === 'COLOR',
    );
    const sizeOptions = selectedOptions.filter(
      (opt) => opt.optionGroupType === 'SIZE',
    );
    const materialOptions = selectedOptions.filter(
      (opt) => opt.optionGroupType === 'MATERIAL',
    );

    // First, try to match by option names (more reliable when option mappings are missing)
    for (const variant of variantMappings) {
      const variantOptions = variant.optionValues as Record<string, string>;

      // Check if this variant matches any selected color options by name
      const colorOptions = selectedOptions.filter(
        (opt) => opt.optionGroupType === 'COLOR',
      );
      for (const colorOption of colorOptions) {
        if (variantOptions['Color'] === colorOption.optionName) {
          this.logger.log(
            `Found variant match by name: ${colorOption.optionName} -> ${variant.shopifyVariantTitle}`,
          );
          return variant;
        }
      }
    }

    // If no name match, try the original option ID matching
    for (const variant of variantMappings) {
      const variantOptions = variant.optionValues as Record<string, string>;
      const localOptionIds = variant.localOptionIds as number[];

      // Check if this variant matches the selected core options
      const matches = await this.checkVariantMatch(
        productMappingId,
        localOptionIds,
        [...colorOptions, ...sizeOptions, ...materialOptions],
      );

      if (matches && variant.isAvailable) {
        return variant;
      }
    }

    // If still no match, return the first available variant
    const firstAvailable = variantMappings.find((v) => v.isAvailable);
    return firstAvailable || null;
  }

  /**
   * Check if a variant matches the selected options
   */
  private async checkVariantMatch(
    productMappingId: number,
    variantLocalOptionIds: number[],
    selectedOptions: SelectedProductOption[],
  ): Promise<boolean> {
    if (selectedOptions.length === 0) {
      return true; // No options selected, any variant is fine
    }

    // Get the option mappings for this product
    const optionMappings = await this.db
      .select()
      .from(shopifyOptionMappings)
      .where(eq(shopifyOptionMappings.productMappingId, productMappingId));

    // Check if all selected options are in the variant's option IDs
    for (const selectedOption of selectedOptions) {
      const optionMapping = optionMappings.find(
        (mapping) => mapping.localOptionId === selectedOption.optionId,
      );

      if (!optionMapping) {
        this.logger.warn(
          `No Shopify mapping found for option ${selectedOption.optionId}`,
        );
        continue;
      }

      // Check if this option is part of the variant
      if (!variantLocalOptionIds.includes(selectedOption.optionId)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get addon products for selected ADDON options
   */
  private async getAddonProducts(
    productMappingId: number,
    addonOptions: SelectedProductOption[],
  ): Promise<
    Array<{
      productId: string;
      variantId: string;
      price: string;
      title: string;
    }>
  > {
    if (addonOptions.length === 0) {
      return [];
    }

    const addonProducts: Array<{
      productId: string;
      variantId: string;
      price: string;
      title: string;
    }> = [];

    for (const addonOption of addonOptions) {
      const addonMapping = await this.db
        .select()
        .from(shopifyAddonMappings)
        .where(
          and(
            eq(shopifyAddonMappings.productMappingId, productMappingId),
            eq(shopifyAddonMappings.localOptionId, addonOption.optionId),
          ),
        )
        .limit(1);

      if (addonMapping.length > 0) {
        const mapping = addonMapping[0];
        addonProducts.push({
          productId: mapping.shopifyAddonProductId,
          variantId: mapping.shopifyAddonVariantId || '',
          price: mapping.addonPrice || '0',
          title: mapping.addonTitle || addonOption.optionName,
        });
      }
    }

    return addonProducts;
  }

  /**
   * Get product-specific options for a product
   */
  async getProductOptions(productId: number): Promise<{
    optionGroups: Array<{
      id: number;
      name: string;
      type: string;
      isRequired: boolean;
      isMultiSelect: boolean;
      options: Array<{
        id: number;
        name: string;
        price: string;
        shopifyVariantId?: string;
        shopifyProductId?: string;
        shopifySku?: string;
      }>;
    }>;
  }> {
    const optionGroups = await this.db
      .select()
      .from(productOptionGroups)
      .where(eq(productOptionGroups.productId, productId))
      .orderBy(productOptionGroups.displayOrder);

    const result: Array<{
      id: number;
      name: string;
      type: string;
      isRequired: boolean;
      isMultiSelect: boolean;
      options: Array<{
        id: number;
        name: string;
        price: string;
        shopifyVariantId?: string;
        shopifyProductId?: string;
        shopifySku?: string;
      }>;
    }> = [];

    for (const group of optionGroups) {
      const options = await this.db
        .select()
        .from(productOptions)
        .where(eq(productOptions.productOptionGroupId, group.id))
        .orderBy(productOptions.displayOrder);

      result.push({
        id: group.id,
        name: group.name,
        type: group.type,
        isRequired: group.isRequired,
        isMultiSelect: group.isMultiSelect,
        options: options.map((opt) => ({
          id: opt.id,
          name: opt.name,
          price: opt.price,
          shopifyVariantId: opt.shopifyVariantId,
          shopifyProductId: opt.shopifyProductId,
          shopifySku: opt.shopifySku,
        })),
      });
    }

    return { optionGroups: result };
  }
}
