ALTER TABLE "product_options" DROP CONSTRAINT "product_options_product_id_products_id_fk";
--> statement-breakpoint
ALTER TABLE "product_options" DROP CONSTRAINT "product_options_option_id_options_id_fk";
--> statement-breakpoint
ALTER TABLE "product_options" DROP CONSTRAINT "product_options_product_id_option_id_pk";--> statement-breakpoint
ALTER TABLE "product_options" ADD COLUMN "id" serial PRIMARY KEY NOT NULL;--> statement-breakpoint
ALTER TABLE "product_options" ADD COLUMN "product_option_group_id" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "product_options" ADD COLUMN "name" text NOT NULL;--> statement-breakpoint
ALTER TABLE "product_options" ADD COLUMN "price" text DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "product_options" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "product_options" ADD COLUMN "is_available" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "product_options" ADD COLUMN "display_order" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "product_options" ADD COLUMN "shopify_variant_id" text;--> statement-breakpoint
ALTER TABLE "product_options" ADD COLUMN "shopify_product_id" text;--> statement-breakpoint
ALTER TABLE "product_options" ADD COLUMN "shopify_sku" text;--> statement-breakpoint
ALTER TABLE "product_options" ADD COLUMN "created_at" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "product_options" ADD COLUMN "updated_at" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "product_options" ADD CONSTRAINT "product_options_product_option_group_id_product_option_groups_id_fk" FOREIGN KEY ("product_option_group_id") REFERENCES "public"."product_option_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_options" DROP COLUMN "product_id";--> statement-breakpoint
ALTER TABLE "product_options" DROP COLUMN "option_id";