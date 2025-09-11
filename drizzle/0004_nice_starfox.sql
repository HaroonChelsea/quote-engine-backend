CREATE TYPE "public"."mapping_status" AS ENUM('PENDING', 'MAPPED', 'ERROR', 'SYNCED');--> statement-breakpoint
CREATE TYPE "public"."mapping_type" AS ENUM('PRODUCT', 'VARIANT', 'OPTION', 'ADDON');--> statement-breakpoint
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
ALTER TABLE "shopify_addon_mappings" ADD CONSTRAINT "shopify_addon_mappings_product_mapping_id_shopify_product_mappings_id_fk" FOREIGN KEY ("product_mapping_id") REFERENCES "public"."shopify_product_mappings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shopify_addon_mappings" ADD CONSTRAINT "shopify_addon_mappings_local_option_id_options_id_fk" FOREIGN KEY ("local_option_id") REFERENCES "public"."options"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shopify_option_mappings" ADD CONSTRAINT "shopify_option_mappings_product_mapping_id_shopify_product_mappings_id_fk" FOREIGN KEY ("product_mapping_id") REFERENCES "public"."shopify_product_mappings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shopify_option_mappings" ADD CONSTRAINT "shopify_option_mappings_local_option_id_options_id_fk" FOREIGN KEY ("local_option_id") REFERENCES "public"."options"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shopify_product_mappings" ADD CONSTRAINT "shopify_product_mappings_local_product_id_products_id_fk" FOREIGN KEY ("local_product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shopify_variant_mappings" ADD CONSTRAINT "shopify_variant_mappings_product_mapping_id_shopify_product_mappings_id_fk" FOREIGN KEY ("product_mapping_id") REFERENCES "public"."shopify_product_mappings"("id") ON DELETE cascade ON UPDATE no action;