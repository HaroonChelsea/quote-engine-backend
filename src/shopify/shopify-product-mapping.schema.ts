import {
  pgTable,
  serial,
  text,
  numeric,
  boolean,
  timestamp,
  integer,
  jsonb,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { products } from '../products/products.schema';
import { options } from '../options/options.schema';

// Enum for mapping status
export const mappingStatusEnum = pgEnum('mapping_status', [
  'PENDING',
  'MAPPED',
  'ERROR',
  'SYNCED',
]);

// Enum for mapping type
export const mappingTypeEnum = pgEnum('mapping_type', [
  'PRODUCT',
  'VARIANT',
  'OPTION',
  'ADDON',
]);

// Main product mapping table
export const shopifyProductMappings = pgTable('shopify_product_mappings', {
  id: serial('id').primaryKey(),
  localProductId: integer('local_product_id')
    .references(() => products.id, { onDelete: 'cascade' })
    .notNull(),
  shopifyProductId: text('shopify_product_id').notNull(), // gid://shopify/Product/123
  shopifyProductHandle: text('shopify_product_handle'),
  mappingStatus: mappingStatusEnum('mapping_status').default('PENDING'),
  lastSyncAt: timestamp('last_sync_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),

  // Store Shopify product metadata for reference
  shopifyProductData: jsonb('shopify_product_data'), // Store full product data
  mappingNotes: text('mapping_notes'), // Notes about the mapping
});

// Variant mapping table - maps local product options to Shopify variants
export const shopifyVariantMappings = pgTable('shopify_variant_mappings', {
  id: serial('id').primaryKey(),
  productMappingId: integer('product_mapping_id')
    .references(() => shopifyProductMappings.id, { onDelete: 'cascade' })
    .notNull(),
  shopifyVariantId: text('shopify_variant_id').notNull(), // gid://shopify/ProductVariant/123
  shopifyVariantTitle: text('shopify_variant_title'),
  shopifySku: text('shopify_sku'),

  // Map local options to Shopify variant
  localOptionIds: jsonb('local_option_ids'), // Array of local option IDs that create this variant
  optionValues: jsonb('option_values'), // Store the option values that create this variant

  // Pricing and availability
  shopifyPrice: numeric('shopify_price', { precision: 10, scale: 2 }),
  isAvailable: boolean('is_available').default(true),

  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Option mapping table - maps local options to Shopify product options
export const shopifyOptionMappings = pgTable('shopify_option_mappings', {
  id: serial('id').primaryKey(),
  productMappingId: integer('product_mapping_id')
    .references(() => shopifyProductMappings.id, { onDelete: 'cascade' })
    .notNull(),
  localOptionId: integer('local_option_id')
    .references(() => options.id, { onDelete: 'cascade' })
    .notNull(),
  shopifyOptionId: text('shopify_option_id'), // gid://shopify/ProductOption/123
  shopifyOptionName: text('shopify_option_name'),
  shopifyOptionPosition: integer('shopify_option_position'),

  // Store the mapping between local option values and Shopify option values
  valueMappings: jsonb('value_mappings'), // { "local_value": "shopify_value" }

  mappingType: mappingTypeEnum('mapping_type').default('OPTION'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Addon mapping table - maps local options to Shopify addon products
export const shopifyAddonMappings = pgTable('shopify_addon_mappings', {
  id: serial('id').primaryKey(),
  productMappingId: integer('product_mapping_id')
    .references(() => shopifyProductMappings.id, { onDelete: 'cascade' })
    .notNull(),
  localOptionId: integer('local_option_id')
    .references(() => options.id, { onDelete: 'cascade' })
    .notNull(),
  shopifyAddonProductId: text('shopify_addon_product_id').notNull(), // gid://shopify/Product/123
  shopifyAddonVariantId: text('shopify_addon_variant_id'), // gid://shopify/ProductVariant/123

  // Addon specific data
  addonTitle: text('addon_title'),
  addonPrice: numeric('addon_price', { precision: 10, scale: 2 }),
  isRequired: boolean('is_required').default(false),

  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Relations
export const shopifyProductMappingsRelations = relations(
  shopifyProductMappings,
  ({ one, many }) => ({
    localProduct: one(products, {
      fields: [shopifyProductMappings.localProductId],
      references: [products.id],
    }),
    variantMappings: many(shopifyVariantMappings),
    optionMappings: many(shopifyOptionMappings),
    addonMappings: many(shopifyAddonMappings),
  }),
);

export const shopifyVariantMappingsRelations = relations(
  shopifyVariantMappings,
  ({ one }) => ({
    productMapping: one(shopifyProductMappings, {
      fields: [shopifyVariantMappings.productMappingId],
      references: [shopifyProductMappings.id],
    }),
  }),
);

export const shopifyOptionMappingsRelations = relations(
  shopifyOptionMappings,
  ({ one }) => ({
    productMapping: one(shopifyProductMappings, {
      fields: [shopifyOptionMappings.productMappingId],
      references: [shopifyProductMappings.id],
    }),
    localOption: one(options, {
      fields: [shopifyOptionMappings.localOptionId],
      references: [options.id],
    }),
  }),
);

export const shopifyAddonMappingsRelations = relations(
  shopifyAddonMappings,
  ({ one }) => ({
    productMapping: one(shopifyProductMappings, {
      fields: [shopifyAddonMappings.productMappingId],
      references: [shopifyProductMappings.id],
    }),
    localOption: one(options, {
      fields: [shopifyAddonMappings.localOptionId],
      references: [options.id],
    }),
  }),
);
