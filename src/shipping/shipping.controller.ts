import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseIntPipe,
  Query,
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
  async calculateShippingCost(
    @Body() body: {
      input: ShippingCalculationInput;
      customerAddress?: {
        street: string;
        city: string;
        state: string;
        zip: string;
        country: string;
      };
      useFreightos?: boolean;
    }
  ) {
    const { input, customerAddress, useFreightos = false } = body;
    return this.shippingService.calculateShippingCost(input, customerAddress, useFreightos);
  }

  @Get('options')
  async getAvailableShippingOptions() {
    return this.shippingService.getAvailableShippingOptions();
  }

  @Post('freightos-quote')
  async getFreightosQuote(
    @Body() body: {
      sourceAddress: {
        company?: string;
        street: string;
        city: string;
        state: string;
        zip: string;
        country: string;
      };
      destinationAddress: {
        company?: string;
        street: string;
        city: string;
        state: string;
        zip: string;
        country: string;
      };
      packages: Array<{
        name: string;
        type: 'pallet' | 'box';
        quantity: number;
        weightKg: number;
        lengthCm: number;
        widthCm: number;
        heightCm: number;
        insuranceValue?: number;
      }>;
      insuranceRequired?: boolean;
    }
  ) {
    // Direct Freightos quote endpoint for testing/manual use
    return this.shippingService['freightosService'].getFreightosQuote(body);
  }
}
