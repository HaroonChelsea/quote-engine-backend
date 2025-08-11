CREATE TYPE "public"."option_group_type" AS ENUM('SINGLE_SELECT', 'MULTI_SELECT');--> statement-breakpoint
CREATE TYPE "public"."quote_status" AS ENUM('DRAFT', 'SENT', 'ACCEPTED', 'INVOICED');--> statement-breakpoint
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
	CONSTRAINT "customers_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "option_groups" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"type" "option_group_type" NOT NULL,
	CONSTRAINT "option_groups_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "options" (
	"id" serial PRIMARY KEY NOT NULL,
	"group_id" integer NOT NULL,
	"title" text NOT NULL,
	"price" numeric(10, 2) DEFAULT '0' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_options" (
	"product_id" integer NOT NULL,
	"option_id" integer NOT NULL,
	CONSTRAINT "product_options_product_id_option_id_pk" PRIMARY KEY("product_id","option_id")
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"base_price" numeric(10, 2) NOT NULL,
	"image_url" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "quote_options" (
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
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "options" ADD CONSTRAINT "options_group_id_option_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."option_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_options" ADD CONSTRAINT "product_options_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_options" ADD CONSTRAINT "product_options_option_id_options_id_fk" FOREIGN KEY ("option_id") REFERENCES "public"."options"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_options" ADD CONSTRAINT "quote_options_quote_id_quotes_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;