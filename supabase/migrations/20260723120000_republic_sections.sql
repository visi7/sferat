-- Adds republic_sections (per-republic tabs) and posts.section,
-- which app code (app/page.tsx, app/republic/[slug]/page.tsx) already relies on
-- but were missing from the captured schema/backup.

create table if not exists public.republic_sections (
  id uuid primary key default gen_random_uuid(),
  republic_id uuid not null references public.republics(id) on delete cascade,
  slug text not null,
  label text not null,
  position int not null default 0,
  created_at timestamptz not null default now(),
  unique (republic_id, slug)
);

create index if not exists idx_republic_sections_rep_pos
  on public.republic_sections (republic_id, position);

alter table public.republic_sections enable row level security;

do $$
begin
  perform 1 from pg_policies where schemaname = 'public' and tablename = 'republic_sections';
  if not found then
    create policy republic_sections_sel on public.republic_sections for select using (true);
  end if;
end$$;

alter table public.posts
  add column if not exists section text not null default 'feed';
