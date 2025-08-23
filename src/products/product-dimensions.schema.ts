import {
  pgTable,
  serial,
  text,
  numeric,
  integer,
  timestamp,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { products } from './products.schema';

// Product shipping dimensions table
export const productDimensions = pgTable('product_dimensions', {
  id: serial('id').primaryKey(),
  productId: integer('product_id').references(() => products.id, {
    onDelete: 'cascade',
  }),
  name: text('name').notNull(), // e.g., "Pallet 1", "Box 2", "Box 3-4"
  type: text('type').notNull(), // "pallet" or "box"
  quantity: integer('quantity').default(1), // Number of units (for boxes that have multiple)
  weightKg: numeric('weight_kg', { precision: 8, scale: 2 }).notNull(),
  lengthCm: numeric('length_cm', { precision: 8, scale: 2 }).notNull(),
  widthCm: numeric('width_cm', { precision: 8, scale: 2 }).notNull(),
  heightCm: numeric('height_cm', { precision: 8, scale: 2 }).notNull(),
  volumeCbm: numeric('volume_cbm', { precision: 8, scale: 4 }),
  createdAt: timestamp('created_at').defaultNow(),
});

export const productDimensionsRelations = relations(
  productDimensions,
  ({ one }) => ({
    product: one(products, {
      fields: [productDimensions.productId],
      references: [products.id],
    }),
  }),
);
