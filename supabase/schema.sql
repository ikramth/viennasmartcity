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
  created_at timestamptz not null default now()
);

alter table public.research_projects enable row level security;

drop policy if exists "atlas public read" on public.research_projects;
create policy "atlas public read"
  on public.research_projects for select using (true);

drop policy if exists "atlas public insert" on public.research_projects;
create policy "atlas public insert"
  on public.research_projects for insert with check (true);

create index if not exists research_projects_created_at_idx
  on public.research_projects (created_at desc);
