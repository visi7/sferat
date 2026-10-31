-- Mbi tabelën `votes` ekzistonin 2 trigger-a AFTER INSERT/UPDATE/DELETE:
--   1. trg_votes_recalc -> tg_votes_recalc() -> recalc_post_scores()  (i sakti,
--      SECURITY DEFINER që prej 20260723190000_security_definer_fixes.sql,
--      llogarit upvotes/downvotes/score/wilson/hot_score)
--   2. votes_after_upsert -> after_vote_upsert() -> recompute_post_score()
--      (i vjetër, NUK është SECURITY DEFINER, vendos vetëm score = sum(value),
--      pa prekur upvotes/downvotes/wilson/hot_score)
--
-- Postgres i ekzekuton trigger-at e të njëjtit event sipas renditjes alfabetike
-- të emrit ('trg_votes_recalc' para 'votes_after_upsert'), kështu që sot #2 është
-- plotësisht i padëmshëm: për vota mbi postime të të tjerëve RLS e bllokon në
-- heshtje (score-i i saktë i vendosur nga #1 mbetet); për vota mbi postimin e
-- vet, sum(value) jep numerikisht të njëjtën vlerë si upvotes-downvotes, pra
-- mbishkrim i kotë. Rreziku: nëse dikush fshin/ndryshon #1 pa ditur për #2 në
-- të ardhmen, #2 "zgjohet" dhe shkruan score të gabuar (pa wilson/hot_score).
--
-- Verifikuar: asnjë vend tjetër në migrime apo kod app-i s'referon
-- after_vote_upsert/recompute_post_score/votes_after_upsert.

drop trigger if exists "votes_after_upsert" on public.votes;
drop function if exists public.after_vote_upsert();
drop function if exists public.recompute_post_score(uuid);
