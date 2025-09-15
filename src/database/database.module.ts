import { Module } from '@nestjs/common';
import { DATABASE_CONNECTION } from './database-connection';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';
import * as userSchema from '../users/users.schema';
import * as customerSchema from '../customers/customers.schema';
import * as shopifySchema from '../products/products.schema';
import * as quoteSchema from '../quotes/quotes.schema';
import * as quoteProductsSchema from '../quotes/quote-products.schema';
import * as optionSchema from '../options/options.schema';
// import * as productOptionSchema from '../products/product-options.schema'; // Removed - using new product-option-groups.schema
import * as productDimensionsSchema from '../products/product-dimensions.schema';
import * as shopifyMappingSchema from '../shopify/shopify-product-mapping.schema';
import * as productOptionGroupsSchema from '../products/product-option-groups.schema';
import * as shippingSelectionSchema from '../shipping/shipping-selection.schema';
import { drizzle } from 'drizzle-orm/node-postgres';

export const fullSchema = {
  ...userSchema,
  ...customerSchema,
  ...shopifySchema,
  ...quoteSchema,
  ...quoteProductsSchema,
  ...optionSchema,
  // ...productOptionSchema, // Removed - using new product-option-groups.schema
  ...productDimensionsSchema,
  ...shopifyMappingSchema,
  ...productOptionGroupsSchema,
  ...shippingSelectionSchema,
};

@Module({
  providers: [
    {
      provide: DATABASE_CONNECTION,
      useFactory: (configService: ConfigService) => {
        const pool = new Pool({
          connectionString: configService.getOrThrow('DATABASE_URL'),
        });
        return drizzle(pool, {
          schema: fullSchema,
        });
      },
      inject: [ConfigService],
    },
  ],
  exports: [DATABASE_CONNECTION],
})
export class DatabaseModule {}
