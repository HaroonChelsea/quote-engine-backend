import { pgTable, serial, text, numeric, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { integer } from 'drizzle-orm/pg-core';
import { productOptions } from 'src/products/product-option-groups.schema';

export const optionGroupTypeEnum = pgEnum('option_group_type', [
  'SINGLE_SELECT',
  'MULTI_SELECT',
]);

export const optionGroups = pgTable('option_groups', {
  id: serial('id').primaryKey(),
  name: text('name').unique().notNull(),
  type: optionGroupTypeEnum('type').notNull(),
  step: integer('step').notNull().default(2), // Default to step 2 (product selection)
  description: text('description'),
});

export const options = pgTable('options', {
  id: serial('id').primaryKey(),
  groupId: integer('group_id')
    .references(() => optionGroups.id, { onDelete: 'cascade' })
    .notNull(),
  title: text('title').notNull(),
  price: numeric('price', { precision: 10, scale: 2 }).notNull().default('0'),
});

// Defines relationships
export const optionGroupsRelations = relations(optionGroups, ({ many }) => ({
  options: many(options),
}));

export const optionsRelations = relations(options, ({ one, many }) => ({
  group: one(optionGroups, {
    fields: [options.groupId],
    references: [optionGroups.id],
  }),
  productOptions: many(productOptions),
}));
