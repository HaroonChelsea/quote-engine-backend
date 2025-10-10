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
ALTER TABLE "freightos_quotes" ADD CONSTRAINT "freightos_quotes_quote_id_quotes_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE cascade ON UPDATE no action;