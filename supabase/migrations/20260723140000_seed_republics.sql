-- Seeds initial Republics (from docs/VISION.md examples) plus a base
-- "Feed" section for each, so the app isn't empty on first load and the
-- post composer's section dropdown has at least one option.

insert into public.republics (slug, title, description, emoji, is_active)
values
  ('democracy',   'Democracy',   'Diskutime rreth demokracisë, të drejtave dhe pjesëmarrjes qytetare.', '🗳️', true),
  ('communism',   'Communism',   'Diskutime rreth pronësisë kolektive, klasave shoqërore dhe barazisë ekonomike.', '✊', true),
  ('capitalism',  'Capitalism',  'Diskutime rreth tregut të lirë, pronësisë private dhe konkurrencës.', '💰', true),
  ('technocracy', 'Technocracy', 'Diskutime rreth qeverisjes së bazuar në shkencë, të dhëna dhe ekspertizë.', '🤖', true),
  ('anarchism',   'Anarchism',   'Diskutime rreth vetëorganizimit dhe shoqërive pa shtet.', '🏴', true)
on conflict (slug) do nothing;

insert into public.republic_sections (republic_id, slug, label, position)
select r.id, 'feed', 'Feed', 0
from public.republics r
where r.slug in ('democracy','communism','capitalism','technocracy','anarchism')
on conflict (republic_id, slug) do nothing;
