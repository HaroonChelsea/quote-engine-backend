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
ALTER TABLE "quote_products" ADD CONSTRAINT "quote_products_quote_id_quotes_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_products" ADD CONSTRAINT "quote_products_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;