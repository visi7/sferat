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
- Kolona e djathtë (Trending/Who to follow/Announcements) shkon te drawer-i ☰ në telefon; profili mban gjithmonë Republic Card/Contributions/Credentials/Topics të dukshme direkt; footer i ri; tab "Activity" tani real (jo "coming soon")
- **Moderatorë për-Republikë (P1.2) — u mbyll**: tabela `user_roles` (mungonte fare — çdo kontroll "a je moderator" dështonte në heshtje) + faqja admin `/mod/roles` për të caktuar rol global ose për-Republikë + `useIsModerator` mbështet tani `republicId` opsional. "test" u bë admin global.
- **Bug: `/mod/roles` s'e njihte admin-in global edhe pse rreshti në `user_roles` ishte i saktë** — shkaku ishte rekursion i pafund në RLS (`42P17`): policy-ja `user_roles_admin_write` kontrollonte "a je admin" duke pyetur vetë `user_roles`, gjë që rideklanshonte RLS-në mbi të njëjtën tabelë pambarimisht, duke bërë që **çdo** pyetje ndaj `user_roles` (madje edhe SELECT të thjeshtë) të dështonte në heshtje. Rregulluar duke e zhvendosur kontrollin te një funksion `SECURITY DEFINER` (`public.is_global_admin`), i cili anashkalon RLS-në kur pyet `user_roles` nga brenda.
- **P1.2 e verifikuar plotësisht në produksion**: "test" (admin global) cakton nga `/mod/roles` rolin "moderator" për "test2" te Republika "Capitalism" → "test2" hyn dhe e sheh "Moderator panel" në meny, `/mod/panel` hapet pa gabim. Testuar edhe rasti admin global, edhe rasti moderator per-Republikë.
- **`mod/panel` filtrim sipas Republikës — u mbyll**: gjatë zbatimit u zbulua se `reports_select_self_or_mod`/`reports_update_mod` (RLS), dhe `posts`/`comments` (mungonte fare rregull UPDATE për moderatorë), përdornin ende kolonën e braktisur `profiles.is_moderator` (gjithmonë `false`) — domethënë asnjë moderator, as edhe admin global, s'kishte parë realisht raporte të të tjerëve dhe "Accept" s'kishte hequr kurrë përmbajtje. Rregulluar me funksione `SECURITY DEFINER` (`is_global_mod`, `is_mod_of_republic`, `is_any_mod`) të bazuara te `user_roles`, duke përfshirë edhe `audit_log` (trigger-i `trg_report_audit` bllokohej po nga e njëjta kolonë e vjetër). Filtrimi per-Republikë tani zbatohet vetë nga RLS-ja (jo vetëm në kod klienti) — testuar në produksion: "test2" (moderator vetëm te Capitalism) sheh dhe pranon (Accept) raporte vetëm te Republika e vet.

## 🔜 Shtyrë me qëllim — mos harro

### Gjurmimi i kohës në platformë për Republic Card (pjesë e P2.3)
**Status:** Formula aktuale e pikëve (karma + postime + komente) **nuk përfshin kohën e shpenzuar** — kjo u la qëllimisht për më vonë, sepse kërkon infrastrukturë të re (regjistrim sesionesh/aktiviteti) që s'e kemi ende.

**Si mund të zbatohet kur të vijë koha:** tabelë e re `user_sessions` (ose fusha `total_active_seconds` te `profiles`) e përditësuar me "heartbeat" periodik nga kliente (çdo 30-60s ndërsa faqja është aktive), plus logjikë server-side (funksion + trigger ose cron) që e shton në formulën e pikëve të Republic Card.

**Kur ta rimarrim:** kur të kesh vendosur si duhet ta peshosh kohën krahasuar me kontributin real (që të mos favorizohet dikush që thjesht lë tab-in hapur).

### Strategjia Cold-Start (P2.2)
**Ideja:** përpara se platforma të hapet gjerësisht, kuro 50–200 "kontribues themelues" (profesorë, gazetarë, ekspertë fushash) të ftuar në Republika specifike — kështu standardi i cilësisë vendoset që në ditën e parë, jo pas. Pa këtë, mekanizmi "cilësi mbi sasi" i vizionit s'ka konkurrencë të mjaftueshme për të funksionuar realisht në fillim (problemi klasik i "cold start").

**Kur ta rimarrim:** kur platforma të jetë gati teknikisht për përdorues të vërtetë (bug-e kryesore të mbyllura, UX e qëndrueshme) dhe të fillojmë të mendojmë për lançimin. Do ta sjell vetë këtë temë sërish kur të arrijmë atë pikë — nuk duhet ta kesh në mendje ndërkohë.

### `mod/panel` filtrim sipas Republikës (vazhdim i P1.2)
**Status:** `/mod/roles` tani lejon caktimin e moderatorëve per-Republikë, por `mod/panel` ende u shfaq **të gjitha** raportet çdo moderatori, pa filtruar sipas Republikave që mbulon (vetëm admin global duhet t'i shohë të gjitha).

**Kur ta rimarrim:** kur të ketë moderatorë realë per-Republikë (jo vetëm global) që kanë nevojë praktike për këtë ndarje.

## 📋 P1 — mbetur

_(asgjë e mbetur nga P1 aktuale — të gjitha pikat u mbyllën)_

## 📋 P2 — rritje/diferencim (afatgjatë)

_(shiko "Shtyrë me qëllim" sipër për Strategjinë Cold-Start — P2.2)_
