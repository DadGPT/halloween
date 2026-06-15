-- ============================================================
-- Halloween 2026 Costume Contest — initial schema
--
-- Identity is frictionless: a client-generated `device_id` (no auth).
-- Reads are public (RLS select = true) so the browser/Realtime can use the
-- anon key. ALL writes go through server route handlers using the
-- service-role key, which bypasses RLS — device rules are enforced once,
-- server-side, plus belt-and-suspenders triggers below.
-- ============================================================

create extension if not exists pgcrypto;

-- ---- Categories (configurable; replaces the old hardcoded list) ----
create table if not exists categories (
  id           text primary key,            -- e.g. 'overall', 'scariest'
  label        text not null,
  description  text,
  icon         text,                         -- lucide icon name or emoji
  couples_only boolean not null default false,
  sort_order   int not null default 0,
  active       boolean not null default true
);

-- ---- Entries ----
create table if not exists entries (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text not null default '',
  kind        text not null default 'individual' check (kind in ('individual','group')),
  photo_path  text,                          -- storage object path
  photo_url   text,                          -- public URL
  device_id   text not null,                 -- submitting device
  created_at  timestamptz not null default now()
);

-- ---- Votes: one ballot per device per category ----
create table if not exists votes (
  id          uuid primary key default gen_random_uuid(),
  category_id text not null references categories(id) on delete cascade,
  entry_id    uuid not null references entries(id) on delete cascade,
  device_id   text not null,
  created_at  timestamptz not null default now(),
  unique (device_id, category_id)            -- enforces one vote per category
);
create index if not exists votes_entry_idx on votes (entry_id);
create index if not exists votes_category_idx on votes (category_id);

-- ---- Reactions: lightweight hype, deduped per device/entry/emoji ----
create table if not exists reactions (
  id         uuid primary key default gen_random_uuid(),
  entry_id   uuid not null references entries(id) on delete cascade,
  device_id  text not null,
  emoji      text not null,
  created_at timestamptz not null default now(),
  unique (device_id, entry_id, emoji)
);
create index if not exists reactions_entry_idx on reactions (entry_id);

-- ---- Contest settings (singleton) ----
create table if not exists contest_settings (
  id               int primary key default 1 check (id = 1),
  phase_override   text check (phase_override in ('preshow','voting','closed')),
  voting_opens_at  timestamptz,
  voting_closes_at timestamptz,
  results_revealed boolean not null default false,
  updated_at       timestamptz not null default now()
);
insert into contest_settings (id, phase_override)
values (1, 'preshow')
on conflict (id) do nothing;

-- ---- Phase helper (security definer so RLS/triggers can read settings) ----
create or replace function current_phase() returns text
language sql stable security definer
set search_path = public as $$
  select coalesce(
    s.phase_override,
    case
      when s.voting_opens_at is not null and now() < s.voting_opens_at then 'preshow'
      when s.voting_closes_at is not null and now() >= s.voting_closes_at then 'closed'
      when s.voting_opens_at is not null then 'voting'
      else 'preshow'
    end
  )
  from contest_settings s where s.id = 1;
$$;

-- ---- Write-time guards (fire for service role too) ----
create or replace function enforce_vote_rules() returns trigger
language plpgsql security definer
set search_path = public as $$
declare owner_device text;
begin
  if current_phase() <> 'voting' then
    raise exception 'Voting is not open';
  end if;
  select device_id into owner_device from entries where id = new.entry_id;
  if owner_device = new.device_id then
    raise exception 'You cannot vote for your own costume';
  end if;
  return new;
end;
$$;
drop trigger if exists trg_enforce_vote_rules on votes;
create trigger trg_enforce_vote_rules
  before insert on votes
  for each row execute function enforce_vote_rules();

create or replace function enforce_entry_rules() returns trigger
language plpgsql security definer
set search_path = public as $$
begin
  if current_phase() = 'closed' then
    raise exception 'Submissions are closed';
  end if;
  return new;
end;
$$;
drop trigger if exists trg_enforce_entry_rules on entries;
create trigger trg_enforce_entry_rules
  before insert on entries
  for each row execute function enforce_entry_rules();

-- ---- Aggregate views for leaderboard / Party Mode ----
create or replace view entry_vote_counts as
  select v.entry_id, v.category_id, count(*)::int as votes
  from votes v
  group by v.entry_id, v.category_id;

create or replace view entry_reaction_counts as
  select entry_id, emoji, count(*)::int as count
  from reactions
  group by entry_id, emoji;

-- ---- Row Level Security: public read, no anon writes ----
alter table categories       enable row level security;
alter table entries          enable row level security;
alter table votes            enable row level security;
alter table reactions        enable row level security;
alter table contest_settings enable row level security;

drop policy if exists "read categories" on categories;
drop policy if exists "read entries" on entries;
drop policy if exists "read votes" on votes;
drop policy if exists "read reactions" on reactions;
drop policy if exists "read settings" on contest_settings;

create policy "read categories" on categories       for select using (true);
create policy "read entries"    on entries           for select using (true);
create policy "read votes"      on votes             for select using (true);
create policy "read reactions"  on reactions         for select using (true);
create policy "read settings"   on contest_settings  for select using (true);
-- (No insert/update/delete policies => anon cannot write. Service role only.)

-- ---- Realtime for Party Mode (live tallies / reveal) ----
alter publication supabase_realtime add table votes;
alter publication supabase_realtime add table entries;
alter publication supabase_realtime add table reactions;
alter publication supabase_realtime add table contest_settings;

-- ---- Seed default categories ----
insert into categories (id, label, description, icon, couples_only, sort_order) values
  ('overall',  'Best Overall',  'The costume of the night.',            'crown',   false, 1),
  ('scariest', 'Scariest',      'Made the room go quiet.',              'ghost',   false, 2),
  ('funniest', 'Funniest',      'Made the room laugh.',                 'laugh',   false, 3),
  ('couple',   'Best Duo/Group','Best couple or group concept.',        'users',   true,  4),
  ('craft',    'Best Craft',    'Most impressive handmade execution.',  'scissors',false, 5)
on conflict (id) do nothing;
