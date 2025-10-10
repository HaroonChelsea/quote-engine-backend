ALTER TABLE "quotes" ADD COLUMN "discount_description" text;--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN "discount_value" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN "discount_value_type" text;--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN "discount_title" text;