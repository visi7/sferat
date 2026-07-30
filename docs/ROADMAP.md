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
- **Settings i llogarisë (i ri)**: faqe `/settings` (ndryshim fjalëkalimi + hapësirë gati për opsione të tjera), plus rikuperim llogarie i plotë — `/forgot-password` (dërgon email me link) dhe `/reset-password` (cakton fjalëkalim të ri nga linku). Përdor drejtpërdrejt Supabase Auth, s'prek databazën fare. Link "Settings" te menyja ☰, link "Forgot password?" te `/sign-in`. **Kërkon konfigurim një-herësh nga ti**: shto `https://<domain>/reset-password` te Supabase Dashboard → Authentication → URL Configuration → Redirect URLs, përndryshe linku i email-it s'do të funksionojë në produksion.
- **Gjithë teksti i dukshëm i UI-t u kthye në anglisht** (gjuha parësore e platformës, meqë synohet audiencë globale) — `/sign-in`, `/search`, footer-i, formulari inline i kyçjes te ballina. Komentet e kodit mbetën shqip (janë për ne, jo për përdoruesit).
- **Menaxhimi i njoftimeve u plotësua**: fshirje individuale (🗑) dhe "Clear all" te `/notifications` + dropdown-i 🔔, "Mark all read" te faqja e plotë (më parë ndodhte vetëm automatikisht te dropdown-i), filtër "All/Unread", dhe **njoftimet tani janë të klikueshme** (çonin gjëkundi më parë, edhe pse e dhëna e post/koment-it ekzistonte tashmë te `payload`) — çojnë te postimi/komenti përkatës, ose profili i personit për "follow". "Arkivim" si gjendje e veçantë u la qëllimisht jashtë (do të ishte kryesisht dublikatë i "fshi").
- **Dropdown-i "Feed" i kompozuesit (ballina) u hoq**: ishte një zgjedhje me **1 opsion të vetëm** ("Feed") për çdo Republikë — pra s'ofronte zgjedhje reale, thjesht zhurmë vizuale. Postimet vazhdojnë të shkojnë te "feed" automatikisht, pa asnjë ndryshim funksional. (Tabela `republic_sections` mbetet e paprekur — vetëm UI-ja e kotë u hoq, jo infrastruktura.)
- **Vizioni afatgjatë i platformës (pronësi, monetizim) u diskutua dhe u nda në faza** — shih "Vizion monetizimi" më poshtë te "Shtyrë me qëllim" për listën e plotë. Dy pikat pa rrezik financiar/ligjor u zbatuan menjëherë:
  - **Feed i personalizuar sipas Republikës së zgjedhur**: `profiles.default_republic_id` (e re) + seksion i ri "Default feed" te `/settings` — kur hyn, sheh automatikisht Republikën e preferuar në vend të "All Republics" të përziera (nëse s'ke zgjedhur asnjë, sillet si sot). Mund ta ndryshosh gjithmonë me tab-et Top/New apo "Show all Republics".
  - **Kohëzgjatje postimi e zgjedhshme (1/3/7 ditë)**: selektor i ri te kompozuesi; më parë ishte gjithmonë 7 ditë fikse për të gjithë. Databaza tashmë e mbështeste këtë (trigger-i `set_post_timeboxes` respekton `expires_at` nëse jepet nga klienti) — s'kërkoi migrim.
- **Settings i llogarisë u zgjerua — ndryshim email, dhe fshirje llogarie** (këto ishin gjetur si mangësi gjatë diskutimit të vizionit të monetizimit, jo pjesë e tij):
  - **Ndryshim email**: `supa.auth.updateUser({ email })` — Supabase dërgon vetë link konfirmimi te adresa e re. Zero ndryshim databaze.
  - **Fshirje llogarie = anonimizim, jo fshirje e vërtetë**: `posts.author_id`/`comments.author_id` kanë `ON DELETE CASCADE` nga `profiles`, i cili nga ana e vet ka `ON DELETE CASCADE` nga `auth.users` — domethënë fshirja e vërtetë e llogarisë do të fshinte **çdo postim/koment** të përdoruesit, duke prishur biseda të të tjerëve. Në vend të kësaj: (1) klienti "zbraz" profilin e vet (username→`private_user_xxxxxxxx`, emri→"Private user", avatar→ikonë e re `deleted-avatar.svg`, bio/employment/education/location/topics→bosh, `deleted_at`=tani) — mbuluar nga RLS-ja ekzistuese `profiles_update_self`; (2) një route i ri server-side (`/api/delete-account`) e "banon" llogarinë (Supabase `auth.admin.updateUserById` me `ban_duration` ~100 vjet) që të mos mund të rikyçet më — kjo kërkon çelësin sekret `service_role`, i cili s'mund të jetë në kod klienti. Postimet/komentet mbeten, thjesht autori shfaqet si "Private user" (siç kërkoi pronari, jo "[deleted user]"). **Kërkon konfigurim një-herësh nga ti**: shto `SUPABASE_SERVICE_ROLE_KEY` (nga Supabase Dashboard → Settings → API → "service_role", **çelësi sekret**, JO ai publik) te Vercel → Project Settings → Environment Variables — do t'i japim hollësitë kur të mbërrijmë te testimi.

## 🔜 Shtyrë me qëllim — mos harro

### Vizion monetizimi (afatgjatë, kërkon planifikim serioz)
**Konteksti:** platforma duhet të financohet nga diçka, por pa u bërë "e bezdisshme" si reklamat tipike (FB/IG). Ideja e plotë e propozuar (e ndarë sipas rrezikut/kompleksitetit):

- **"Sponsorizim" pagese për zgjatje postimi** (jo reklamë biznesi) — kërkon integrim procesori pagesash (Stripe), vendime çmimesh/nivelesh. Projekt më vete.
- **Reklama të maskuara si postime nga një llogari "agjent" e Sferës** — teknikisht e thjeshtë, por **kërkon patjetër etiketim minimal ("Sponsored"/"Ad")** për arsye ligjore (rregulla reklamash FTC/BE kundër reklamës së maskuar pa dallim) — jo zero-disclosure siç u propozua fillimisht.
- **Administratorë Republike me përfitim monetar nga të ardhurat e brendshme** — lidhet me hierarkinë e roleve (Assistant/Moderator/Manager) dhe idenë e promovimit automatik sipas pikëve (shih më poshtë) — por "përfitim monetar" do të thotë payout real drejt njerëzve: verifikim identiteti, tatime, strukturë biznesi/ligjore pas saj. Pika më ambicioze e gjithë vizionit.

**Kur ta rimarrim:** procesori i pagesave (Stripe) + etiketimi i reklamave si fazë e parë, kur të jesh gati të vendosësh çmime; payout-et te administratorët si fazë shumë më e largët, kur platforma të ketë të ardhura reale që e justifikojnë.

### Seksioni "Announcements" per-Republikë (vazhdim i heqjes së dropdown-it "Feed")
**Ideja:** ta bëjmë tabelën `republic_sections` realisht të dobishme duke shtuar një seksion të dytë, "Announcements" — postime zyrtare të dukshme veçmas nga diskutimi i lirë, të postueshme vetëm nga Moderator/Manager/Admin i asaj Republike (lidhet natyrshëm me hierarkinë e roleve që ekziston tashmë). Prek edhe tab-et te faqja e Republikës (`republic/[slug]/page.tsx`), sot me 1 tab të vetëm ("Feed"), gjithashtu pak të kotë aktualisht.

**Kur ta rimarrim:** kur të ketë nevojë reale për dallim "diskutim i lirë" vs "njoftim zyrtar" brenda një Republike — jo e ndërtuar paraprakisht pa kërkesë praktike.

### Preferenca njoftimesh (vazhdim i menaxhimit të njoftimeve)
**Ideja:** të zgjedhësh çfarë lloj njoftimesh do të marrësh (p.sh. "jo për upvote, po për replies dhe follows"). Kërkon kolonë/tabelë e re preferencash + kontroll në secilin trigger `notify_*` para se të fusë rresht të ri.

**Kur ta rimarrim:** kur të kesh sinjal real që njoftimet po bëhen "zhurmë" për përdoruesit (shumë prej tyre pa lidhje me interesin e tyre) — jo diçka për ta ndërtuar paraprakisht pa nevojë.

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
