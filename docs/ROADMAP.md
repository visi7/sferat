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

## 🔜 Shtyrë me qëllim — mos harro

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

- Testim i plotë i faqes `/search`

## 📋 P2 — rritje/diferencim (afatgjatë)

- Profili si "kartë identiteti intelektuale" e verifikueshme (kontribute reale, jo vetëm bio)
- Strategji cold-start: kurim i 50–200 kontribuesve fillestarë përpara lançimit publik të gjerë, që standardi i cilësisë të vendoset që në fillim
