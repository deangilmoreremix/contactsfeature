/*
  # Calendar schema unification + semantic contact search

  ## calendar_events
  The original table only had (id, contact_id, scheduled_for, status, created_at); code elsewhere
  wrote `datetime`, `start_time`... which never existed. Canonical schema is now `scheduled_for`.
  Adds: user_id (backfilled from contacts), title, duration_minutes, location, meeting_url, notes,
  updated_at. Adds owner SELECT/INSERT/UPDATE/DELETE RLS policies (service_role policy untouched).

  ## contact_embeddings (pgvector)
  One 1536-dim embedding per contact (text-embedding-3-small) with a content_hash so the
  `semantic-search` function only re-embeds stale contacts. Owner-only RLS.

  ## match_contacts(query_embedding, match_count)
  SECURITY INVOKER cosine-similarity search restricted to auth.uid().
*/

create extension if not exists vector;

-- calendar_events -------------------------------------------------------------------------------
alter table if exists calendar_events add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table if exists calendar_events add column if not exists title text;
alter table if exists calendar_events add column if not exists duration_minutes integer not null default 30;
alter table if exists calendar_events add column if not exists location text;
alter table if exists calendar_events add column if not exists meeting_url text;
alter table if exists calendar_events add column if not exists notes text;
alter table if exists calendar_events add column if not exists updated_at timestamptz default now();

do $$
begin
  if exists (select 1 from information_schema.columns where table_name = 'contacts' and column_name = 'user_id') then
    update calendar_events ce set user_id = c.user_id
      from contacts c where ce.contact_id = c.id and ce.user_id is null;
  end if;
end $$;

create index if not exists calendar_events_user_scheduled_idx on calendar_events (user_id, scheduled_for);

alter table calendar_events enable row level security;

drop policy if exists "calendar_events_select_own" on calendar_events;
create policy "calendar_events_select_own" on calendar_events
  for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "calendar_events_insert_own" on calendar_events;
create policy "calendar_events_insert_own" on calendar_events
  for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists "calendar_events_update_own" on calendar_events;
create policy "calendar_events_update_own" on calendar_events
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists "calendar_events_delete_own" on calendar_events;
create policy "calendar_events_delete_own" on calendar_events
  for delete to authenticated using (user_id = (select auth.uid()));

-- contact_embeddings ----------------------------------------------------------------------------
create table if not exists contact_embeddings (
  contact_id uuid primary key references contacts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  embedding vector(1536) not null,
  content_hash text not null,
  updated_at timestamptz not null default now()
);

create index if not exists contact_embeddings_user_idx on contact_embeddings (user_id);
create index if not exists contact_embeddings_embedding_idx
  on contact_embeddings using hnsw (embedding vector_cosine_ops);

alter table contact_embeddings enable row level security;

drop policy if exists "contact_embeddings_select_own" on contact_embeddings;
create policy "contact_embeddings_select_own" on contact_embeddings
  for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "contact_embeddings_insert_own" on contact_embeddings;
create policy "contact_embeddings_insert_own" on contact_embeddings
  for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists "contact_embeddings_update_own" on contact_embeddings;
create policy "contact_embeddings_update_own" on contact_embeddings
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists "contact_embeddings_delete_own" on contact_embeddings;
create policy "contact_embeddings_delete_own" on contact_embeddings
  for delete to authenticated using (user_id = (select auth.uid()));

create or replace function match_contacts(query_embedding vector(1536), match_count int default 20)
returns table (contact_id uuid, similarity float)
language sql
stable
security invoker
set search_path = public, extensions
as $$
  select ce.contact_id, (1 - (ce.embedding <=> query_embedding))::float as similarity
  from contact_embeddings ce
  where ce.user_id = (select auth.uid())
  order by ce.embedding <=> query_embedding
  limit least(greatest(match_count, 1), 100);
$$;
