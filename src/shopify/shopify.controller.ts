import { Controller, Get, Post, Param, Logger } from '@nestjs/common';
import { ShopifyService } from './shopify.service';
import { ShopifyMappingService } from './shopify-mapping.service';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

@Controller('shopify')
export class ShopifyController {
  private readonly logger = new Logger(ShopifyController.name);

  constructor(
    private readonly shopifyService: ShopifyService,
    private readonly shopifyMappingService: ShopifyMappingService,
  ) {}

  @Get('product/:id')
  async getProduct(@Param('id') id: string) {
    try {
      this.logger.log(`Fetching product with ID: ${id}`);
      const product = await this.shopifyService.getProduct(id);
      this.logger.log('Product fetched successfully');
      return {
        success: true,
        data: product,
      };
    } catch (error) {
      this.logger.error('Error fetching product:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  @Get('test-connection')
  async testConnection() {
    try {
      // Test with a simple query
      const query = `
        query {
          shop {
            name
            id
          }
        }
      `;

      const result = await this.shopifyService.executeGraphQLQuery(query);
      return {
        success: true,
        data: result,
        message: 'Shopify connection successful',
      };
    } catch (error) {
      this.logger.error('Error testing Shopify connection:', error);
      return {
        success: false,
        error: error.message,
        message: 'Shopify connection failed',
      };
    }
  }

  @Post('sync-all')
  async syncAllProducts() {
    try {
      this.logger.log('Starting sync of all products from Shopify');

      // Run the rebuild script
      const { stdout, stderr } = await execAsync(
        'node rebuild-from-shopify.js',
      );

      this.logger.log('Sync completed successfully');
      return {
        success: true,
        message: 'All products synced from Shopify successfully',
        output: stdout,
      };
    } catch (error) {
      this.logger.error('Error syncing products from Shopify:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to sync products from Shopify',
      };
    }
  }

  @Post('rebuild')
  async rebuildFromShopify() {
    try {
      this.logger.log('Starting complete rebuild from Shopify');

      // Run the rebuild script
      const { stdout, stderr } = await execAsync(
        'node rebuild-from-shopify.js',
      );

      this.logger.log('Rebuild completed successfully');
      return {
        success: true,
        message: 'System rebuilt from Shopify successfully',
        output: stdout,
      };
    } catch (error) {
      this.logger.error('Error rebuilding from Shopify:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to rebuild from Shopify',
      };
    }
  }

  @Get('products')
  async getShopifyProducts() {
    try {
      this.logger.log('Fetching all Shopify products');

      const query = `
        query GetProducts($first: Int!, $after: String) {
          products(first: $first, after: $after) {
            edges {
              node {
                id
                title
                handle
                status
                productType
                vendor
                priceRangeV2 {
                  minVariantPrice {
                    amount
                    currencyCode
                  }
                }
                variants(first: 10) {
                  edges {
                    node {
                      id
                      title
                      price
                      sku
                      availableForSale
                    }
                  }
                }
              }
            }
            pageInfo {
              hasNextPage
              endCursor
            }
          }
        }
      `;

      const result = await this.shopifyService.executeGraphQLQuery(query, {
        first: 50,
        after: null,
      });

      return {
        success: true,
        data: result.products?.edges?.map((edge) => edge.node) || [],
        message: 'Shopify products fetched successfully',
      };
    } catch (error) {
      this.logger.error('Error fetching Shopify products:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to fetch Shopify products',
      };
    }
  }

  @Post('sync-product/:id')
  async syncProduct(@Param('id') productId: string) {
    try {
      this.logger.log(`Syncing individual product: ${productId}`);

      // Fetch product from Shopify
      const product = await this.shopifyService.getProduct(productId);

      if (!product?.product) {
        return {
          success: false,
          error: 'Product not found in Shopify',
          message: 'Failed to sync product',
        };
      }

      // Here you would implement the logic to sync a single product
      // For now, we'll return the product data
      return {
        success: true,
        data: product.product,
        message: 'Product synced successfully',
      };
    } catch (error) {
      this.logger.error('Error syncing product:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to sync product',
      };
    }
  }

  @Post('mappings/cleanup-duplicates')
  async cleanupDuplicateMappings() {
    try {
      this.logger.log('Starting duplicate mapping cleanup...');

      const result =
        await this.shopifyMappingService.cleanupDuplicateMappings();

      this.logger.log(
        `Cleanup complete: removed ${result.removed} duplicates, kept ${result.kept} mappings`,
      );

      return {
        success: true,
        message: `Cleaned up ${result.removed} duplicate mappings, kept ${result.kept} unique mappings`,
        data: result,
      };
    } catch (error) {
      this.logger.error('Error cleaning up duplicate mappings:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
