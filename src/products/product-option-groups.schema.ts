import {
  pgTable,
  serial,
  text,
  integer,
  pgEnum,
  boolean,
  timestamp,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { products } from './products.schema';

// Enum for option group types specific to products
export const productOptionGroupTypeEnum = pgEnum('product_option_group_type', [
  'COLOR', // Color variants (e.g., Black, White, Red)
  'ADDON', // Addon products (e.g., Extra Cushions, Storage Box)
  'SIZE', // Size variants (e.g., Small, Medium, Large)
  'MATERIAL', // Material variants (e.g., Wood, Metal, Plastic)
  'CUSTOM', // Custom option groups
]);

// Product-specific option groups table
export const productOptionGroups = pgTable('product_option_groups', {
  id: serial('id').primaryKey(),
  productId: integer('product_id')
    .references(() => products.id, { onDelete: 'cascade' })
    .notNull(),
  name: text('name').notNull(), // e.g., "Color", "Addons", "Size"
  type: productOptionGroupTypeEnum('type').notNull(),
  isRequired: boolean('is_required').default(false),
  isMultiSelect: boolean('is_multi_select').default(false), // For addons that can be multiple
  displayOrder: integer('display_order').default(0),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Product-specific options table
export const productOptions = pgTable('product_options', {
  id: serial('id').primaryKey(),
  productOptionGroupId: integer('product_option_group_id')
    .references(() => productOptionGroups.id, { onDelete: 'cascade' })
    .notNull(),
  name: text('name').notNull(), // e.g., "Black", "Extra Cushions", "Large"
  price: text('price').notNull().default('0'), // Price as string for precision
  description: text('description'),
  isAvailable: boolean('is_available').default(true),
  displayOrder: integer('display_order').default(0),
  // Shopify mapping fields
  shopifyVariantId: text('shopify_variant_id'), // For color/size variants
  shopifyProductId: text('shopify_product_id'), // For addon products
  shopifySku: text('shopify_sku'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Relations
export const productOptionGroupsRelations = relations(
  productOptionGroups,
  ({ one, many }) => ({
    product: one(products, {
      fields: [productOptionGroups.productId],
      references: [products.id],
    }),
    options: many(productOptions),
  }),
);

export const productOptionsRelations = relations(productOptions, ({ one }) => ({
  optionGroup: one(productOptionGroups, {
    fields: [productOptions.productOptionGroupId],
    references: [productOptionGroups.id],
  }),
}));
