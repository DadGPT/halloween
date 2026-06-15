-- ============================================================
-- Karaoke sign-up + Past Parties (memories) + more host actions.
-- ============================================================

-- ---- Karaoke queue ----
create table if not exists karaoke_songs (
  id         uuid primary key default gen_random_uuid(),
  device_id  text not null,
  singer     text not null,
  title      text not null,
  artist     text not null default '',
  position   int  not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists karaoke_position_idx on karaoke_songs (position);

-- Max 2 songs per device; new songs append to the end of the queue.
create or replace function enforce_karaoke_rules() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from karaoke_songs where device_id = new.device_id) >= 2 then
    raise exception 'You can have at most 2 songs on the list at a time.';
  end if;
  new.position := coalesce((select max(position) from karaoke_songs), 0) + 1;
  return new;
end; $$;
drop trigger if exists trg_karaoke_rules on karaoke_songs;
create trigger trg_karaoke_rules
  before insert on karaoke_songs
  for each row execute function enforce_karaoke_rules();

alter table karaoke_songs enable row level security;
drop policy if exists "read karaoke" on karaoke_songs;
drop policy if exists "insert karaoke" on karaoke_songs;
drop policy if exists "delete karaoke" on karaoke_songs;
create policy "read karaoke"   on karaoke_songs for select using (true);
create policy "insert karaoke" on karaoke_songs for insert with check (true);
create policy "delete karaoke" on karaoke_songs for delete using (true);

alter publication supabase_realtime add table karaoke_songs;

-- ---- Past parties (memories) ----
create table if not exists memories (
  id         uuid primary key default gen_random_uuid(),
  year       text not null,
  caption    text not null default '',
  photo_path text,
  photo_url  text,
  sort_order int  not null default 0,
  created_at timestamptz not null default now()
);
alter table memories enable row level security;
drop policy if exists "read memories" on memories;
create policy "read memories" on memories for select using (true);
-- (no anon write policy; rows are added via the admin RPC below)

insert into storage.buckets (id, name, public)
values ('memories', 'memories', true)
on conflict (id) do nothing;

drop policy if exists "memories read" on storage.objects;
drop policy if exists "memories upload" on storage.objects;
drop policy if exists "memories delete" on storage.objects;
create policy "memories read"   on storage.objects for select using (bucket_id = 'memories');
create policy "memories upload" on storage.objects for insert with check (bucket_id = 'memories');
create policy "memories delete" on storage.objects for delete using (bucket_id = 'memories');

-- ---- Host actions ----
create or replace function admin_clear_entries(p text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not admin_check(p) then raise exception 'Unauthorized'; end if;
  delete from entries;  -- cascades votes + reactions
end; $$;

create or replace function admin_reorder_karaoke(p text, ids uuid[]) returns void
language plpgsql security definer set search_path = public as $$
declare i int;
begin
  if not admin_check(p) then raise exception 'Unauthorized'; end if;
  for i in 1 .. coalesce(array_length(ids, 1), 0) loop
    update karaoke_songs set position = i where id = ids[i];
  end loop;
end; $$;

create or replace function admin_delete_karaoke(p text, sid uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not admin_check(p) then raise exception 'Unauthorized'; end if;
  delete from karaoke_songs where id = sid;
end; $$;

create or replace function admin_add_memory(p text, y text, cap text, ppath text, purl text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not admin_check(p) then raise exception 'Unauthorized'; end if;
  insert into memories (year, caption, photo_path, photo_url)
  values (y, coalesce(cap, ''), ppath, purl);
end; $$;

create or replace function admin_delete_memory(p text, mid uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not admin_check(p) then raise exception 'Unauthorized'; end if;
  delete from memories where id = mid;
end; $$;

grant execute on function admin_clear_entries(text)              to anon, authenticated;
grant execute on function admin_reorder_karaoke(text, uuid[])    to anon, authenticated;
grant execute on function admin_delete_karaoke(text, uuid)       to anon, authenticated;
grant execute on function admin_add_memory(text, text, text, text, text) to anon, authenticated;
grant execute on function admin_delete_memory(text, uuid)        to anon, authenticated;
