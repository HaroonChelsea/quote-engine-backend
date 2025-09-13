import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { ShippingService } from './shipping.service';
import type { ShippingCalculationInput } from './shipping.service';

@Controller('shipping')
export class ShippingController {
  constructor(private readonly shippingService: ShippingService) {}

  @Get('product/:productId/dimensions')
  async getProductDimensions(
    @Param('productId', ParseIntPipe) productId: number,
  ) {
    return this.shippingService.getProductDimensions(productId);
  }

  @Post('calculate')
  async calculateShippingCost(@Body() input: ShippingCalculationInput) {
    return this.shippingService.calculateShippingCost(input);
  }

  @Get('options')
  async getAvailableShippingOptions() {
    return this.shippingService.getAvailableShippingOptions();
  }
}
