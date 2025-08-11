import {
  pgTable,
  serial,
  text,
  numeric,
  boolean,
  timestamp,
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
});

export const productsRelations = relations(products, ({ many }) => ({
  productOptions: many(productOptions),
}));
