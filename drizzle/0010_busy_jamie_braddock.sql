CREATE TABLE "retailer_product_search_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"retailer" text DEFAULT 'new-world' NOT NULL,
	"shopping_item_id" text NOT NULL,
	"shopping_item_key" text NOT NULL,
	"query" text NOT NULL,
	"store_id" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"products" jsonb,
	"message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "retailer_product_search_jobs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "retailer_product_search_jobs" ADD CONSTRAINT "retailer_product_search_jobs_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "retailer_product_search_jobs_household_idx" ON "retailer_product_search_jobs" USING btree ("household_id","status","created_at");
--> statement-breakpoint
create policy "own retailer product search jobs" on retailer_product_search_jobs
  for all to authenticated
  using (household_id = public.current_household_id())
  with check (household_id = public.current_household_id());
