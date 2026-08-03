-- Agora — infrastrukturë reale për postime të sponsorizuara, jo më "Coming
-- soon" statik. Lexim publik vetëm për ato aktive; shkrim (insert/update/
-- delete) vetëm për admin global, duke ripërdorur is_global_admin() ekzistuese.

create table if not exists public.sponsored_posts (
  id uuid primary key default gen_random_uuid(),
  sponsor_name text not null,
  title text not null,
  body text,
  image_url text,
  cta_label text,
  cta_url text,
  is_active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.sponsored_posts enable row level security;
do $$
begin
  perform 1 from pg_policies where schemaname='public' and tablename='sponsored_posts';
  if not found then
    create policy sp_sel on public.sponsored_posts
      for select using (is_active = true or public.is_global_admin(auth.uid()));
    create policy sp_ins on public.sponsored_posts
      for insert with check (public.is_global_admin(auth.uid()));
    create policy sp_upd on public.sponsored_posts
      for update using (public.is_global_admin(auth.uid()));
    create policy sp_del on public.sponsored_posts
      for delete using (public.is_global_admin(auth.uid()));
  end if;
end$$;

create index if not exists idx_sponsored_posts_active on public.sponsored_posts (is_active, created_at desc);

-- Demo e parë: reklamë për vetë SFERAT-in, që Agora të mos jetë bosh
insert into public.sponsored_posts (sponsor_name, title, body, cta_label, cta_url, is_active)
values (
  'SFERAT',
  'Mendo lirshëm. Debato me argumente. Bindu, ose bind.',
  'SFERAT është një republikë globale mendimesh, e ndarë në "Republika" tematike. Posto, komento, voto — dhe shëno komentet që vërtet ta ndryshojnë mendimin me "Convinced me", jo thjesht ato që të pëlqejnë.',
  'Eksploro Republikat',
  '/',
  true
);
