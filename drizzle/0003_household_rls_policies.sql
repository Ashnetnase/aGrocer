-- RLS policies for the `authenticated` role (ADR-016, ADR-017).
--
-- Hand-written rather than generated: drizzle-kit can express `ENABLE ROW LEVEL SECURITY`
-- from the schema, but these predicates reference `auth.uid()`, which is Supabase's, and a
-- helper function, which the schema builder has no vocabulary for.
--
-- IMPORTANT: these are DEFENCE IN DEPTH, not the enforcement. The application connects as
-- `postgres`, which owns these tables and bypasses RLS, so household scoping is still done by
-- `src/server/repositories.ts`. What these policies buy is that if a signed-in user's token
-- ever reached PostgREST directly — a future feature querying Supabase from the browser, or a
-- mistake — they would see their own household and nothing else, instead of everything.
--
-- `anon` is granted nothing at all, so a signed-out caller still reads zero rows.

-- The household the current token belongs to. STABLE so the planner may call it once per
-- query rather than once per row; SECURITY DEFINER so the lookup itself is not subject to the
-- policy being defined in terms of it, which would recurse.
create or replace function public.current_household_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select household_id from household_members where user_id = auth.uid() limit 1;
$$;

revoke all on function public.current_household_id() from public;
grant execute on function public.current_household_id() to authenticated;

-- `households` is keyed by id rather than by a household_id column.
create policy "own household" on households
  for all to authenticated
  using (id = public.current_household_id())
  with check (id = public.current_household_id());

create policy "own household members" on household_members
  for all to authenticated
  using (household_id = public.current_household_id())
  with check (household_id = public.current_household_id());

create policy "own pantry items" on pantry_items
  for all to authenticated
  using (household_id = public.current_household_id())
  with check (household_id = public.current_household_id());

create policy "own products" on products
  for all to authenticated
  using (household_id = public.current_household_id())
  with check (household_id = public.current_household_id());

create policy "own shopping items" on shopping_items
  for all to authenticated
  using (household_id = public.current_household_id())
  with check (household_id = public.current_household_id());

create policy "own meals" on meals
  for all to authenticated
  using (household_id = public.current_household_id())
  with check (household_id = public.current_household_id());

create policy "own plan entries" on plan_entries
  for all to authenticated
  using (household_id = public.current_household_id())
  with check (household_id = public.current_household_id());
