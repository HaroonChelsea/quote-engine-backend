import {
  pgTable,
  serial,
  text,
  numeric,
  integer,
  timestamp,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { quotes } from './quotes.schema';
import { products } from '../products/products.schema';

// Quote products table - supports multiple products per quote
export const quoteProducts = pgTable('quote_products', {
  id: serial('id').primaryKey(),
  quoteId: integer('quote_id')
    .references(() => quotes.id, { onDelete: 'cascade' })
    .notNull(),
  productId: integer('product_id')
    .references(() => products.id, { onDelete: 'restrict' })
    .notNull(),

  // Product details at time of quote creation
  productTitle: text('product_title').notNull(),
  basePrice: numeric('base_price', { precision: 10, scale: 2 }).notNull(),
  quantity: integer('quantity').notNull().default(1),
  unitType: text('unit_type').notNull().default('piece'),
  unitQuantity: integer('unit_quantity').notNull().default(1),

  // Calculated totals for this product
  optionsPrice: numeric('options_price', { precision: 10, scale: 2 }).default(
    '0',
  ),
  totalPrice: numeric('total_price', { precision: 10, scale: 2 }).notNull(),

  createdAt: timestamp('created_at').defaultNow(),
});

// Relations
export const quoteProductsRelations = relations(quoteProducts, ({ one }) => ({
  quote: one(quotes, {
    fields: [quoteProducts.quoteId],
    references: [quotes.id],
  }),
  product: one(products, {
    fields: [quoteProducts.productId],
    references: [products.id],
  }),
}));
