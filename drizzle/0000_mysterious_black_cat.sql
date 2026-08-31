CREATE TYPE "public"."category" AS ENUM('Fruit & Vegetables', 'Meat & Seafood', 'Dairy', 'Bakery', 'Pantry', 'Frozen', 'Drinks', 'Snacks', 'Household');--> statement-breakpoint
CREATE TYPE "public"."day_key" AS ENUM('mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun');--> statement-breakpoint
CREATE TYPE "public"."meal_tag" AS ENUM('Quick', 'Kids', 'Budget', 'Favourite', 'Weekend');--> statement-breakpoint
CREATE TYPE "public"."member_colour" AS ENUM('bg-moss-600', 'bg-moss-400', 'bg-clay-500', 'bg-honey-500', 'bg-berry-500');--> statement-breakpoint
CREATE TYPE "public"."member_role" AS ENUM('Adult', 'Child');--> statement-breakpoint
CREATE TYPE "public"."slot" AS ENUM('breakfast', 'lunch', 'dinner');--> statement-breakpoint
CREATE TYPE "public"."stock_state" AS ENUM('good', 'low', 'out', 'soon');--> statement-breakpoint
CREATE TABLE "household_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"name" text NOT NULL,
	"initials" text NOT NULL,
	"role" "member_role" NOT NULL,
	"colour" "member_colour" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "households" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"shop_label" text DEFAULT '' NOT NULL,
	"currency" text DEFAULT 'NZD' NOT NULL,
	"pin_demo_date" boolean DEFAULT false NOT NULL,
	"pinned_date" date DEFAULT CURRENT_DATE NOT NULL,
	"show_breakfast_and_lunch" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"name" text NOT NULL,
	"minutes" smallint NOT NULL,
	"serves" smallint NOT NULL,
	"tags" "meal_tag"[] DEFAULT '{}' NOT NULL,
	"image" text,
	"description" text DEFAULT '' NOT NULL,
	"ingredients" text[] DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pantry_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"name" text NOT NULL,
	"category" "category" NOT NULL,
	"quantity" smallint DEFAULT 0 NOT NULL,
	"unit" text NOT NULL,
	"state" "stock_state" NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plan_entries" (
	"household_id" uuid NOT NULL,
	"day" "day_key" NOT NULL,
	"slot" "slot" NOT NULL,
	"meal_id" uuid NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "plan_entries_household_id_day_slot_pk" PRIMARY KEY("household_id","day","slot")
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"name" text NOT NULL,
	"brand" text DEFAULT '' NOT NULL,
	"size" text DEFAULT '' NOT NULL,
	"category" "category" NOT NULL,
	"price_cents" integer DEFAULT 0 NOT NULL,
	"default_quantity" smallint DEFAULT 1 NOT NULL,
	"unit" text NOT NULL,
	"favourite" boolean DEFAULT false NOT NULL,
	"times_bought" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shopping_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"name" text NOT NULL,
	"category" "category" NOT NULL,
	"quantity" smallint DEFAULT 1 NOT NULL,
	"unit" text NOT NULL,
	"price_cents" integer DEFAULT 0 NOT NULL,
	"priority" boolean DEFAULT false NOT NULL,
	"note" text,
	"checked" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "household_members" ADD CONSTRAINT "household_members_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meals" ADD CONSTRAINT "meals_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pantry_items" ADD CONSTRAINT "pantry_items_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_entries" ADD CONSTRAINT "plan_entries_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_entries" ADD CONSTRAINT "plan_entries_meal_id_meals_id_fk" FOREIGN KEY ("meal_id") REFERENCES "public"."meals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shopping_items" ADD CONSTRAINT "shopping_items_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "household_members_household_idx" ON "household_members" USING btree ("household_id");--> statement-breakpoint
CREATE INDEX "meals_household_idx" ON "meals" USING btree ("household_id","created_at");--> statement-breakpoint
CREATE INDEX "pantry_items_household_idx" ON "pantry_items" USING btree ("household_id","created_at");--> statement-breakpoint
CREATE INDEX "plan_entries_meal_idx" ON "plan_entries" USING btree ("meal_id");--> statement-breakpoint
CREATE INDEX "products_household_idx" ON "products" USING btree ("household_id","created_at");--> statement-breakpoint
CREATE INDEX "shopping_items_household_idx" ON "shopping_items" USING btree ("household_id","created_at");