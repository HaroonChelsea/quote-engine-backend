import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../database/database-connection';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { ShopifyService } from './shopify.service';
import {
  shopifyProductMappings,
  shopifyVariantMappings,
  shopifyOptionMappings,
  shopifyAddonMappings,
  mappingStatusEnum,
  mappingTypeEnum,
} from './shopify-product-mapping.schema';
import { products } from '../products/products.schema';
import { options } from '../options/options.schema';
import { eq, and } from 'drizzle-orm';

export interface ShopifyProductData {
  id: string;
  title: string;
  handle: string;
  variants: {
    edges: Array<{
      node: {
        id: string;
        title: string;
        price: string;
        sku: string;
        availableForSale: boolean;
        selectedOptions: Array<{
          name: string;
          value: string;
        }>;
      };
    }>;
  };
  options: Array<{
    id: string;
    name: string;
    position: number;
    values: string[];
  }>;
  metafields: {
    edges: Array<{
      node: {
        namespace: string;
        key: string;
        value: string;
      };
    }>;
  };
}

export interface MappingResult {
  success: boolean;
  mappingId?: number;
  error?: string;
  data?: any;
  message?: string;
}

@Injectable()
export class ShopifyMappingService {
  private readonly logger = new Logger(ShopifyMappingService.name);

  constructor(
    @Inject(DATABASE_CONNECTION)
    private db: NodePgDatabase<any>,
    private shopifyService: ShopifyService,
  ) {}

  /**
   * Create a new product mapping between local product and Shopify product
   * Enhanced with comprehensive duplicate prevention
   */
  async createProductMapping(
    localProductId: number,
    shopifyProductId: string,
    shopifyData?: ShopifyProductData,
  ): Promise<MappingResult> {
    try {
      this.logger.log(
        `Creating product mapping: Local ID ${localProductId} -> Shopify ID ${shopifyProductId}`,
      );

      // Check for existing mapping by local product ID
      const existingByLocal = await this.db
        .select()
        .from(shopifyProductMappings)
        .where(eq(shopifyProductMappings.localProductId, localProductId))
        .limit(1);

      if (existingByLocal.length > 0) {
        this.logger.warn(
          `Mapping already exists for local product ${localProductId}. Updating existing mapping.`,
        );

        // Update existing mapping instead of creating duplicate
        const [updatedMapping] = await this.db
          .update(shopifyProductMappings)
          .set({
            shopifyProductId,
            shopifyProductHandle: shopifyData?.handle,
            shopifyProductData: shopifyData,
            mappingStatus: 'MAPPED',
            lastSyncAt: new Date(),
          })
          .where(eq(shopifyProductMappings.id, existingByLocal[0].id))
          .returning();

        return {
          success: true,
          mappingId: updatedMapping.id,
          data: updatedMapping,
          message: 'Updated existing mapping',
        };
      }

      // Check for existing mapping by Shopify product ID
      const existingByShopify = await this.db
        .select()
        .from(shopifyProductMappings)
        .where(eq(shopifyProductMappings.shopifyProductId, shopifyProductId))
        .limit(1);

      if (existingByShopify.length > 0) {
        this.logger.warn(
          `Shopify product ${shopifyProductId} is already mapped to local product ${existingByShopify[0].localProductId}. Skipping duplicate.`,
        );
        return {
          success: false,
          error: `Shopify product already mapped to local product ${existingByShopify[0].localProductId}`,
          mappingId: existingByShopify[0].id,
        };
      }

      // Create the mapping
      const [mapping] = await this.db
        .insert(shopifyProductMappings)
        .values({
          localProductId,
          shopifyProductId,
          shopifyProductHandle: shopifyData?.handle,
          mappingStatus: 'PENDING',
          shopifyProductData: shopifyData,
          lastSyncAt: new Date(),
        })
        .returning();

      this.logger.log(`Product mapping created with ID: ${mapping.id}`);

      // If we have Shopify data, create variant and option mappings
      if (shopifyData) {
        await this.createVariantMappings(mapping.id, shopifyData);
        // Skip option and addon mappings if no local options exist
        try {
          const availableOptions = await this.db
            .select()
            .from(options)
            .limit(1);

          if (availableOptions.length > 0) {
            await this.createOptionMappings(mapping.id, shopifyData);
            await this.createAddonMappings(mapping.id, shopifyData);
          } else {
            this.logger.warn(
              'No local options available, skipping option and addon mappings',
            );
          }
        } catch (error) {
          this.logger.warn(
            'Error checking for options, skipping option and addon mappings:',
            error.message,
          );
        }
      }

      return {
        success: true,
        mappingId: mapping.id,
        data: mapping,
      };
    } catch (error) {
      this.logger.error('Error creating product mapping:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Create variant mappings for a product
   */
  private async createVariantMappings(
    productMappingId: number,
    shopifyData: ShopifyProductData,
  ): Promise<void> {
    try {
      for (const variantEdge of shopifyData.variants.edges) {
        const variant = variantEdge.node;

        // Extract option values from variant
        const optionValues = variant.selectedOptions.reduce(
          (acc, option) => {
            acc[option.name] = option.value;
            return acc;
          },
          {} as Record<string, string>,
        );

        await this.db.insert(shopifyVariantMappings).values({
          productMappingId,
          shopifyVariantId: variant.id,
          shopifyVariantTitle: variant.title,
          shopifySku: variant.sku,
          shopifyPrice: variant.price,
          isAvailable: variant.availableForSale,
          optionValues,
          // We'll need to map local option IDs later
          localOptionIds: [], // TODO: Map to local options
        });
      }

      this.logger.log(
        `Created ${shopifyData.variants.edges.length} variant mappings`,
      );
    } catch (error) {
      this.logger.error('Error creating variant mappings:', error);
      throw error;
    }
  }

  /**
   * Create option mappings for a product
   */
  private async createOptionMappings(
    productMappingId: number,
    shopifyData: ShopifyProductData,
  ): Promise<void> {
    try {
      // Get available local options to find a valid option ID
      const availableOptions = await this.db.select().from(options).limit(1);

      if (availableOptions.length === 0) {
        this.logger.warn(
          'No local options available, skipping option mappings',
        );
        return;
      }

      const defaultLocalOptionId = availableOptions[0].id;

      for (const option of shopifyData.options) {
        await this.db.insert(shopifyOptionMappings).values({
          productMappingId,
          localOptionId: defaultLocalOptionId,
          shopifyOptionId: option.id,
          shopifyOptionName: option.name,
          shopifyOptionPosition: option.position,
          valueMappings: {}, // TODO: Map local option values
          mappingType: 'OPTION',
        });
      }

      this.logger.log(`Created ${shopifyData.options.length} option mappings`);
    } catch (error) {
      this.logger.error('Error creating option mappings:', error);
      // Don't throw error - continue with mapping creation even if options fail
      this.logger.warn('Continuing without option mappings due to error');
    }
  }

  /**
   * Create addon mappings for a product
   */
  private async createAddonMappings(
    productMappingId: number,
    shopifyData: ShopifyProductData,
  ): Promise<void> {
    try {
      // Look for addon products in metafields
      const addonMetafield = shopifyData.metafields.edges.find(
        (mf) =>
          mf.node.namespace === 'custom' && mf.node.key === 'addons_product',
      );

      if (addonMetafield) {
        try {
          const addonProductIds = JSON.parse(addonMetafield.node.value);

          for (const addonProductId of addonProductIds) {
            // Fetch addon product details
            const addonProduct = await this.shopifyService.getProduct(
              addonProductId.replace('gid://shopify/Product/', ''),
            );

            if (addonProduct?.product) {
              // Get available local options to find a valid option ID
              const availableOptions = await this.db
                .select()
                .from(options)
                .limit(1);

              if (availableOptions.length === 0) {
                this.logger.warn(
                  'No local options available, skipping addon mapping',
                );
                continue;
              }

              const defaultLocalOptionId = availableOptions[0].id;

              await this.db.insert(shopifyAddonMappings).values({
                productMappingId,
                localOptionId: defaultLocalOptionId,
                shopifyAddonProductId: addonProductId,
                addonTitle: addonProduct.product.title,
                addonPrice:
                  addonProduct.product.priceRangeV2?.minVariantPrice?.amount ||
                  '0',
                isRequired: false, // TODO: Determine from local options
              });
            }
          }

          this.logger.log(`Created ${addonProductIds.length} addon mappings`);
        } catch (parseError) {
          this.logger.warn('Could not parse addon products:', parseError);
        }
      }
    } catch (error) {
      this.logger.error('Error creating addon mappings:', error);
      throw error;
    }
  }

  /**
   * Get product mapping by local product ID
   */
  async getProductMapping(localProductId: number) {
    try {
      const mapping = await this.db
        .select()
        .from(shopifyProductMappings)
        .where(eq(shopifyProductMappings.localProductId, localProductId))
        .limit(1);

      if (mapping.length === 0) {
        return null;
      }

      // Get related mappings
      const [variants, options, addons] = await Promise.all([
        this.db
          .select()
          .from(shopifyVariantMappings)
          .where(eq(shopifyVariantMappings.productMappingId, mapping[0].id)),
        this.db
          .select()
          .from(shopifyOptionMappings)
          .where(eq(shopifyOptionMappings.productMappingId, mapping[0].id)),
        this.db
          .select()
          .from(shopifyAddonMappings)
          .where(eq(shopifyAddonMappings.productMappingId, mapping[0].id)),
      ]);

      return {
        ...mapping[0],
        variants,
        options,
        addons,
      };
    } catch (error) {
      this.logger.error('Error getting product mapping:', error);
      throw error;
    }
  }

  /**
   * Find the best matching Shopify variant for a quote
   */
  async findMatchingVariant(
    localProductId: number,
    selectedOptions: Array<{ optionId: number; value: string }>,
  ) {
    try {
      const mapping = await this.getProductMapping(localProductId);

      if (!mapping) {
        throw new Error(`No mapping found for product ${localProductId}`);
      }

      // Find variant that matches the selected options
      for (const variant of mapping.variants) {
        const variantOptions = variant.optionValues as Record<string, string>;
        const matches = selectedOptions.every((selected) => {
          // TODO: Map local option to Shopify option name
          // For now, we'll use a simple matching strategy
          return Object.values(variantOptions).includes(selected.value);
        });

        if (matches) {
          return {
            variantId: variant.shopifyVariantId,
            variantTitle: variant.shopifyVariantTitle,
            price: variant.shopifyPrice,
            sku: variant.shopifySku,
          };
        }
      }

      // If no exact match, return the first available variant
      const firstVariant = mapping.variants.find((v) => v.isAvailable);
      if (firstVariant) {
        return {
          variantId: firstVariant.shopifyVariantId,
          variantTitle: firstVariant.shopifyVariantTitle,
          price: firstVariant.shopifyPrice,
          sku: firstVariant.shopifySku,
        };
      }

      throw new Error('No matching variant found');
    } catch (error) {
      this.logger.error('Error finding matching variant:', error);
      throw error;
    }
  }

  /**
   * Sync product mapping with Shopify
   */
  async syncProductMapping(localProductId: number): Promise<MappingResult> {
    try {
      const mapping = await this.getProductMapping(localProductId);

      if (!mapping) {
        return {
          success: false,
          error: 'No mapping found',
        };
      }

      // Fetch latest data from Shopify
      const shopifyProductId = mapping.shopifyProductId.replace(
        'gid://shopify/Product/',
        '',
      );
      const shopifyData =
        await this.shopifyService.getProduct(shopifyProductId);

      if (!shopifyData?.product) {
        return {
          success: false,
          error: 'Failed to fetch Shopify product data',
        };
      }

      // Update mapping with latest data
      await this.db
        .update(shopifyProductMappings)
        .set({
          shopifyProductData: shopifyData.product,
          lastSyncAt: new Date(),
          mappingStatus: 'SYNCED',
        })
        .where(eq(shopifyProductMappings.id, mapping.id));

      // Clear existing variant, option, and addon mappings
      await this.db
        .delete(shopifyVariantMappings)
        .where(eq(shopifyVariantMappings.productMappingId, mapping.id));

      await this.db
        .delete(shopifyOptionMappings)
        .where(eq(shopifyOptionMappings.productMappingId, mapping.id));

      await this.db
        .delete(shopifyAddonMappings)
        .where(eq(shopifyAddonMappings.productMappingId, mapping.id));

      // Recreate variant, option, and addon mappings
      await this.createVariantMappings(mapping.id, shopifyData.product);
      await this.createOptionMappings(mapping.id, shopifyData.product);
      await this.createAddonMappings(mapping.id, shopifyData.product);

      this.logger.log(`Synced mapping for product ${localProductId}`);

      return {
        success: true,
        data: shopifyData.product,
      };
    } catch (error) {
      this.logger.error('Error syncing product mapping:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Clean up duplicate mappings - handles both local and Shopify product duplicates
   */
  async cleanupDuplicateMappings(): Promise<{ removed: number; kept: number }> {
    try {
      this.logger.log('Starting duplicate mapping cleanup...');

      // Get all mappings
      const allMappings = await this.db
        .select()
        .from(shopifyProductMappings)
        .orderBy(shopifyProductMappings.createdAt);

      let removed = 0;
      let kept = 0;

      // First, handle duplicates by local product ID (keep most recent)
      const groupedByLocal = allMappings.reduce(
        (acc, mapping) => {
          if (!acc[mapping.localProductId]) {
            acc[mapping.localProductId] = [];
          }
          acc[mapping.localProductId].push(mapping);
          return acc;
        },
        {} as Record<number, any[]>,
      );

      for (const [localProductId, mappings] of Object.entries(groupedByLocal)) {
        if (mappings.length > 1) {
          // Sort by creation date, keep the most recent
          const sortedMappings = mappings.sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          );

          const keepMapping = sortedMappings[0];
          const deleteMappings = sortedMappings.slice(1);

          // Delete duplicate mappings
          for (const mapping of deleteMappings) {
            await this.db
              .delete(shopifyProductMappings)
              .where(eq(shopifyProductMappings.id, mapping.id));
            removed++;
          }

          kept++;
          this.logger.log(
            `Cleaned up ${deleteMappings.length} local duplicates for product ${localProductId}, kept mapping ${keepMapping.id}`,
          );
        } else {
          kept++;
        }
      }

      // Second, handle duplicates by Shopify product ID (keep most recent)
      const remainingMappings = await this.db
        .select()
        .from(shopifyProductMappings)
        .orderBy(shopifyProductMappings.createdAt);

      const groupedByShopify = remainingMappings.reduce(
        (acc, mapping) => {
          if (!acc[mapping.shopifyProductId]) {
            acc[mapping.shopifyProductId] = [];
          }
          acc[mapping.shopifyProductId].push(mapping);
          return acc;
        },
        {} as Record<string, any[]>,
      );

      for (const [shopifyProductId, mappings] of Object.entries(
        groupedByShopify,
      )) {
        if (mappings.length > 1) {
          // Sort by creation date, keep the most recent
          const sortedMappings = mappings.sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          );

          const keepMapping = sortedMappings[0];
          const deleteMappings = sortedMappings.slice(1);

          // Delete duplicate mappings
          for (const mapping of deleteMappings) {
            await this.db
              .delete(shopifyProductMappings)
              .where(eq(shopifyProductMappings.id, mapping.id));
            removed++;
          }

          this.logger.log(
            `Cleaned up ${deleteMappings.length} Shopify duplicates for product ${shopifyProductId}, kept mapping ${keepMapping.id}`,
          );
        }
      }

      this.logger.log(
        `Duplicate cleanup complete: removed ${removed} total duplicates`,
      );
      return { removed, kept: kept + (remainingMappings.length - removed) };
    } catch (error) {
      this.logger.error('Error cleaning up duplicate mappings:', error);
      throw error;
    }
  }

  /**
   * Upsert product mapping - create or update
   */
  async upsertProductMapping(
    localProductId: number,
    shopifyProductId: string,
    shopifyData?: ShopifyProductData,
  ): Promise<MappingResult> {
    try {
      // First try to create
      const createResult = await this.createProductMapping(
        localProductId,
        shopifyProductId,
        shopifyData,
      );

      // If it failed due to existing mapping, that's handled in createProductMapping
      return createResult;
    } catch (error) {
      this.logger.error('Error in upsert product mapping:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get all product mappings
   */
  async getAllMappings() {
    try {
      const results = await this.db
        .select()
        .from(shopifyProductMappings)
        .leftJoin(
          products,
          eq(shopifyProductMappings.localProductId, products.id),
        );

      // Transform the data to match frontend expectations
      const mappings = results.map((result) => ({
        id: result.shopify_product_mappings.id,
        localProductId: result.shopify_product_mappings.localProductId,
        shopifyProductId: result.shopify_product_mappings.shopifyProductId,
        shopifyProductHandle:
          result.shopify_product_mappings.shopifyProductHandle,
        mappingStatus: result.shopify_product_mappings.mappingStatus,
        lastSyncAt: result.shopify_product_mappings.lastSyncAt,
        createdAt: result.shopify_product_mappings.createdAt,
        updatedAt: result.shopify_product_mappings.updatedAt,
        localProduct: result.products
          ? {
              id: result.products.id,
              title: result.products.title,
              basePrice: result.products.basePrice,
            }
          : null,
        variants: [] as any[],
        options: [] as any[],
        addons: [] as any[],
      }));

      // Populate variants, options, and addons for each mapping
      for (const mapping of mappings) {
        // Get variants
        const variantResults = await this.db
          .select()
          .from(shopifyVariantMappings)
          .where(eq(shopifyVariantMappings.productMappingId, mapping.id));

        mapping.variants = variantResults.map((v) => ({
          id: v.id,
          shopifyVariantId: v.shopifyVariantId,
          shopifyVariantTitle: v.shopifyVariantTitle,
          shopifyPrice: v.shopifyPrice,
          isAvailable: v.isAvailable,
          optionValues: v.optionValues,
        }));

        // Get options
        const optionResults = await this.db
          .select()
          .from(shopifyOptionMappings)
          .where(eq(shopifyOptionMappings.productMappingId, mapping.id));

        mapping.options = optionResults.map((o) => ({
          id: o.id,
          shopifyOptionName: o.shopifyOptionName,
          mappingType: o.mappingType,
        }));

        // Get addons
        const addonResults = await this.db
          .select()
          .from(shopifyAddonMappings)
          .where(eq(shopifyAddonMappings.productMappingId, mapping.id));

        mapping.addons = addonResults.map((a) => ({
          id: a.id,
          addonTitle: a.addonTitle,
          addonPrice: a.addonPrice,
        }));
      }

      return mappings;
    } catch (error) {
      this.logger.error('Error getting all mappings:', error);
      throw error;
    }
  }
}
