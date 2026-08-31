CREATE TABLE "order_line_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"retailer" text DEFAULT 'new-world' NOT NULL,
	"name" text NOT NULL,
	"quantity" double precision NOT NULL,
	"unit" text NOT NULL,
	"unit_price_cents" integer,
	"total_price_cents" integer NOT NULL,
	"ordered_on" date NOT NULL,
	"matched_product_id" uuid,
	"matched_product_name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "order_line_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "order_line_items" ADD CONSTRAINT "order_line_items_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_line_items" ADD CONSTRAINT "order_line_items_matched_product_id_retailer_products_id_fk" FOREIGN KEY ("matched_product_id") REFERENCES "public"."retailer_products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "order_line_items_household_idx" ON "order_line_items" USING btree ("household_id","ordered_on");
--> statement-breakpoint
create policy "own order line items" on order_line_items
  for all to authenticated
  using (household_id = public.current_household_id())
  with check (household_id = public.current_household_id());