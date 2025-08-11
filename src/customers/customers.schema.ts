import { timestamp, serial, text } from 'drizzle-orm/pg-core';
import { pgTable } from 'drizzle-orm/pg-core';

export const customers = pgTable('customers', {
  id: serial('id').primaryKey(),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  companyName: text('company_name').notNull(),
  email: text('email').unique().notNull(),
  phone: text('phone').notNull(),
  streetAddress: text('street_address').notNull(),
  city: text('city').notNull(),
  state: text('state').notNull(),
  zip: text('zip').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});
