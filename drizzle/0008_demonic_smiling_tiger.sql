CREATE TABLE "retailer_products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"retailer" text NOT NULL,
	"store_id" text,
	"external_product_id" text,
	"name" text NOT NULL,
	"brand" text,
	"size" text,
	"unit" text,
	"price_cents" integer,
	"special_price_cents" integer,
	"product_url" text,
	"image_url" text,
	"availability" text DEFAULT 'unknown' NOT NULL,
	"last_seen_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "retailer_products" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "shopping_product_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"shopping_item_key" text NOT NULL,
	"retailer" text NOT NULL,
	"store_id" text,
	"retailer_product_id" uuid,
	"external_product_id" text,
	"product_name" text NOT NULL,
	"brand" text,
	"size" text,
	"product_url" text,
	"default_quantity" smallint DEFAULT 1 NOT NULL,
	"confidence_basis_points" smallint DEFAULT 10000 NOT NULL,
	"last_confirmed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "shopping_product_preferences" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "retailer_products" ADD CONSTRAINT "retailer_products_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shopping_product_preferences" ADD CONSTRAINT "shopping_product_preferences_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shopping_product_preferences" ADD CONSTRAINT "shopping_product_preferences_retailer_product_id_retailer_products_id_fk" FOREIGN KEY ("retailer_product_id") REFERENCES "public"."retailer_products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "retailer_products_household_idx" ON "retailer_products" USING btree ("household_id","retailer");--> statement-breakpoint
CREATE UNIQUE INDEX "retailer_products_external_idx" ON "retailer_products" USING btree ("household_id","retailer","store_id","external_product_id");--> statement-breakpoint
CREATE INDEX "shopping_product_preferences_household_idx" ON "shopping_product_preferences" USING btree ("household_id");--> statement-breakpoint
CREATE UNIQUE INDEX "shopping_product_preferences_item_retailer_idx" ON "shopping_product_preferences" USING btree ("household_id","shopping_item_key","retailer","store_id");
--> statement-breakpoint
create policy "own retailer products" on retailer_products
  for all to authenticated
  using (household_id = public.current_household_id())
  with check (household_id = public.current_household_id());
--> statement-breakpoint
create policy "own shopping product preferences" on shopping_product_preferences
  for all to authenticated
  using (household_id = public.current_household_id())
  with check (household_id = public.current_household_id());
