CREATE TABLE "trolley_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"retailer" text DEFAULT 'new-world' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"items" jsonb NOT NULL,
	"results" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "trolley_jobs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "shopping_product_preferences" ADD COLUMN "enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "trolley_jobs" ADD CONSTRAINT "trolley_jobs_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "trolley_jobs_household_idx" ON "trolley_jobs" USING btree ("household_id","status","created_at");
--> statement-breakpoint
create policy "own trolley jobs" on trolley_jobs
  for all to authenticated
  using (household_id = public.current_household_id())
  with check (household_id = public.current_household_id());
