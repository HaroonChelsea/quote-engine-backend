ALTER TABLE "quotes" ADD COLUMN "shipping_method" text;--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN "shipping_cost" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN "shipping_estimated_days" text;