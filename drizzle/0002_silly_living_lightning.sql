ALTER TABLE "household_members" ADD COLUMN "user_id" uuid;--> statement-breakpoint
ALTER TABLE "household_members" ADD CONSTRAINT "household_members_user_id_unique" UNIQUE("user_id");