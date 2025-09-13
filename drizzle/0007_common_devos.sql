CREATE TYPE "public"."product_option_group_type" AS ENUM('COLOR', 'ADDON', 'SIZE', 'MATERIAL', 'CUSTOM');--> statement-breakpoint
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
ALTER TABLE "product_option_groups" ADD CONSTRAINT "product_option_groups_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_shipping_selections" ADD CONSTRAINT "quote_shipping_selections_quote_id_quotes_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_shipping_selections" ADD CONSTRAINT "quote_shipping_selections_product_dimension_id_product_dimensions_id_fk" FOREIGN KEY ("product_dimension_id") REFERENCES "public"."product_dimensions"("id") ON DELETE set null ON UPDATE no action;
