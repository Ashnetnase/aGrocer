CREATE TYPE "public"."school_notification_action_type" AS ENUM('permission', 'payment', 'rsvp', 'reminder', 'info');--> statement-breakpoint
CREATE TYPE "public"."school_notification_provider" AS ENUM('hero-email', 'manual');--> statement-breakpoint
CREATE TABLE "school_notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"child_id" uuid,
	"provider" "school_notification_provider" NOT NULL,
	"external_reference" text,
	"title" text NOT NULL,
	"summary" text DEFAULT '' NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"event_date" date,
	"due_date" date,
	"action_required" boolean DEFAULT false NOT NULL,
	"action_type" "school_notification_action_type",
	"source_link" text,
	"read" boolean DEFAULT false NOT NULL,
	"dismissed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "school_notifications" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "household_members" ADD COLUMN "school" text;--> statement-breakpoint
ALTER TABLE "school_notifications" ADD CONSTRAINT "school_notifications_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "school_notifications" ADD CONSTRAINT "school_notifications_child_id_household_members_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."household_members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "school_notifications_household_idx" ON "school_notifications" USING btree ("household_id","received_at");--> statement-breakpoint
CREATE UNIQUE INDEX "school_notifications_external_ref_idx" ON "school_notifications" USING btree ("household_id","provider","external_reference");--> statement-breakpoint
create policy "own school notifications" on school_notifications
  for all to authenticated
  using (household_id = public.current_household_id())
  with check (household_id = public.current_household_id());