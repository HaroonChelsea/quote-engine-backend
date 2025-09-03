import {
  pgTable,
  serial,
  text,
  integer,
  numeric,
  boolean,
  timestamp,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { customers } from 'src/customers/customers.schema';
import { options } from 'src/options/options.schema';

export const quoteStatusEnum = pgEnum('quote_status', [
  'DRAFT',
  'SENT',
  'ACCEPTED',
  'INVOICED',
]);

export const quotes = pgTable('quotes', {
  id: serial('id').primaryKey(),
  customerId: integer('customer_id')
    .references(() => customers.id)
    .notNull(),
  productId: integer('product_id').notNull(),
  status: quoteStatusEnum('status').default('DRAFT'),
  basePrice: numeric('base_price', { precision: 10, scale: 2 }),
  optionsPrice: numeric('options_price', { precision: 10, scale: 2 }),
  totalAmount: numeric('total_amount', { precision: 10, scale: 2 }),
  createdAt: timestamp('created_at').defaultNow(),
});

export const quoteOptions = pgTable('quote_options', {
  id: serial('id').primaryKey(),
  quoteId: integer('quote_id')
    .references(() => quotes.id)
    .notNull(),
  optionId: integer('option_id').notNull(),
  price: numeric('price', { precision: 10, scale: 2 }),
});

export const quotesRelations = relations(quotes, ({ one, many }) => ({
  customer: one(customers, {
    fields: [quotes.customerId],
    references: [customers.id],
  }),
  selectedOptions: many(quoteOptions),
}));

export const quoteOptionsRelations = relations(quoteOptions, ({ one }) => ({
  quote: one(quotes, {
    fields: [quoteOptions.quoteId],
    references: [quotes.id],
  }),
  option: one(options, {
    fields: [quoteOptions.optionId],
    references: [options.id],
  }),
}));
