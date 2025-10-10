import {
  pgTable,
  serial,
  text,
  numeric,
  integer,
  timestamp,
  jsonb,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { quotes } from '../quotes/quotes.schema';

// Stores Freightos quote results for each quote
export const freightosQuotes = pgTable('freightos_quotes', {
  id: serial('id').primaryKey(),
  quoteId: integer('quote_id')
    .references(() => quotes.id, { onDelete: 'cascade' })
    .notNull(),

  // Freightos quote URL (permanent link for booking)
  quoteUrl: text('quote_url'),

  // Average price calculated from all carrier quotes
  averagePrice: numeric('average_price', { precision: 10, scale: 2 }),

  // Individual carrier quotes as JSON array
  carrierQuotes: jsonb('carrier_quotes').$type<Array<{
    carrier: string;
    service: string;
    price: number;
    transitDays: string;
    details: string;
  }>>(),

  // Metadata
  createdAt: timestamp('created_at').defaultNow(),
  timestamp: timestamp('timestamp').defaultNow(),
});

// Relations
export const freightosQuotesRelations = relations(
  freightosQuotes,
  ({ one }) => ({
    quote: one(quotes, {
      fields: [freightosQuotes.quoteId],
      references: [quotes.id],
    }),
  }),
);
