CREATE TYPE "public"."shopify_sync_status" AS ENUM('PENDING', 'SYNCED', 'FAILED', 'SKIPPED');--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "shopify_customer_id" text;--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN "shopify_draft_order_id" text;--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN "shopify_customer_id" text;--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN "shopify_variant_id" text;--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN "shopify_sync_status" "shopify_sync_status" DEFAULT 'PENDING';--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN "shopify_sync_error" text;--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN "shopify_synced_at" timestamp;