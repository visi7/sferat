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
- **Auditim i dytë (pas P1.2)** — kalim sistematik nëpër të gjitha trigger-at, funksionet dhe politikat RLS, plus kryqëzim me kodin e app-it për kod të vdekur:
  - `republics_write_mod` përdorte po të njëjtën kolonë të braktisur `profiles.is_moderator` (pa pasoja sot, sepse s'ka ende UI për editim Republikash, por do të kishte dështuar në heshtje sapo të krijohej një). Rregulluar njësoj si pjesa tjetër, me `is_global_mod`.
  - Hequr kod i vdekur: `apps/web/app/mod/reports/page.tsx` (kopje e vjetër/jetime e `/mod/panel`, pa asnjë link drejt saj), dhe funksionet e papërdorura `vote/comment/followUser/unfollowUser/savePost/unsavePost/reportPost` te `apps/web/app/actions.ts` (të gjitha të zëvendësuara nga logjika brenda `postCard.tsx`; mbetën vetëm `followRepublic`/`unfollowRepublic`, të vetmet realisht të importuara).
  - Tabela `comment_reports` u gjet krejtësisht e papërdorur (app-i i fut të gjitha raportet te tabela e përbashkët `reports`) — u la e paprekur (s'shkakton dëm, dhe fshirja e një tabele është veprim më i vështirë për t'u kthyer mbrapsht).
- Link "Manage roles" te menyja ☰ (ACCOUNT) — `/mod/roles` ishte i arritshëm vetëm duke shkruar URL-në manualisht, tani ka link, dukshëm vetëm për admin global.
- **Hierarkia e roleve u zgjerua nga 2 (admin/moderator) në 4 nivele**: `assistant` (vetëm-shqyrtues — sheh raportet, s'mund të vendosë Accept/Reject), `moderator` (i pandryshuar), `manager` (të njëjtat të drejta si moderator, mendohet për dikë që mbikëqyr një Republikë të tërë ose globalisht), `admin` (i pandryshuar). Zbatuar me funksione të reja RLS (`is_global_reviewer`/`is_reviewer_of_republic` për shikim, `is_global_mod`/`is_mod_of_republic`/`is_any_mod` u zgjeruan të përfshijnë `manager`) — kufizimi i "Assistant" (view-only) zbatohet vetë në RLS, jo vetëm duke fshehur butonat në UI. `/mod/roles` tani lejon caktimin e të katër niveleve; `/mod/panel` fsheh Accept/Reject dhe shfaq "View only" për kë s'ka të drejtë zgjidhjeje aty. **Shënim:** caktimi i roleve (kush mund të japë role të tjerëve) mbetet ende vetëm admin global — ideja "Manager mund të caktojë Asistentë vetë" u la si hap i mundshëm i ardhshëm, jo e zbatuar tani.

## 🔜 Shtyrë me qëllim — mos harro

### Gjurmimi i kohës në platformë për Republic Card (pjesë e P2.3)
**Status:** Formula aktuale e pikëve (karma + postime + komente) **nuk përfshin kohën e shpenzuar** — kjo u la qëllimisht për më vonë, sepse kërkon infrastrukturë të re (regjistrim sesionesh/aktiviteti) që s'e kemi ende.

**Si mund të zbatohet kur të vijë koha:** tabelë e re `user_sessions` (ose fusha `total_active_seconds` te `profiles`) e përditësuar me "heartbeat" periodik nga kliente (çdo 30-60s ndërsa faqja është aktive), plus logjikë server-side (funksion + trigger ose cron) që e shton në formulën e pikëve të Republic Card.

**Kur ta rimarrim:** kur të kesh vendosur si duhet ta peshosh kohën krahasuar me kontributin real (që të mos favorizohet dikush që thjesht lë tab-in hapur).

### Share i Republic Card në rrjete sociale
**Ideja:** buton "Share" te `RepublicCard` që lejon ndarjen e kartës jashtë platformës. Dy shkallë:
1. **Share i thjeshtë** (Web Share API — hap menynë native të pajisjes, ndan linkun e profilit `/profile/username`; në desktop bie mbrapa te "kopjo linkun"). ~30 min punë, mbulon shumicën e rasteve pasi karta shfaqet e gjallë kur hapet linku.
2. **Share si imazh** (si "Spotify Wrapped") — gjeneron një PNG real të kartës për t'u shkarkuar/ndarë direkt si imazh (më mbresëlënëse për Instagram/X, por kërkon më shumë punë — ~2-3 orë, ose librari client-side "screenshot", ose route i posaçëm server-side për gjenerim imazhi).

### Promovim automatik në "Assistant" sipas pikëve (vazhdim i hierarkisë së roleve)
**Status:** Hierarkia e 4 niveleve (assistant/moderator/manager/admin) tashmë ekziston, por sot **të gjitha rolet caktohen manualisht** nga admini te `/mod/roles`. Ideja e mbetur: kur pikët e dikujt **brenda një Republike specifike** kalojnë një prag, të bëhet automatikisht "Assistant" i asaj Republike (vetëm-shqyrtues), me buton/panel që i shfaqet vetë.

**Formula e pragut (e rënë dakord, e papërdorur ende):** `Pragu(Republika) = MAX(20, 3 × Mediana e pikëve të kontribuesve aktivë të asaj Republike)` — vetërregullohet sipas aktivitetit të secilës Republikë, në vend të një numri fiks. "Aktiv" = ka postuar/komentuar të paktën 1 herë atje.

**Kthyeshmëria (e rënë dakord):** nëse pikët bien nën prag më vonë, s'hiqet automatikisht — sistemi e shënon "për rishqyrtim" dhe admini vendos te `/mod/roles`.

**Çfarë kërkon zbatimi:** (1) pyetje/funksion që llogarit pikët e dikujt BRENDA një Republike specifike (jo globalisht si sot te Republic Card — por e mundshme pa tabelë të re, thjesht duke filtruar postimet/komentet/votat sipas `republic_id`), (2) job periodik (ose trigger) që kontrollon pragun dhe krijon rreshtin `user_roles` me `role='assistant'`, (3) seksion te `/mod/roles` që shfaq "nën prag — për rishqyrtim" për Asistentët e promovuar automatikisht.

**Kur ta rimarrim:** kur platforma të ketë përdorues realë e aktivitet të mjaftueshëm sa formula e medianës të ketë kuptim (me pak të dhëna, mediana s'është domethënëse).

**Kur ta rimarrim:** kur të duam të shtojmë "growth loop" real (karta që qarkullon vetë jashtë platformës) — natyrshëm afër kohës së Strategjisë Cold-Start (P2.2) më poshtë, meqë të dyja synojnë të tërheqin përdorues të rinj.

### Strategjia Cold-Start (P2.2)
**Ideja:** përpara se platforma të hapet gjerësisht, kuro 50–200 "kontribues themelues" (profesorë, gazetarë, ekspertë fushash) të ftuar në Republika specifike — kështu standardi i cilësisë vendoset që në ditën e parë, jo pas. Pa këtë, mekanizmi "cilësi mbi sasi" i vizionit s'ka konkurrencë të mjaftueshme për të funksionuar realisht në fillim (problemi klasik i "cold start").

**Kur ta rimarrim:** kur platforma të jetë gati teknikisht për përdorues të vërtetë (bug-e kryesore të mbyllura, UX e qëndrueshme) dhe të fillojmë të mendojmë për lançimin. Do ta sjell vetë këtë temë sërish kur të arrijmë atë pikë — nuk duhet ta kesh në mendje ndërkohë.

### Trigger i dyfishtë mbi `votes` (pastrim delikat, jo urgjent)
**Status:** ekzistojnë DY trigger-a mbi `votes` (INSERT/UPDATE/DELETE) që bëjnë pjesërisht të njëjtën punë: `trg_votes_recalc` (i saktë, `SECURITY DEFINER`, e rregulluam këtë sesion) dhe një i dytë më i vjetër, `votes_after_upsert` → `recompute_post_score()`, që **nuk** është `SECURITY DEFINER`. Sot është i padëmshëm (dështon në heshtje për vota mbi postime të të tjerëve, por trigger-i tjetër tashmë e ka bërë punën saktë para tij) — por është rrezik i fshehur nëse dikush në të ardhmen fshin/prek trigger-in e parë pa e ditur për të dytin.

**Kur ta rimarrim:** si pastrim i qetë, i veçantë, kur të mos jetë nën presion kohe (kërkon verifikim me kujdes të radhës së ekzekutimit të trigger-ave para se të hiqet ndonjëri).

## 📋 P1 — mbetur

_(asgjë e mbetur nga P1 aktuale — të gjitha pikat u mbyllën)_

## 📋 P2 — rritje/diferencim (afatgjatë)

_(shiko "Shtyrë me qëllim" sipër për Strategjinë Cold-Start — P2.2)_
