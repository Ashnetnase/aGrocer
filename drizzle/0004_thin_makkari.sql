CREATE TYPE "public"."inventory_event_kind" AS ENUM('created', 'adjusted', 'updated', 'removed');--> statement-breakpoint
CREATE TYPE "public"."meal_rating" AS ENUM('loved', 'liked', 'ok', 'disliked');--> statement-breakpoint
CREATE TABLE "inventory_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"pantry_item_id" uuid,
	"item_name" text NOT NULL,
	"kind" "inventory_event_kind" NOT NULL,
	"quantity_delta" integer,
	"quantity_after" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "inventory_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "meal_feedback" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"meal_id" uuid NOT NULL,
	"member_id" uuid,
	"rating" "meal_rating" NOT NULL,
	"note" text,
	"ate_on" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "meal_feedback" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "inventory_events" ADD CONSTRAINT "inventory_events_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_events" ADD CONSTRAINT "inventory_events_pantry_item_id_pantry_items_id_fk" FOREIGN KEY ("pantry_item_id") REFERENCES "public"."pantry_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_feedback" ADD CONSTRAINT "meal_feedback_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_feedback" ADD CONSTRAINT "meal_feedback_meal_id_meals_id_fk" FOREIGN KEY ("meal_id") REFERENCES "public"."meals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_feedback" ADD CONSTRAINT "meal_feedback_member_id_household_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."household_members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "inventory_events_household_idx" ON "inventory_events" USING btree ("household_id","created_at");--> statement-breakpoint
CREATE INDEX "meal_feedback_meal_idx" ON "meal_feedback" USING btree ("meal_id");--> statement-breakpoint
CREATE INDEX "meal_feedback_household_idx" ON "meal_feedback" USING btree ("household_id","ate_on");