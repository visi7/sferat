-- 1) Video si tip i ri përmbajtjeje për reklamat e Agora-s.
alter table public.sponsored_posts add column if not exists video_url text;

-- 2) Demo-ja e parë ishte shkruar në shqip gabimisht — gjithë teksti i
-- ndërfaqes është në anglisht, kështu duhet edhe kjo. Fshihet dhe rikrijohet
-- (jo update i verbër), që skripti të mbetet i sigurt edhe nëse ekzekutohet
-- para se demo-ja fillestare të jetë futur ndonjëherë.
delete from public.sponsored_posts where sponsor_name = 'SFERAT';

insert into public.sponsored_posts (sponsor_name, title, body, cta_label, cta_url, is_active)
values (
  'SFERAT',
  'Think freely. Debate with arguments. Convince, or be convinced.',
  'SFERAT is a global republic of ideas, organized into topic-based "Republics." Post, comment, vote — and mark the comments that actually changed your mind with "Convinced me," not just the ones you liked.',
  'Explore the Republics',
  '/',
  true
);
