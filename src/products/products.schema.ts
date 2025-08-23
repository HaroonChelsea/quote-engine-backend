import {
  pgTable,
  serial,
  text,
  numeric,
  boolean,
  timestamp,
  integer,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { productOptions } from './product-options.schema';

export const products = pgTable('products', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  basePrice: numeric('base_price', { precision: 10, scale: 2 }).notNull(),
  imageUrl: text('image_url'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  shopifyId: text('shopify_id'),
  weightKg: numeric('weight_kg', { precision: 8, scale: 2 }),
  lengthCm: numeric('length_cm', { precision: 8, scale: 2 }),
  widthCm: numeric('width_cm', { precision: 8, scale: 2 }),
  heightCm: numeric('height_cm', { precision: 8, scale: 2 }),
  volumeCbm: numeric('volume_cbm', { precision: 8, scale: 4 }),
  goodsValue: numeric('goods_value', { precision: 10, scale: 2 }),
});

export const productsRelations = relations(products, ({ many }) => ({
  productOptions: many(productOptions),
}));
