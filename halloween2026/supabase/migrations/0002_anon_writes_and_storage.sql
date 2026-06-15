-- ============================================================
-- Frictionless write path + photo storage.
--
-- The Supabase MCP exposes only the publishable/anon key, so the guest flow
-- runs on the anon role. Safety that CAN'T be bypassed lives in the DB:
-- phase + self-vote triggers (0001) and the one-ballot-per-device unique
-- constraint (0001). Anon write policies below are deliberately open — this
-- is the accepted "keep it frictionless" risk. Admin/service-role tightening
-- comes later.
-- ============================================================

-- ---- Anon write policies ----
drop policy if exists "insert entries" on entries;
drop policy if exists "insert votes" on votes;
drop policy if exists "delete votes" on votes;
drop policy if exists "insert reactions" on reactions;
drop policy if exists "delete reactions" on reactions;

create policy "insert entries"   on entries   for insert with check (true);
create policy "insert votes"     on votes     for insert with check (true);
create policy "delete votes"     on votes     for delete using (true); -- change a vote
create policy "insert reactions" on reactions for insert with check (true);
create policy "delete reactions" on reactions for delete using (true); -- toggle off

-- ---- Storage: public bucket for costume photos ----
insert into storage.buckets (id, name, public)
values ('costumes', 'costumes', true)
on conflict (id) do nothing;

drop policy if exists "costumes read" on storage.objects;
drop policy if exists "costumes upload" on storage.objects;
drop policy if exists "costumes delete" on storage.objects;

create policy "costumes read"   on storage.objects
  for select using (bucket_id = 'costumes');
create policy "costumes upload" on storage.objects
  for insert with check (bucket_id = 'costumes');
create policy "costumes delete" on storage.objects
  for delete using (bucket_id = 'costumes');
