-- `authenticated` policies for the two history tables (ADR-016, ADR-017).
--
-- Hand-written for the same reason as 0003: these predicates reference `auth.uid()` through
-- `public.current_household_id()`, which drizzle-kit has no vocabulary for. Migration 0004
-- enabled RLS on both tables; without this they would be deny-all, which is safe but
-- inconsistent with every other table.
--
-- Still defence in depth: the application connects as `postgres` and bypasses RLS.

create policy "own inventory events" on inventory_events
  for all to authenticated
  using (household_id = public.current_household_id())
  with check (household_id = public.current_household_id());

create policy "own meal feedback" on meal_feedback
  for all to authenticated
  using (household_id = public.current_household_id())
  with check (household_id = public.current_household_id());
