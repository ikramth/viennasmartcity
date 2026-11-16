-- ============================================================
-- ATLAS & OBSERVATOIRE DES VILLES INTELLIGENTES
-- Supabase schema — run in the SQL editor, then set
-- SUPABASE_URL + SUPABASE_ANON_KEY in Vercel / .env.local.
-- ============================================================

create table if not exists public.research_projects (
  id text primary key,
  title text not null,
  city text,
  country text not null,
  authors text not null,
  module text not null check (module in ('SCF', 'OUPTI', 'SCF & OUPTI')),
  category text not null check (category in ('international', 'algeria')),
  summary text,
  keywords text[] default '{}',
  tags text[] default '{}',
  file_url text,
  file_name text,
  link text,
  owner_hash text,
  created_at timestamptz not null default now()
);

-- Existing deployments: add the author-only delete column.
alter table public.research_projects
  add column if not exists owner_hash text;

alter table public.research_projects enable row level security;

drop policy if exists "atlas public read" on public.research_projects;
create policy "atlas public read"
  on public.research_projects for select using (true);

drop policy if exists "atlas public insert" on public.research_projects;
create policy "atlas public insert"
  on public.research_projects for insert with check (true);

-- Deletion is authorized server-side (owner token hash or teacher code);
-- these policies let the API perform the write with the anon key.
drop policy if exists "atlas public delete" on public.research_projects;
create policy "atlas public delete"
  on public.research_projects for delete using (true);

-- ============================================================
-- Teacher space: announcements, remarks, resources, notes.
-- ============================================================
create table if not exists public.atlas_announcements (
  id text primary key,
  kind text not null check (kind in ('announcement', 'remark', 'resource', 'note')),
  title text not null,
  body text,
  link text,
  file_url text,
  file_name text,
  project_id text,
  created_at timestamptz not null default now()
);

alter table public.atlas_announcements enable row level security;

drop policy if exists "atlas announcements read" on public.atlas_announcements;
create policy "atlas announcements read"
  on public.atlas_announcements for select using (true);

drop policy if exists "atlas announcements write" on public.atlas_announcements;
create policy "atlas announcements write"
  on public.atlas_announcements for insert with check (true);

drop policy if exists "atlas announcements delete" on public.atlas_announcements;
create policy "atlas announcements delete"
  on public.atlas_announcements for delete using (true);

create index if not exists research_projects_created_at_idx
  on public.research_projects (created_at desc);

create index if not exists atlas_announcements_created_at_idx
  on public.atlas_announcements (created_at desc);
