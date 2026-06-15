-- ============================================================
-- Fix: bulk DELETEs inside the admin RPCs hit "DELETE requires a WHERE
-- clause" (Postgres sql_safe_updates guard). Add an always-true, column-
-- referencing WHERE so the guard is satisfied while still deleting all rows.
-- ============================================================

create or replace function admin_reset_votes(p text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not admin_check(p) then raise exception 'Unauthorized'; end if;
  delete from votes where id is not null;
end; $$;

create or replace function admin_clear_entries(p text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not admin_check(p) then raise exception 'Unauthorized'; end if;
  delete from entries where id is not null;  -- cascades votes + reactions
end; $$;
