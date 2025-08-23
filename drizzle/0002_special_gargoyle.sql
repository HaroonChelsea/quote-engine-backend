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
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "shopify_id" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "weight_kg" numeric(8, 2);--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "length_cm" numeric(8, 2);--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "width_cm" numeric(8, 2);--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "height_cm" numeric(8, 2);--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "volume_cbm" numeric(8, 4);--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "goods_value" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "product_dimensions" ADD CONSTRAINT "product_dimensions_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;