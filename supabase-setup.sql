-- Studien-OS: Tabelle für den Abgleich zwischen deinen Geräten.
-- Einmal in Supabase unter „SQL Editor“ → „New query“ einfügen und „Run“ klicken.

create table if not exists public.items (
  user_id    uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  col        text        not null,
  id         text        not null,
  data       jsonb       not null default '{}'::jsonb,
  deleted    boolean     not null default false,
  updated_at timestamptz not null default clock_timestamp(),
  primary key (user_id, col, id)
);
create index if not exists items_user_updated on public.items (user_id, updated_at);

-- Jedes Konto sieht und ändert nur seine eigenen Einträge
alter table public.items enable row level security;
drop policy if exists "items lesen" on public.items;
drop policy if exists "items anlegen" on public.items;
drop policy if exists "items aendern" on public.items;
create policy "items lesen"   on public.items for select to authenticated using ((select auth.uid()) = user_id);
create policy "items anlegen" on public.items for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "items aendern" on public.items for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
grant select, insert, update on public.items to authenticated;

-- Den Zeitstempel setzt immer der Server, damit der Abgleich nicht von Geräte-Uhren abhängt
create or replace function public.items_touch() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := clock_timestamp();
  return new;
end $$;
drop trigger if exists items_touch on public.items;
create trigger items_touch before insert or update on public.items
for each row execute function public.items_touch();
