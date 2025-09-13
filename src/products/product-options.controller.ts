import {
  Controller,
  Get,
  Post,
  Param,
  ParseIntPipe,
  Body,
} from '@nestjs/common';
import { ShopifyVariantMatcherService } from '../shopify/shopify-variant-matcher.service';
import { ProductsService } from './products.service';

@Controller('products')
export class ProductOptionsController {
  constructor(
    private readonly shopifyVariantMatcher: ShopifyVariantMatcherService,
    private readonly productsNewService: ProductsService,
  ) {}

  @Get(':productId/options')
  async getProductOptions(@Param('productId', ParseIntPipe) productId: number) {
    return this.shopifyVariantMatcher.getProductOptions(productId);
  }

  @Get(':productId/with-options')
  async getProductWithOptions(
    @Param('productId', ParseIntPipe) productId: number,
  ) {
    return this.productsNewService.getProductWithOptions(productId);
  }

  @Get(':productId/dimensions')
  async getProductDimensions(
    @Param('productId', ParseIntPipe) productId: number,
  ) {
    return this.productsNewService.getProductDimensions(productId);
  }

  @Post(':productId/option-groups')
  async createOptionGroup(
    @Param('productId', ParseIntPipe) productId: number,
    @Body() optionGroupData: any,
  ) {
    return this.productsNewService.createOptionGroup({
      productId,
      ...optionGroupData,
    });
  }

  @Post(':productId/option-groups/:groupId/options')
  async createOption(
    @Param('productId', ParseIntPipe) productId: number,
    @Param('groupId', ParseIntPipe) groupId: number,
    @Body() optionData: any,
  ) {
    return this.productsNewService.createOption({
      productOptionGroupId: groupId,
      ...optionData,
    });
  }
}
