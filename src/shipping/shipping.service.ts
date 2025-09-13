import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../database/database-connection';
import { eq } from 'drizzle-orm';
import { productDimensions } from '../products/product-dimensions.schema';
import { quoteShippingSelections } from './shipping-selection.schema';

export interface ShippingCalculationInput {
  // Either predefined dimensions or custom dimensions
  productDimensionId?: number;
  customDimensions?: {
    name: string;
    type: 'pallet' | 'box';
    quantity: number;
    weightKg: number;
    lengthCm: number;
    widthCm: number;
    heightCm: number;
  };

  // Shipping options
  shippingMethod: 'Ocean Freight' | 'Air Freight' | 'Express Air';
  serviceLevel: 'Standard' | 'Premium' | 'Express';
  packageType: 'Pallet Only' | 'Box Only' | 'Mixed (Pallets + Boxes)';
}

export interface ShippingCalculationResult {
  baseCost: number;
  volumeCost: number;
  weightCost: number;
  servicePremium: number;
  packageMultiplier: number;
  totalCost: number;
  transitTime: { min: number; max: number };
  breakdown: {
    volume: number;
    weight: number;
    method: string;
    packageType: string;
    serviceLevel: string;
  };
}

@Injectable()
export class ShippingService {
  private readonly logger = new Logger(ShippingService.name);

  constructor(@Inject(DATABASE_CONNECTION) private db: any) {}

  // Simple transit time rules based on shipping method
  private readonly TRANSIT_TIMES = {
    'Ocean Freight': { min: 25, max: 35 },
    'Air Freight': { min: 3, max: 7 },
    'Express Air': { min: 1, max: 3 },
  };

  async getProductDimensions(productId: number) {
    this.logger.log(`Getting dimensions for product ${productId}`);

    const dimensions = await this.db
      .select()
      .from(productDimensions)
      .where(eq(productDimensions.productId, productId));

    return dimensions;
  }

  async calculateShippingCost(
    input: ShippingCalculationInput,
  ): Promise<ShippingCalculationResult> {
    this.logger.log('Calculating shipping cost', input);

    let dimensions;

    if (input.productDimensionId) {
      // Use predefined dimensions
      const result = await this.db
        .select()
        .from(productDimensions)
        .where(eq(productDimensions.id, input.productDimensionId))
        .limit(1);

      if (result.length === 0) {
        throw new Error(
          `Product dimension with ID ${input.productDimensionId} not found`,
        );
      }

      dimensions = result[0];
    } else if (input.customDimensions) {
      // Use custom dimensions
      dimensions = input.customDimensions;
    } else {
      throw new Error(
        'Either productDimensionId or customDimensions must be provided',
      );
    }

    // Calculate volume and weight for display purposes
    const volume =
      (dimensions.lengthCm * dimensions.widthCm * dimensions.heightCm) /
      1000000; // Convert to m³
    const totalVolume = volume * dimensions.quantity;
    const totalWeight = dimensions.weightKg * dimensions.quantity;

    // Get transit time for selected method
    const transitTime = this.TRANSIT_TIMES[input.shippingMethod];
    if (!transitTime) {
      throw new Error(`Unknown shipping method: ${input.shippingMethod}`);
    }

    // Use the dimension's price directly - no calculations needed!
    const totalCost = dimensions.price
      ? parseFloat(dimensions.price.toString())
      : 0;

    return {
      baseCost: totalCost,
      volumeCost: 0,
      weightCost: 0,
      servicePremium: 0,
      packageMultiplier: 1.0,
      totalCost: Math.round(totalCost * 100) / 100,
      transitTime,
      breakdown: {
        volume: Math.round(totalVolume * 10000) / 10000,
        weight: Math.round(totalWeight * 100) / 100,
        method: input.shippingMethod,
        packageType: input.packageType,
        serviceLevel: input.serviceLevel,
      },
    };
  }

  async saveShippingSelection(
    quoteId: number,
    input: ShippingCalculationInput,
    calculation: ShippingCalculationResult,
  ) {
    this.logger.log(`Saving shipping selection for quote ${quoteId}`);

    const shippingData = {
      quoteId,
      productDimensionId: input.productDimensionId || null,
      customName: input.customDimensions?.name || null,
      customType: input.customDimensions?.type || null,
      customQuantity: input.customDimensions?.quantity || null,
      customWeightKg: input.customDimensions?.weightKg || null,
      customLengthCm: input.customDimensions?.lengthCm || null,
      customWidthCm: input.customDimensions?.widthCm || null,
      customHeightCm: input.customDimensions?.heightCm || null,
      customVolumeCbm: input.customDimensions
        ? (input.customDimensions.lengthCm *
            input.customDimensions.widthCm *
            input.customDimensions.heightCm) /
          1000000
        : null,
      shippingMethod: input.shippingMethod,
      shippingCost: calculation.totalCost.toString(),
      estimatedDays: `${calculation.transitTime.min}-${calculation.transitTime.max} days`,
      serviceLevel: input.serviceLevel,
      packageType: input.packageType,
    };

    const result = await this.db
      .insert(quoteShippingSelections)
      .values(shippingData)
      .returning();

    return result[0];
  }

  getAvailableShippingOptions() {
    return {
      methods: Object.keys(this.TRANSIT_TIMES),
      packageTypes: ['Pallet Only', 'Box Only', 'Mixed (Pallets + Boxes)'],
      serviceLevels: ['Standard', 'Premium', 'Express'],
    };
  }
}
