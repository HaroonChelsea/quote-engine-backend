CREATE TYPE "public"."option_group_type" AS ENUM('SINGLE_SELECT', 'MULTI_SELECT');--> statement-breakpoint
CREATE TYPE "public"."product_option_group_type" AS ENUM('COLOR', 'ADDON', 'SIZE', 'MATERIAL', 'CUSTOM');--> statement-breakpoint
CREATE TYPE "public"."quote_status" AS ENUM('DRAFT', 'SENT', 'ACCEPTED', 'INVOICED');--> statement-breakpoint
CREATE TYPE "public"."shopify_sync_status" AS ENUM('PENDING', 'SYNCED', 'FAILED', 'SKIPPED', 'PARTIAL');--> statement-breakpoint
CREATE TYPE "public"."mapping_status" AS ENUM('PENDING', 'MAPPED', 'ERROR', 'SYNCED');--> statement-breakpoint
CREATE TYPE "public"."mapping_type" AS ENUM('PRODUCT', 'VARIANT', 'OPTION', 'ADDON');--> statement-breakpoint
CREATE TABLE "customers" (
	"id" serial PRIMARY KEY NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"company_name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text NOT NULL,
	"street_address" text NOT NULL,
	"city" text NOT NULL,
	"state" text NOT NULL,
	"zip" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"shopify_customer_id" text,
	CONSTRAINT "customers_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "option_groups" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"type" "option_group_type" NOT NULL,
	"step" integer DEFAULT 2 NOT NULL,
	"description" text
);
--> statement-breakpoint
CREATE TABLE "options" (
	"id" serial PRIMARY KEY NOT NULL,
	"group_id" integer NOT NULL,
	"title" text NOT NULL,
	"price" numeric(10, 2) DEFAULT '0' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_dimensions" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"quantity" integer DEFAULT 1,
	"weight_kg" numeric(8, 2) NOT NULL,
	"length_cm" numeric(8, 2) NOT NULL,
	"width_cm" numeric(8, 2) NOT NULL,
	"height_cm" numeric(8, 2) NOT NULL,
	"volume_cbm" numeric(8, 4),
	"price" numeric(10, 2),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "product_option_groups" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"name" text NOT NULL,
	"type" "product_option_group_type" NOT NULL,
	"is_required" boolean DEFAULT false,
	"is_multi_select" boolean DEFAULT false,
	"display_order" integer DEFAULT 0,
	"description" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "product_options" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_option_group_id" integer NOT NULL,
	"name" text NOT NULL,
	"price" text DEFAULT '0' NOT NULL,
	"description" text,
	"is_available" boolean DEFAULT true,
	"display_order" integer DEFAULT 0,
	"shopify_variant_id" text,
	"shopify_product_id" text,
	"shopify_sku" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"base_price" numeric(10, 2) NOT NULL,
	"unit_price" numeric(10, 2),
	"image_url" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"shopify_id" text,
	"weight_kg" numeric(8, 2),
	"length_cm" numeric(8, 2),
	"width_cm" numeric(8, 2),
	"height_cm" numeric(8, 2),
	"volume_cbm" numeric(8, 4)
);
--> statement-breakpoint
CREATE TABLE "quote_products" (
	"id" serial PRIMARY KEY NOT NULL,
	"quote_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"product_title" text NOT NULL,
	"base_price" numeric(10, 2) NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"unit_type" text DEFAULT 'piece' NOT NULL,
	"unit_quantity" integer DEFAULT 1 NOT NULL,
	"options_price" numeric(10, 2) DEFAULT '0',
	"total_price" numeric(10, 2) NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "quote_options" (
	"id" serial PRIMARY KEY NOT NULL,
	"quote_id" integer NOT NULL,
	"option_id" integer NOT NULL,
	"price" numeric(10, 2)
);
--> statement-breakpoint
CREATE TABLE "quotes" (
	"id" serial PRIMARY KEY NOT NULL,
	"customer_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"status" "quote_status" DEFAULT 'DRAFT',
	"base_price" numeric(10, 2),
	"options_price" numeric(10, 2),
	"total_amount" numeric(10, 2),
	"created_at" timestamp DEFAULT now(),
	"shipping_method" text,
	"shipping_cost" numeric(10, 2),
	"shipping_estimated_days" text,
	"discount_description" text,
	"discount_value" numeric(10, 2),
	"discount_value_type" text,
	"discount_title" text,
	"shopify_draft_order_id" text,
	"shopify_customer_id" text,
	"shopify_variant_id" text,
	"shopify_sync_status" "shopify_sync_status" DEFAULT 'PENDING',
	"shopify_sync_error" text,
	"shopify_synced_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "freightos_quotes" (
	"id" serial PRIMARY KEY NOT NULL,
	"quote_id" integer NOT NULL,
	"quote_url" text,
	"average_price" numeric(10, 2),
	"carrier_quotes" jsonb,
	"created_at" timestamp DEFAULT now(),
	"timestamp" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "quote_shipping_selections" (
	"id" serial PRIMARY KEY NOT NULL,
	"quote_id" integer NOT NULL,
	"product_dimension_id" integer,
	"custom_name" text,
	"custom_type" text,
	"custom_quantity" integer DEFAULT 1,
	"custom_weight_kg" numeric(8, 2),
	"custom_length_cm" numeric(8, 2),
	"custom_width_cm" numeric(8, 2),
	"custom_height_cm" numeric(8, 2),
	"custom_volume_cbm" numeric(8, 4),
	"shipping_method" text NOT NULL,
	"shipping_cost" numeric(10, 2) NOT NULL,
	"estimated_days" text,
	"service_level" text DEFAULT 'Standard',
	"package_type" text DEFAULT 'Pallet Only',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "shopify_addon_mappings" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_mapping_id" integer NOT NULL,
	"local_option_id" integer NOT NULL,
	"shopify_addon_product_id" text NOT NULL,
	"shopify_addon_variant_id" text,
	"addon_title" text,
	"addon_price" numeric(10, 2),
	"is_required" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "shopify_option_mappings" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_mapping_id" integer NOT NULL,
	"local_option_id" integer NOT NULL,
	"shopify_option_id" text,
	"shopify_option_name" text,
	"shopify_option_position" integer,
	"value_mappings" jsonb,
	"mapping_type" "mapping_type" DEFAULT 'OPTION',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "shopify_product_mappings" (
	"id" serial PRIMARY KEY NOT NULL,
	"local_product_id" integer NOT NULL,
	"shopify_product_id" text NOT NULL,
	"shopify_product_handle" text,
	"mapping_status" "mapping_status" DEFAULT 'PENDING',
	"last_sync_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"shopify_product_data" jsonb,
	"mapping_notes" text
);
--> statement-breakpoint
CREATE TABLE "shopify_variant_mappings" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_mapping_id" integer NOT NULL,
	"shopify_variant_id" text NOT NULL,
	"shopify_variant_title" text,
	"shopify_sku" text,
	"local_option_ids" jsonb,
	"option_values" jsonb,
	"shopify_price" numeric(10, 2),
	"is_available" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "roles_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"role_id" integer,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "options" ADD CONSTRAINT "options_group_id_option_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."option_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_dimensions" ADD CONSTRAINT "product_dimensions_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_option_groups" ADD CONSTRAINT "product_option_groups_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_options" ADD CONSTRAINT "product_options_product_option_group_id_product_option_groups_id_fk" FOREIGN KEY ("product_option_group_id") REFERENCES "public"."product_option_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_products" ADD CONSTRAINT "quote_products_quote_id_quotes_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_products" ADD CONSTRAINT "quote_products_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_options" ADD CONSTRAINT "quote_options_quote_id_quotes_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "freightos_quotes" ADD CONSTRAINT "freightos_quotes_quote_id_quotes_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_shipping_selections" ADD CONSTRAINT "quote_shipping_selections_quote_id_quotes_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_shipping_selections" ADD CONSTRAINT "quote_shipping_selections_product_dimension_id_product_dimensions_id_fk" FOREIGN KEY ("product_dimension_id") REFERENCES "public"."product_dimensions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shopify_addon_mappings" ADD CONSTRAINT "shopify_addon_mappings_product_mapping_id_shopify_product_mappings_id_fk" FOREIGN KEY ("product_mapping_id") REFERENCES "public"."shopify_product_mappings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shopify_addon_mappings" ADD CONSTRAINT "shopify_addon_mappings_local_option_id_options_id_fk" FOREIGN KEY ("local_option_id") REFERENCES "public"."options"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shopify_option_mappings" ADD CONSTRAINT "shopify_option_mappings_product_mapping_id_shopify_product_mappings_id_fk" FOREIGN KEY ("product_mapping_id") REFERENCES "public"."shopify_product_mappings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shopify_option_mappings" ADD CONSTRAINT "shopify_option_mappings_local_option_id_options_id_fk" FOREIGN KEY ("local_option_id") REFERENCES "public"."options"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shopify_product_mappings" ADD CONSTRAINT "shopify_product_mappings_local_product_id_products_id_fk" FOREIGN KEY ("local_product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shopify_variant_mappings" ADD CONSTRAINT "shopify_variant_mappings_product_mapping_id_shopify_product_mappings_id_fk" FOREIGN KEY ("product_mapping_id") REFERENCES "public"."shopify_product_mappings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE no action ON UPDATE no action;