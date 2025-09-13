import {
  pgTable,
  serial,
  text,
  numeric,
  integer,
  timestamp,
  boolean,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { quotes } from '../quotes/quotes.schema';
import { productDimensions } from '../products/product-dimensions.schema';

// Shipping selection for quotes - links quotes to selected dimensions
export const quoteShippingSelections = pgTable('quote_shipping_selections', {
  id: serial('id').primaryKey(),
  quoteId: integer('quote_id')
    .references(() => quotes.id, { onDelete: 'cascade' })
    .notNull(),

  // Either use predefined dimensions OR custom dimensions
  productDimensionId: integer('product_dimension_id').references(
    () => productDimensions.id,
    { onDelete: 'set null' },
  ),

  // Custom dimensions (when not using predefined)
  customName: text('custom_name'), // e.g., "Custom Pallet", "Custom Box"
  customType: text('custom_type'), // "pallet" or "box"
  customQuantity: integer('custom_quantity').default(1),
  customWeightKg: numeric('custom_weight_kg', { precision: 8, scale: 2 }),
  customLengthCm: numeric('custom_length_cm', { precision: 8, scale: 2 }),
  customWidthCm: numeric('custom_width_cm', { precision: 8, scale: 2 }),
  customHeightCm: numeric('custom_height_cm', { precision: 8, scale: 2 }),
  customVolumeCbm: numeric('custom_volume_cbm', { precision: 8, scale: 4 }),

  // Shipping method and cost
  shippingMethod: text('shipping_method').notNull(), // e.g., "Ocean Freight", "Air Freight"
  shippingCost: numeric('shipping_cost', { precision: 10, scale: 2 }).notNull(),
  estimatedDays: text('estimated_days'), // e.g., "25-35 days"

  // Additional shipping options
  serviceLevel: text('service_level').default('Standard'), // Standard, Premium, Express
  packageType: text('package_type').default('Pallet Only'), // Pallet Only, Box Only, Mixed

  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Relations
export const quoteShippingSelectionsRelations = relations(
  quoteShippingSelections,
  ({ one }) => ({
    quote: one(quotes, {
      fields: [quoteShippingSelections.quoteId],
      references: [quotes.id],
    }),
    productDimension: one(productDimensions, {
      fields: [quoteShippingSelections.productDimensionId],
      references: [productDimensions.id],
    }),
  }),
);
