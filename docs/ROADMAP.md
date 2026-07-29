# SFERAT — Roadmap & Gjurmim Detyrash

Ky skedar mban gjurmët e asaj që është bërë dhe asaj që është shtyrë me qëllim për më vonë, që të mos humbasë asgjë ndërmjet sesioneve.

Referencë vizioni: `docs/VISION.md`

## ✅ Kryer

- Rindërtim i plotë i databazës (projekt i ri Supabase pas suspendimit të të vjetrit)
- Deploy funksional në Vercel
- Trigger i munguar për krijimin e profilit në regjistrim (+ backfill)
- Kolonat e munguara `employment/education/location/topics` te `profiles`
- Route-i duplikat `/u/[handle]` u hoq
- Linku i thyer "Profile" te menyja + pastrim `NotificationBell`
- 5 Republika fillestare + seksione "Feed"
- Skedulim i `expire_posts()` çdo orë (pg_cron) — postimet skadojnë realisht pas 7 ditësh
- Rindërtim i moderimit (`mod/panel`, `mod/reports`) të përputhet me skemën reale (`post_id`/`comment_id`, `status='removed'`), me grupim raportesh në kod (prag min. 3)
- Follow/Unfollow për Republika (buton në faqen e Republikës)
- `/search` u rishkrua nga zero si kërkim real (postime, republika, përdorues) — më parë ishte kopje e padobishme e feed-it kryesor, tani u shtua edhe link në menynë e sipërme
- Profili: kartë "Contributions" me statistika reale (Posts/Comments/Karma, llogaritur nga databaza, jo të deklaruara) + rregullim i query-t të thyer të tab-it "Comments"
- Përshtatje mobile: viewport meta (mungonte fare — kjo ishte shkaku kryesor pse app-i dukej si desktop i ngjeshur në telefon), navigim me hamburger/drawer (Republikat tani të arritshme në telefon), header kompakt me ikona, rregullim i "tap highlight"/fokusit që bënte butonat të duken "ngecur"
- **Republic Card** — kartë virtuale profili (si kartë krediti), me "flip" 3D, 5 nivele (Citizen → Contributor → Voice → Senator → Founder) bazuar te pikët (karma + postime×5 + komente×2), e dukshme vetëm për vizitorë të kyçur

## 🔜 Shtyrë me qëllim — mos harro

### Gjurmimi i kohës në platformë për Republic Card (pjesë e P2.3)
**Status:** Formula aktuale e pikëve (karma + postime + komente) **nuk përfshin kohën e shpenzuar** — kjo u la qëllimisht për më vonë, sepse kërkon infrastrukturë të re (regjistrim sesionesh/aktiviteti) që s'e kemi ende.

**Si mund të zbatohet kur të vijë koha:** tabelë e re `user_sessions` (ose fusha `total_active_seconds` te `profiles`) e përditësuar me "heartbeat" periodik nga kliente (çdo 30-60s ndërsa faqja është aktive), plus logjikë server-side (funksion + trigger ose cron) që e shton në formulën e pikëve të Republic Card.

**Kur ta rimarrim:** kur të kesh vendosur si duhet ta peshosh kohën krahasuar me kontributin real (që të mos favorizohet dikush që thjesht lë tab-in hapur).

### Strategjia Cold-Start (P2.2)
**Ideja:** përpara se platforma të hapet gjerësisht, kuro 50–200 "kontribues themelues" (profesorë, gazetarë, ekspertë fushash) të ftuar në Republika specifike — kështu standardi i cilësisë vendoset që në ditën e parë, jo pas. Pa këtë, mekanizmi "cilësi mbi sasi" i vizionit s'ka konkurrencë të mjaftueshme për të funksionuar realisht në fillim (problemi klasik i "cold start").

**Kur ta rimarrim:** kur platforma të jetë gati teknikisht për përdorues të vërtetë (bug-e kryesore të mbyllura, UX e qëndrueshme) dhe të fillojmë të mendojmë për lançimin. Do ta sjell vetë këtë temë sërish kur të arrijmë atë pikë — nuk duhet ta kesh në mendje ndërkohë.

### Moderatorë për-Republikë (P1.2)
**Status:** Skema e mbështet (`user_roles.republic_id`, null = global), por s'ka asnjë UI për caktim rolesh — as global, as per-Republikë.

**Zgjidhje e përkohshme (deri sa të ndërtohet UI):** cakto moderator manualisht me SQL:
```sql
-- Global moderator
insert into public.user_roles (user_id, role, republic_id)
values ('<user-id>', 'moderator', null);

-- Moderator vetëm për një Republikë specifike
insert into public.user_roles (user_id, role, republic_id)
values ('<user-id>', 'moderator', '<republic-id>');
```

**Kur të ndërtohet UI-ja (opsioni "B" i diskutuar):**
- Faqe e re admin (p.sh. `/mod/roles`) — admin global kërkon përdorues, cakton rol + Republikë
- `useIsModerator` (`components/hooks/useIsModerator.ts`) të pranojë parametër `republicId` opsional, në vend që të kontrollojë vetëm rolin global
- `mod/panel` të filtrojë raportet sipas Republikave ku përdoruesi është moderator (nëse s'është admin global)

**Kur ta rimarrim:** kur të ketë komunitet real / Republika aktive që kërkojnë moderim të dedikuar.

## 📋 P1 — mbetur

_(asgjë e mbetur nga P1 aktuale — të gjitha pikat u mbyllën)_

## 📋 P2 — rritje/diferencim (afatgjatë)

_(shiko "Shtyrë me qëllim" sipër për Strategjinë Cold-Start — P2.2)_
