CREATE TABLE "chores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"title" text NOT NULL,
	"assigned_member_id" uuid,
	"done" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "chores" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "chores" ADD CONSTRAINT "chores_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chores" ADD CONSTRAINT "chores_assigned_member_id_household_members_id_fk" FOREIGN KEY ("assigned_member_id") REFERENCES "public"."household_members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "chores_household_idx" ON "chores" USING btree ("household_id","created_at");--> statement-breakpoint
create policy "own chores" on chores
  for all to authenticated
  using (household_id = public.current_household_id())
  with check (household_id = public.current_household_id());