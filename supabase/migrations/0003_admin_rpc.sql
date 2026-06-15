-- ============================================================
-- Host (admin) actions without a service-role key.
--
-- We have only the anon key, and admin tables are RLS-locked (no anon write).
-- So privileged actions are SECURITY DEFINER functions that verify a passcode
-- (stored in a locked-down config table) and then run as owner, bypassing RLS.
-- The anon key can call them, but only with the passcode. Change the passcode
-- below before the event.
-- ============================================================

create table if not exists app_config (
  key   text primary key,
  value text not null
);
alter table app_config enable row level security; -- no policies => anon cannot read/write

insert into app_config (key, value)
values ('admin_passcode', 'boo-2026')
on conflict (key) do nothing;

-- Passcode check (read-only).
create or replace function admin_check(p text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from app_config where key = 'admin_passcode' and value = p
  );
$$;

create or replace function admin_set_phase(p text, new_phase text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not admin_check(p) then raise exception 'Unauthorized'; end if;
  if new_phase not in ('preshow','voting','closed') then
    raise exception 'Invalid phase';
  end if;
  update contest_settings set phase_override = new_phase, updated_at = now() where id = 1;
end; $$;

create or replace function admin_set_revealed(p text, val boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not admin_check(p) then raise exception 'Unauthorized'; end if;
  update contest_settings set results_revealed = val, updated_at = now() where id = 1;
end; $$;

create or replace function admin_reset_votes(p text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not admin_check(p) then raise exception 'Unauthorized'; end if;
  delete from votes;
end; $$;

create or replace function admin_delete_entry(p text, eid uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not admin_check(p) then raise exception 'Unauthorized'; end if;
  delete from entries where id = eid; -- cascades votes + reactions
end; $$;

grant execute on function admin_check(text)               to anon, authenticated;
grant execute on function admin_set_phase(text, text)     to anon, authenticated;
grant execute on function admin_set_revealed(text, boolean) to anon, authenticated;
grant execute on function admin_reset_votes(text)         to anon, authenticated;
grant execute on function admin_delete_entry(text, uuid)  to anon, authenticated;
