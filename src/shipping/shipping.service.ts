import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../database/database-connection';
import { eq } from 'drizzle-orm';
import { productDimensions } from '../products/product-dimensions.schema';
import { quoteShippingSelections } from './shipping-selection.schema';
import { freightosQuotes } from './freightos-quotes.schema';
import { FreightosService, FreightosQuoteInput } from './freightos.service';

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
  // Freightos-specific data
  freightosData?: {
    quoteUrl?: string;
    quotes?: Array<{
      carrier: string;
      service: string;
      price: number;
      transitDays: string;
      details: string;
    }>;
    timestamp?: Date;
  } | undefined;
}

@Injectable()
export class ShippingService {
  private readonly logger = new Logger(ShippingService.name);

  // Fixed manufacturer address for Freightos quotes
  private readonly MANUFACTURER_ADDRESS = {
    company: 'Manufacturer Name', // Update with actual company name
    street: 'NO.12 HUASHAN RD, SHILOU TOWN, PANYU DISTRICT',
    city: 'GUANGZHOU',
    state: 'GUANGDONG',
    zip: '511447',
    country: 'China'
  };

  constructor(
    @Inject(DATABASE_CONNECTION) private db: any,
    private freightosService: FreightosService
  ) {}

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
    customerAddress?: {
      street: string;
      city: string;
      state: string;
      zip: string;
      country: string;
    },
    useFreightos: boolean = false
  ): Promise<ShippingCalculationResult> {
    this.logger.log('Calculating shipping cost', { input, useFreightos });

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

    let totalCost: number;
    let freightosData: {
      quoteUrl?: string;
      quotes?: Array<{
        carrier: string;
        service: string;
        price: number;
        transitDays: string;
        details: string;
      }>;
      timestamp?: Date;
    } | undefined = undefined;

    // Use Freightos for real-time pricing if enabled and customer address provided
    if (useFreightos && customerAddress) {
      try {
        const freightosInput: FreightosQuoteInput = {
          sourceAddress: this.MANUFACTURER_ADDRESS,
          destinationAddress: customerAddress,
          packages: [{
            name: dimensions.name || 'Package',
            type: dimensions.type === 'pallet' ? 'pallet' : 'box',
            quantity: dimensions.quantity,
            weightKg: dimensions.weightKg,
            lengthCm: dimensions.lengthCm,
            widthCm: dimensions.widthCm,
            heightCm: dimensions.heightCm,
            insuranceValue: 1000 // Default insurance value, could be made configurable
          }],
          insuranceRequired: true
        };

        const freightosResult = await this.freightosService.getFreightosQuote(freightosInput);

        if (freightosResult.success && freightosResult.quotes && freightosResult.quotes.length > 0) {
          // Calculate average price from all quotes
          const totalPrice = freightosResult.quotes.reduce((sum, quote) => sum + quote.price, 0);
          const averagePrice = totalPrice / freightosResult.quotes.length;

          totalCost = Math.round(averagePrice * 100) / 100; // Round to 2 decimal places
          freightosData = {
            quoteUrl: freightosResult.quoteUrl,
            quotes: freightosResult.quotes,
            timestamp: freightosResult.timestamp
          };

          this.logger.log(`Using Freightos average pricing: $${totalCost} (from ${freightosResult.quotes.length} quotes)`);
          freightosResult.quotes.forEach(quote => {
            this.logger.log(`  - ${quote.carrier}: $${quote.price}`);
          });
        } else {
          throw new Error('Freightos quote failed or returned no results');
        }
      } catch (error) {
        this.logger.error('Freightos quote failed, falling back to manual pricing:', error.message);
        // Fall back to manual pricing
        totalCost = dimensions.price ? parseFloat(dimensions.price.toString()) : 0;
      }
    } else {
      // Use manual pricing from database
      totalCost = dimensions.price ? parseFloat(dimensions.price.toString()) : 0;
    }

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
      freightosData
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

    // Save Freightos quote data if available
    if (calculation.freightosData && calculation.freightosData.quotes) {
      await this.saveFreightosQuote(quoteId, calculation);
    }

    return result[0];
  }

  async saveFreightosQuote(
    quoteId: number,
    calculation: ShippingCalculationResult,
  ) {
    if (!calculation.freightosData || !calculation.freightosData.quotes) {
      return null;
    }

    this.logger.log(`Saving Freightos quote data for quote ${quoteId}`);

    const freightosData = {
      quoteId,
      quoteUrl: calculation.freightosData.quoteUrl || null,
      averagePrice: calculation.totalCost.toString(),
      carrierQuotes: calculation.freightosData.quotes,
      timestamp: calculation.freightosData.timestamp || new Date(),
    };

    const result = await this.db
      .insert(freightosQuotes)
      .values(freightosData)
      .returning();

    this.logger.log(`Saved ${calculation.freightosData.quotes.length} carrier quotes`);

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
