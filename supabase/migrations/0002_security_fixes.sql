-- ============================================================
-- Security fixes — audit 2026-05-28
-- ============================================================

-- 1. Privilege escalation: prevent users from changing their own role
--    via direct Supabase REST calls.
drop policy "users update self" on users;
create policy "users update self" on users
  for update
  using (id = auth.uid())
  with check (
    id = auth.uid()
    and role = (select role from users where id = auth.uid())
  );

-- 2. Allow coordinators to update OTHER users (for team management).
--    Explicitly excludes own row so the role-preserving policy above
--    remains the sole gate for self-updates.
create policy "coord update users" on users
  for update
  using  (current_user_role() = 'coord' and id != auth.uid())
  with check (current_user_role() = 'coord' and id != auth.uid());

-- 3. Replace "coord manage events" (for all, including DELETE) with
--    granular INSERT + UPDATE policies only.
drop policy "coord manage events" on events;
create policy "coord insert events" on events
  for insert with check (current_user_role() = 'coord');
create policy "coord update events" on events
  for update using (current_user_role() = 'coord');
-- DELETE intentionally not granted.

-- 4. Replace "coord manage teams" (for all, including DELETE) with
--    granular INSERT + UPDATE policies only.
drop policy "coord manage teams" on teams;
create policy "coord insert teams" on teams
  for insert with check (current_user_role() = 'coord');
create policy "coord update teams" on teams
  for update using (current_user_role() = 'coord');
-- DELETE intentionally not granted.
