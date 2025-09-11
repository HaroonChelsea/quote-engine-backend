import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Logger,
  ParseIntPipe,
} from '@nestjs/common';
import { ShopifyMappingService } from './shopify-mapping.service';
import { ShopifyService } from './shopify.service';

export interface CreateMappingDto {
  localProductId: number;
  shopifyProductId: string;
}

export interface UpdateMappingDto {
  mappingNotes?: string;
}

@Controller('shopify/mappings')
export class ShopifyMappingController {
  private readonly logger = new Logger(ShopifyMappingController.name);

  constructor(
    private readonly mappingService: ShopifyMappingService,
    private readonly shopifyService: ShopifyService,
  ) {}

  /**
   * Get all product mappings
   */
  @Get()
  async getAllMappings() {
    try {
      const mappings = await this.mappingService.getAllMappings();
      return {
        success: true,
        data: mappings,
        count: mappings.length,
      };
    } catch (error) {
      this.logger.error('Error getting all mappings:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get mapping for a specific product
   */
  @Get('product/:productId')
  async getProductMapping(@Param('productId', ParseIntPipe) productId: number) {
    try {
      const mapping = await this.mappingService.getProductMapping(productId);

      if (!mapping) {
        return {
          success: false,
          error: 'No mapping found for this product',
        };
      }

      return {
        success: true,
        data: mapping,
      };
    } catch (error) {
      this.logger.error('Error getting product mapping:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Create a new product mapping
   */
  @Post()
  async createMapping(@Body() createMappingDto: CreateMappingDto) {
    try {
      const { localProductId, shopifyProductId } = createMappingDto;

      // Fetch Shopify product data
      const shopifyProductIdNumber = shopifyProductId.replace(
        'gid://shopify/Product/',
        '',
      );
      const shopifyData = await this.shopifyService.getProduct(
        shopifyProductIdNumber,
      );

      if (!shopifyData?.product) {
        return {
          success: false,
          error: 'Failed to fetch Shopify product data',
        };
      }

      // Create the mapping
      const result = await this.mappingService.createProductMapping(
        localProductId,
        shopifyProductId,
        shopifyData.product,
      );

      return result;
    } catch (error) {
      this.logger.error('Error creating mapping:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Update a product mapping
   */
  @Put(':mappingId')
  async updateMapping(
    @Param('mappingId', ParseIntPipe) mappingId: number,
    @Body() updateMappingDto: UpdateMappingDto,
  ) {
    try {
      // TODO: Implement update logic
      return {
        success: true,
        message: 'Mapping updated successfully',
      };
    } catch (error) {
      this.logger.error('Error updating mapping:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Sync a product mapping with Shopify
   */
  @Post('sync/:productId')
  async syncMapping(@Param('productId', ParseIntPipe) productId: number) {
    try {
      const result = await this.mappingService.syncProductMapping(productId);
      return result;
    } catch (error) {
      this.logger.error('Error syncing mapping:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Find matching variant for a quote
   */
  @Post('find-variant/:productId')
  async findMatchingVariant(
    @Param('productId', ParseIntPipe) productId: number,
    @Body() selectedOptions: Array<{ optionId: number; value: string }>,
  ) {
    try {
      const variant = await this.mappingService.findMatchingVariant(
        productId,
        selectedOptions,
      );

      return {
        success: true,
        data: variant,
      };
    } catch (error) {
      this.logger.error('Error finding matching variant:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Test mapping with the analyzed product
   */
  @Post('test-mapping')
  async testMapping() {
    try {
      // Test with the analyzed product (1 Person Booth)
      const testProductId = 1; // Assuming you have a local product with ID 1
      const shopifyProductId = 'gid://shopify/Product/868337090607';

      const result = await this.mappingService.createProductMapping(
        testProductId,
        shopifyProductId,
      );

      return {
        success: true,
        message: 'Test mapping created successfully',
        data: result,
      };
    } catch (error) {
      this.logger.error('Error creating test mapping:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
