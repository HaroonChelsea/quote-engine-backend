import { pgTable, primaryKey, integer } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { products } from './products.schema';
import { options } from '../options/options.schema';

export const productOptions = pgTable(
  'product_options',
  {
    productId: integer('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    optionId: integer('option_id')
      .notNull()
      .references(() => options.id, { onDelete: 'cascade' }),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.productId, t.optionId] }),
  }),
);

export const productOptionsRelations = relations(productOptions, ({ one }) => ({
  product: one(products, {
    fields: [productOptions.productId],
    references: [products.id],
  }),
  option: one(options, {
    fields: [productOptions.optionId],
    references: [options.id],
  }),
}));
