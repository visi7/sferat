


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "pg_catalog";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pg_trgm" WITH SCHEMA "public";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."after_vote_upsert"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  perform public.recompute_post_score(new.post_id);
  return new;
end; $$;


ALTER FUNCTION "public"."after_vote_upsert"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."comments_rl"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  perform public.rate_limit_check('comments','author_id', new.author_id, 60, 10);
  return new;
end $$;


ALTER FUNCTION "public"."comments_rl"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."compute_hot_score"("p_score" integer, "p_created_at" timestamp with time zone) RETURNS double precision
    LANGUAGE "plpgsql"
    AS $$
declare
  v_order double precision;
  v_sign  int;
  v_secs  double precision;
begin
  v_sign  := case when p_score > 0 then 1 when p_score < 0 then -1 else 0 end;
  v_order := log(greatest(abs(p_score), 1)) * v_sign;
  v_secs  := extract(epoch from (p_created_at - timestamp '1970-01-01 00:00:00'));
  return round((v_order + v_secs / 45000)::numeric, 7);
end
$$;


ALTER FUNCTION "public"."compute_hot_score"("p_score" integer, "p_created_at" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."contains_profanity"("txt" "text") RETURNS boolean
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
declare bad text[] := array['idiot','fuck','shit'];
begin
  if txt is null then return false; end if;
  return exists (
    select 1 from unnest(bad) b
    where position(lower(b) in lower(txt)) > 0
  );
end $$;


ALTER FUNCTION "public"."contains_profanity"("txt" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."excessive_links"("t" "text", "max_links" integer DEFAULT 3) RETURNS boolean
    LANGUAGE "sql" IMMUTABLE
    AS $$
  select regexp_count(coalesce(t, ''), '(https?://|www\.)', 1, 'i') > max_links;
$$;


ALTER FUNCTION "public"."excessive_links"("t" "text", "max_links" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."excessive_links_g"("txt" "text", "max_links" integer DEFAULT 3) RETURNS boolean
    LANGUAGE "sql" IMMUTABLE
    AS $$
  select (
    select count(*) 
    from regexp_matches(coalesce(txt,''), '(https?://|www\.)', 'g')
  ) > max_links;
$$;


ALTER FUNCTION "public"."excessive_links_g"("txt" "text", "max_links" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."expire_posts"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  update public.posts
    set status = 'expired'
  where status = 'active' and now() >= expires_at;
end; $$;


ALTER FUNCTION "public"."expire_posts"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."extract_link_preview"("target_url" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
declare
  res jsonb := jsonb_build_object('url', target_url);
begin
  -- thjesht placeholder, sepse scraping do bëhet nga client/server-side function
  return res;
end $$;


ALTER FUNCTION "public"."extract_link_preview"("target_url" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."guard_comments"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  if public.contains_profanity(new.body) then
    raise exception 'profanity_detected';
  end if;
  if public.excessive_links(new.body) then
    raise exception 'too_many_links';
  end if;
  return new;
end $$;


ALTER FUNCTION "public"."guard_comments"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."guard_links"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  if new.body is not null and public.excessive_links(new.body, 3) then
    raise exception 'Too many links in body (anti-spam)';
  end if;
  return new;
end
$$;


ALTER FUNCTION "public"."guard_links"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  insert into public.profiles (id, username, display_name)
  values (new.id, split_part(new.email, '@', 1), split_part(new.email, '@', 1))
  on conflict (id) do nothing;
  return new;
end; $$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_report_update"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  insert into public.audit_log(actor_id, action, entity_table, entity_id, metadata)
  values (auth.uid(), 'report_update', 'reports', new.id,
          jsonb_build_object('from', old.status, 'to', new.status));
  return new;
end $$;


ALTER FUNCTION "public"."log_report_update"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notify_report_resolution"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  if (new.status in ('accepted','rejected')) then
    insert into public.notifications(user_id, type, payload)
    values (new.reporter_id, 'report_result',
            jsonb_build_object('report_id', new.id, 'status', new.status));
  end if;
  return new;
end $$;


ALTER FUNCTION "public"."notify_report_resolution"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."on_comment_votes_changed"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  perform public.recalc_comment_score(coalesce(new.comment_id, old.comment_id));
  return null;
end $$;


ALTER FUNCTION "public"."on_comment_votes_changed"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."posts_rl"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  perform public.rate_limit_check('posts','author_id', new.author_id, 600, 5);
  return new;
end $$;


ALTER FUNCTION "public"."posts_rl"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rate_limit_check"("tbl" "text", "user_col" "text", "user_id" "uuid", "window_seconds" integer, "max_rows" integer) RETURNS "void"
    LANGUAGE "plpgsql"
    AS $_$
declare cnt int;
begin
  execute format(
    'select count(*) from %I where %I = $1 and created_at >= now() - make_interval(secs => $2)',
    tbl, user_col
  ) into cnt using user_id, window_seconds;

  if cnt >= max_rows then
    raise exception 'rate_limited_%', tbl using hint = 'too_many_actions';
  end if;
end $_$;


ALTER FUNCTION "public"."rate_limit_check"("tbl" "text", "user_col" "text", "user_id" "uuid", "window_seconds" integer, "max_rows" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."recalc_comment_score"("c_id" "uuid") RETURNS "void"
    LANGUAGE "sql"
    AS $$
  update public.comments c
  set score = coalesce((select sum(value) from public.comment_votes where comment_id = c_id), 0)
  where c.id = c_id;
$$;


ALTER FUNCTION "public"."recalc_comment_score"("c_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."recalc_post_scores"("p_post_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
declare
  v_up   int;
  v_down int;
  v_score int;
  v_wilson numeric;
  v_age_hours numeric;
  v_decay numeric;
  v_hot numeric;
  v_created_at timestamptz;
begin
  select
    coalesce(sum(case when value = 1  then 1 else 0 end),0),
    coalesce(sum(case when value = -1 then 1 else 0 end),0)
  into v_up, v_down
  from public.votes
  where post_id = p_post_id;

  v_score := v_up - v_down;
  v_wilson := public.wilson_lower_bound(v_up, v_down);

  select created_at into v_created_at from public.posts where id = p_post_id;
  v_age_hours := extract(epoch from (now() - v_created_at)) / 3600.0;

  -- τ = 48h; mund ta ndryshosh sipas shijes
  v_decay := exp(- v_age_hours / 48.0);

  -- hot: wilson ka peshë kryesore; score ndihmon për lidhje
  v_hot := (v_wilson * 1000.0 + v_score * 0.1) * v_decay;

  update public.posts
  set upvotes   = v_up,
      downvotes = v_down,
      score     = v_score,   -- mban kompatibilitetin që ke
      wilson    = v_wilson,
      hot_score = v_hot
  where id = p_post_id;
end $$;


ALTER FUNCTION "public"."recalc_post_scores"("p_post_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."recompute_hot_score"("p_post_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
declare
  v_score   int;
  v_created timestamptz;
begin
  select p.score, p.created_at
    into v_score, v_created
  from public.posts p
  where p.id = p_post_id;

  update public.posts p
     set hot_score = public.compute_hot_score(coalesce(v_score, 0), v_created)
   where p.id = p_post_id;
end
$$;


ALTER FUNCTION "public"."recompute_hot_score"("p_post_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."recompute_post_score"("p_post" "uuid") RETURNS "void"
    LANGUAGE "sql"
    AS $$
  update public.posts p
    set score = coalesce((select sum(value)::int from public.votes v where v.post_id = p_post),0)
  where p.id = p_post;
$$;


ALTER FUNCTION "public"."recompute_post_score"("p_post" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reports_rl"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  perform public.rate_limit_check('reports','reporter_id', new.reporter_id, 600, 5);
  return new;
end $$;


ALTER FUNCTION "public"."reports_rl"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_post_timeboxes"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  if tg_op = 'INSERT' then
    new.expires_at := coalesce(new.expires_at, now() + interval '7 days');
    new.edited_until := coalesce(new.edited_until, now() + interval '5 minutes');
  end if;
  return new;
end; $$;


ALTER FUNCTION "public"."set_post_timeboxes"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."tg_votes_recalc"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  if (tg_op = 'DELETE') then
    perform public.recalc_post_scores(old.post_id);
  else
    perform public.recalc_post_scores(new.post_id);
  end if;
  return null;
end $$;


ALTER FUNCTION "public"."tg_votes_recalc"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."toggle_vote"("p_post_id" "uuid", "p_value" integer) RETURNS TABLE("score" integer, "user_vote" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_uid        uuid;
  v_existing   int;
  v_new_score  int;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = 'P0001';
  end if;
  if p_value not in (-1, 1) then
    raise exception 'Invalid vote value' using errcode = 'P0001';
  end if;

  select v.value into v_existing
  from public.votes v
  where v.user_id = v_uid and v.post_id = p_post_id;

  if v_existing is null then
    insert into public.votes(user_id, post_id, value)
    values (v_uid, p_post_id, p_value);
  elsif v_existing = p_value then
    delete from public.votes
    where user_id = v_uid and post_id = p_post_id;
  else
    update public.votes
       set value = p_value
     where user_id = v_uid and post_id = p_post_id;
  end if;

  select coalesce(sum(v.value), 0) into v_new_score
  from public.votes v
  where v.post_id = p_post_id;

  update public.posts p
     set score = v_new_score
   where p.id = p_post_id;

  perform public.recompute_hot_score(p_post_id);

  return query
  select p.score::int,
         coalesce((select v.value from public.votes v
                    where v.user_id = v_uid and v.post_id = p_post_id), 0)::int
  from public.posts p
  where p.id = p_post_id;
end
$$;


ALTER FUNCTION "public"."toggle_vote"("p_post_id" "uuid", "p_value" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_check_links_comments"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  if public.excessive_links(new.body, 2) then
    raise exception 'Too many links in comment' using errcode = 'P0001';
  end if;
  return new;
end$$;


ALTER FUNCTION "public"."trg_check_links_comments"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_check_links_posts"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  if public.excessive_links(new.body, 3) then
    raise exception 'Too many links in post body' using errcode = 'P0001';
  end if;
  return new;
end$$;


ALTER FUNCTION "public"."trg_check_links_posts"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."wilson_lower_bound"("up" integer, "down" integer) RETURNS numeric
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
declare
  n numeric := up + down;
  z numeric := 1.96; -- ~95%
  phat numeric;
  res  numeric;
begin
  if n <= 0 then
    return 0;
  end if;
  phat := up / n;
  res := (phat + (z*z)/(2*n) - z * sqrt( (phat * (1 - phat) + (z*z)/(4*n)) / n)) / (1 + (z*z)/n);
  if res < 0 then return 0; end if;
  return res;
end $$;


ALTER FUNCTION "public"."wilson_lower_bound"("up" integer, "down" integer) OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."audit_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "actor_id" "uuid",
    "action" "text" NOT NULL,
    "entity_table" "text" NOT NULL,
    "entity_id" "uuid",
    "metadata" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."audit_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."bookmarks" (
    "user_id" "uuid" NOT NULL,
    "post_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."bookmarks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."comment_reports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "comment_id" "uuid" NOT NULL,
    "reporter_id" "uuid" NOT NULL,
    "reason" "text",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."comment_reports" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."comment_votes" (
    "user_id" "uuid" NOT NULL,
    "comment_id" "uuid" NOT NULL,
    "value" smallint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "comment_votes_value_check" CHECK (("value" = ANY (ARRAY['-1'::integer, 1])))
);


ALTER TABLE "public"."comment_votes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."comments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "post_id" "uuid" NOT NULL,
    "author_id" "uuid" NOT NULL,
    "body" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "score" integer DEFAULT 0 NOT NULL,
    CONSTRAINT "comments_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'removed'::"text"])))
);


ALTER TABLE "public"."comments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."follows_republics" (
    "follower_id" "uuid" NOT NULL,
    "republic_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."follows_republics" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."follows_users" (
    "follower_id" "uuid" NOT NULL,
    "followed_user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."follows_users" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "payload" "jsonb" NOT NULL,
    "read_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "notifications_type_check" CHECK (("type" = ANY (ARRAY['reply'::"text", 'mention'::"text", 'follow'::"text", 'report_result'::"text"])))
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."post_topics" (
    "post_id" "uuid" NOT NULL,
    "topic_id" "uuid" NOT NULL
);


ALTER TABLE "public"."post_topics" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."posts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "body" "text" NOT NULL,
    "republic_id" "uuid" NOT NULL,
    "author_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "edited_until" timestamp with time zone NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "score" integer DEFAULT 0 NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "upvotes" integer DEFAULT 0 NOT NULL,
    "downvotes" integer DEFAULT 0 NOT NULL,
    "wilson" numeric DEFAULT 0 NOT NULL,
    "hot_score" numeric DEFAULT 0 NOT NULL,
    "post_type" "text" DEFAULT 'text'::"text",
    "url" "text",
    "image_url" "text",
    "poll_data" "jsonb",
    "preview_meta" "jsonb",
    CONSTRAINT "posts_post_type_check" CHECK (("post_type" = ANY (ARRAY['text'::"text", 'link'::"text", 'image'::"text", 'poll'::"text"]))),
    CONSTRAINT "posts_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'expired'::"text", 'removed'::"text"])))
);


ALTER TABLE "public"."posts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "username" "text",
    "display_name" "text",
    "bio" "text",
    "avatar_url" "text",
    "is_moderator" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "profiles_username_check" CHECK (("username" ~ '^[a-z0-9_]{3,32}$'::"text"))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."reports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "post_id" "uuid" NOT NULL,
    "reporter_id" "uuid" NOT NULL,
    "reason" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "resolved_at" timestamp with time zone,
    "resolver_id" "uuid",
    "comment_id" "uuid",
    CONSTRAINT "reports_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'accepted'::"text", 'rejected'::"text"])))
);


ALTER TABLE "public"."reports" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."republics" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "slug" "text" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."republics" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."topics" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "republic_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "description" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."topics" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."votes" (
    "user_id" "uuid" NOT NULL,
    "post_id" "uuid" NOT NULL,
    "value" smallint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "votes_value_check" CHECK (("value" = ANY (ARRAY['-1'::integer, 1])))
);


ALTER TABLE "public"."votes" OWNER TO "postgres";


ALTER TABLE ONLY "public"."audit_log"
    ADD CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."bookmarks"
    ADD CONSTRAINT "bookmarks_pkey" PRIMARY KEY ("user_id", "post_id");



ALTER TABLE ONLY "public"."comment_reports"
    ADD CONSTRAINT "comment_reports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."comment_votes"
    ADD CONSTRAINT "comment_votes_pkey" PRIMARY KEY ("user_id", "comment_id");



ALTER TABLE ONLY "public"."comments"
    ADD CONSTRAINT "comments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."follows_republics"
    ADD CONSTRAINT "follows_republics_pkey" PRIMARY KEY ("follower_id", "republic_id");



ALTER TABLE ONLY "public"."follows_users"
    ADD CONSTRAINT "follows_users_pkey" PRIMARY KEY ("follower_id", "followed_user_id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."post_topics"
    ADD CONSTRAINT "post_topics_pkey" PRIMARY KEY ("post_id", "topic_id");



ALTER TABLE ONLY "public"."posts"
    ADD CONSTRAINT "posts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_username_key" UNIQUE ("username");



ALTER TABLE ONLY "public"."reports"
    ADD CONSTRAINT "reports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."republics"
    ADD CONSTRAINT "republics_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."republics"
    ADD CONSTRAINT "republics_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."topics"
    ADD CONSTRAINT "topics_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."topics"
    ADD CONSTRAINT "topics_republic_slug_key" UNIQUE ("republic_id", "slug");



ALTER TABLE ONLY "public"."votes"
    ADD CONSTRAINT "votes_pkey" PRIMARY KEY ("user_id", "post_id");



ALTER TABLE ONLY "public"."votes"
    ADD CONSTRAINT "votes_user_post_unique" UNIQUE ("user_id", "post_id");



CREATE INDEX "idx_comment_votes_cu" ON "public"."comment_votes" USING "btree" ("comment_id", "user_id");



CREATE INDEX "idx_comments_post_created" ON "public"."comments" USING "btree" ("post_id", "created_at");



CREATE INDEX "idx_comments_post_time" ON "public"."comments" USING "btree" ("post_id", "created_at");



CREATE INDEX "idx_posts_created_at_desc" ON "public"."posts" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_posts_hot_score_desc" ON "public"."posts" USING "btree" ("hot_score" DESC);



CREATE INDEX "idx_posts_republic_created" ON "public"."posts" USING "btree" ("republic_id", "created_at" DESC);



CREATE INDEX "idx_posts_republic_hot" ON "public"."posts" USING "btree" ("republic_id", "status", "hot_score" DESC);



CREATE INDEX "idx_posts_republic_new" ON "public"."posts" USING "btree" ("republic_id", "status", "created_at" DESC);



CREATE INDEX "idx_posts_search" ON "public"."posts" USING "gin" ("to_tsvector"('"simple"'::"regconfig", ((COALESCE("title", ''::"text") || ' '::"text") || COALESCE("body", ''::"text"))));



CREATE INDEX "idx_posts_status_created" ON "public"."posts" USING "btree" ("status", "created_at" DESC);



CREATE INDEX "idx_posts_status_expires" ON "public"."posts" USING "btree" ("status", "expires_at");



CREATE INDEX "idx_posts_status_hot" ON "public"."posts" USING "btree" ("status", "hot_score" DESC);



CREATE INDEX "idx_profiles_username" ON "public"."profiles" USING "btree" ("username");



CREATE INDEX "idx_republics_slug" ON "public"."republics" USING "btree" ("slug");



CREATE INDEX "idx_topics_republic_id" ON "public"."topics" USING "btree" ("republic_id");



CREATE INDEX "idx_votes_post" ON "public"."votes" USING "btree" ("post_id");



CREATE INDEX "idx_votes_user_post" ON "public"."votes" USING "btree" ("user_id", "post_id");



CREATE OR REPLACE TRIGGER "comments_check_links_trg" BEFORE INSERT OR UPDATE ON "public"."comments" FOR EACH ROW EXECUTE FUNCTION "public"."guard_links"();



CREATE OR REPLACE TRIGGER "posts_check_links_trg" BEFORE INSERT OR UPDATE ON "public"."posts" FOR EACH ROW EXECUTE FUNCTION "public"."guard_links"();



CREATE OR REPLACE TRIGGER "posts_timeboxes" BEFORE INSERT ON "public"."posts" FOR EACH ROW EXECUTE FUNCTION "public"."set_post_timeboxes"();



CREATE OR REPLACE TRIGGER "trg_comment_votes_changed" AFTER INSERT OR DELETE OR UPDATE ON "public"."comment_votes" FOR EACH ROW EXECUTE FUNCTION "public"."on_comment_votes_changed"();



CREATE OR REPLACE TRIGGER "trg_comments_guard" BEFORE INSERT OR UPDATE ON "public"."comments" FOR EACH ROW EXECUTE FUNCTION "public"."guard_comments"();



CREATE OR REPLACE TRIGGER "trg_comments_rl" BEFORE INSERT ON "public"."comments" FOR EACH ROW EXECUTE FUNCTION "public"."comments_rl"();



CREATE OR REPLACE TRIGGER "trg_posts_rl" BEFORE INSERT ON "public"."posts" FOR EACH ROW EXECUTE FUNCTION "public"."posts_rl"();



CREATE OR REPLACE TRIGGER "trg_report_audit" AFTER UPDATE OF "status" ON "public"."reports" FOR EACH ROW WHEN (("old"."status" IS DISTINCT FROM "new"."status")) EXECUTE FUNCTION "public"."log_report_update"();



CREATE OR REPLACE TRIGGER "trg_report_notify" AFTER UPDATE OF "status" ON "public"."reports" FOR EACH ROW WHEN (("old"."status" IS DISTINCT FROM "new"."status")) EXECUTE FUNCTION "public"."notify_report_resolution"();



CREATE OR REPLACE TRIGGER "trg_reports_rl" BEFORE INSERT ON "public"."reports" FOR EACH ROW EXECUTE FUNCTION "public"."reports_rl"();



CREATE OR REPLACE TRIGGER "trg_votes_recalc" AFTER INSERT OR DELETE OR UPDATE ON "public"."votes" FOR EACH ROW EXECUTE FUNCTION "public"."tg_votes_recalc"();



CREATE OR REPLACE TRIGGER "votes_after_upsert" AFTER INSERT OR UPDATE ON "public"."votes" FOR EACH ROW EXECUTE FUNCTION "public"."after_vote_upsert"();



ALTER TABLE ONLY "public"."audit_log"
    ADD CONSTRAINT "audit_log_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."bookmarks"
    ADD CONSTRAINT "bookmarks_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."bookmarks"
    ADD CONSTRAINT "bookmarks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."comment_reports"
    ADD CONSTRAINT "comment_reports_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "public"."comments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."comment_reports"
    ADD CONSTRAINT "comment_reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."comment_votes"
    ADD CONSTRAINT "comment_votes_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "public"."comments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."comment_votes"
    ADD CONSTRAINT "comment_votes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."comments"
    ADD CONSTRAINT "comments_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."comments"
    ADD CONSTRAINT "comments_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."follows_republics"
    ADD CONSTRAINT "follows_republics_follower_id_fkey" FOREIGN KEY ("follower_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."follows_republics"
    ADD CONSTRAINT "follows_republics_republic_id_fkey" FOREIGN KEY ("republic_id") REFERENCES "public"."republics"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."follows_users"
    ADD CONSTRAINT "follows_users_followed_user_id_fkey" FOREIGN KEY ("followed_user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."follows_users"
    ADD CONSTRAINT "follows_users_follower_id_fkey" FOREIGN KEY ("follower_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."post_topics"
    ADD CONSTRAINT "post_topics_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."post_topics"
    ADD CONSTRAINT "post_topics_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."posts"
    ADD CONSTRAINT "posts_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."posts"
    ADD CONSTRAINT "posts_republic_id_fkey" FOREIGN KEY ("republic_id") REFERENCES "public"."republics"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reports"
    ADD CONSTRAINT "reports_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "public"."comments"("id");



ALTER TABLE ONLY "public"."reports"
    ADD CONSTRAINT "reports_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reports"
    ADD CONSTRAINT "reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reports"
    ADD CONSTRAINT "reports_resolver_id_fkey" FOREIGN KEY ("resolver_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."topics"
    ADD CONSTRAINT "topics_republic_id_fkey" FOREIGN KEY ("republic_id") REFERENCES "public"."republics"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."votes"
    ADD CONSTRAINT "votes_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."votes"
    ADD CONSTRAINT "votes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE "public"."audit_log" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "audit_mod_only" ON "public"."audit_log" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND "p"."is_moderator")))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND "p"."is_moderator"))));



ALTER TABLE "public"."bookmarks" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "bookmarks_owner" ON "public"."bookmarks" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."comment_reports" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "comment_reports_insert" ON "public"."comment_reports" FOR INSERT WITH CHECK (("auth"."uid"() = "reporter_id"));



CREATE POLICY "comment_reports_select" ON "public"."comment_reports" FOR SELECT USING (("auth"."uid"() IS NOT NULL));



ALTER TABLE "public"."comment_votes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "comment_votes_delete" ON "public"."comment_votes" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "comment_votes_insert" ON "public"."comment_votes" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "comment_votes_select" ON "public"."comment_votes" FOR SELECT USING (true);



CREATE POLICY "comment_votes_update" ON "public"."comment_votes" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."comments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "comments_read_all" ON "public"."comments" FOR SELECT USING (true);



CREATE POLICY "comments_write_self" ON "public"."comments" USING (("auth"."uid"() = "author_id")) WITH CHECK (("auth"."uid"() = "author_id"));



ALTER TABLE "public"."follows_republics" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "follows_republics_owner" ON "public"."follows_republics" USING (("auth"."uid"() = "follower_id")) WITH CHECK (("auth"."uid"() = "follower_id"));



ALTER TABLE "public"."follows_users" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "follows_users_owner" ON "public"."follows_users" USING (("auth"."uid"() = "follower_id")) WITH CHECK (("auth"."uid"() = "follower_id"));



ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "notifications_owner" ON "public"."notifications" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."post_topics" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "post_topics_insert_auth" ON "public"."post_topics" FOR INSERT WITH CHECK (("auth"."uid"() IS NOT NULL));



CREATE POLICY "post_topics_public_read" ON "public"."post_topics" FOR SELECT USING (true);



ALTER TABLE "public"."posts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "posts_insert_auth" ON "public"."posts" FOR INSERT WITH CHECK ((("auth"."uid"() IS NOT NULL) AND ("auth"."uid"() = "author_id")));



CREATE POLICY "posts_read_all" ON "public"."posts" FOR SELECT USING (true);



CREATE POLICY "posts_update_author_window" ON "public"."posts" FOR UPDATE USING ((("auth"."uid"() = "author_id") AND ("now"() <= "edited_until"))) WITH CHECK ((("auth"."uid"() = "author_id") AND ("now"() <= "edited_until")));



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profiles_select_public" ON "public"."profiles" FOR SELECT USING (true);



CREATE POLICY "profiles_update_self" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id")) WITH CHECK (("auth"."uid"() = "id"));



ALTER TABLE "public"."reports" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "reports_insert_auth" ON "public"."reports" FOR INSERT WITH CHECK ((("auth"."uid"() IS NOT NULL) AND ("auth"."uid"() = "reporter_id")));



CREATE POLICY "reports_select_self_or_mod" ON "public"."reports" FOR SELECT USING ((("reporter_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND "p"."is_moderator")))));



CREATE POLICY "reports_update_mod" ON "public"."reports" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND "p"."is_moderator")))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND "p"."is_moderator"))));



ALTER TABLE "public"."republics" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "republics_select" ON "public"."republics" FOR SELECT USING ("is_active");



CREATE POLICY "republics_write_mod" ON "public"."republics" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND "p"."is_moderator")))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND "p"."is_moderator"))));



ALTER TABLE "public"."topics" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "topics_public_read" ON "public"."topics" FOR SELECT USING (true);



ALTER TABLE "public"."votes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "votes_del" ON "public"."votes" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "votes_ins" ON "public"."votes" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "votes_sel" ON "public"."votes" FOR SELECT USING (true);



CREATE POLICY "votes_upd" ON "public"."votes" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";





GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_in"("cstring") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_in"("cstring") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_in"("cstring") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_in"("cstring") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_out"("public"."gtrgm") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_out"("public"."gtrgm") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_out"("public"."gtrgm") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_out"("public"."gtrgm") TO "service_role";














































































































































































GRANT ALL ON FUNCTION "public"."after_vote_upsert"() TO "anon";
GRANT ALL ON FUNCTION "public"."after_vote_upsert"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."after_vote_upsert"() TO "service_role";



GRANT ALL ON FUNCTION "public"."comments_rl"() TO "anon";
GRANT ALL ON FUNCTION "public"."comments_rl"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."comments_rl"() TO "service_role";



GRANT ALL ON FUNCTION "public"."compute_hot_score"("p_score" integer, "p_created_at" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."compute_hot_score"("p_score" integer, "p_created_at" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."compute_hot_score"("p_score" integer, "p_created_at" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."contains_profanity"("txt" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."contains_profanity"("txt" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."contains_profanity"("txt" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."excessive_links"("t" "text", "max_links" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."excessive_links"("t" "text", "max_links" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."excessive_links"("t" "text", "max_links" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."excessive_links_g"("txt" "text", "max_links" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."excessive_links_g"("txt" "text", "max_links" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."excessive_links_g"("txt" "text", "max_links" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."expire_posts"() TO "anon";
GRANT ALL ON FUNCTION "public"."expire_posts"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."expire_posts"() TO "service_role";



GRANT ALL ON FUNCTION "public"."extract_link_preview"("target_url" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."extract_link_preview"("target_url" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."extract_link_preview"("target_url" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_query_trgm"("text", "internal", smallint, "internal", "internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_query_trgm"("text", "internal", smallint, "internal", "internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_query_trgm"("text", "internal", smallint, "internal", "internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_query_trgm"("text", "internal", smallint, "internal", "internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_value_trgm"("text", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_value_trgm"("text", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_value_trgm"("text", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_value_trgm"("text", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_trgm_consistent"("internal", smallint, "text", integer, "internal", "internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_trgm_consistent"("internal", smallint, "text", integer, "internal", "internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_trgm_consistent"("internal", smallint, "text", integer, "internal", "internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_trgm_consistent"("internal", smallint, "text", integer, "internal", "internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_trgm_triconsistent"("internal", smallint, "text", integer, "internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_trgm_triconsistent"("internal", smallint, "text", integer, "internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_trgm_triconsistent"("internal", smallint, "text", integer, "internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_trgm_triconsistent"("internal", smallint, "text", integer, "internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_consistent"("internal", "text", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_consistent"("internal", "text", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_consistent"("internal", "text", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_consistent"("internal", "text", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_decompress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_decompress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_decompress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_decompress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_distance"("internal", "text", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_distance"("internal", "text", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_distance"("internal", "text", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_distance"("internal", "text", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_options"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_options"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_options"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_options"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_same"("public"."gtrgm", "public"."gtrgm", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_same"("public"."gtrgm", "public"."gtrgm", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_same"("public"."gtrgm", "public"."gtrgm", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_same"("public"."gtrgm", "public"."gtrgm", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."guard_comments"() TO "anon";
GRANT ALL ON FUNCTION "public"."guard_comments"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."guard_comments"() TO "service_role";



GRANT ALL ON FUNCTION "public"."guard_links"() TO "anon";
GRANT ALL ON FUNCTION "public"."guard_links"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."guard_links"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."log_report_update"() TO "anon";
GRANT ALL ON FUNCTION "public"."log_report_update"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_report_update"() TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_report_resolution"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_report_resolution"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_report_resolution"() TO "service_role";



GRANT ALL ON FUNCTION "public"."on_comment_votes_changed"() TO "anon";
GRANT ALL ON FUNCTION "public"."on_comment_votes_changed"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."on_comment_votes_changed"() TO "service_role";



GRANT ALL ON FUNCTION "public"."posts_rl"() TO "anon";
GRANT ALL ON FUNCTION "public"."posts_rl"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."posts_rl"() TO "service_role";



GRANT ALL ON FUNCTION "public"."rate_limit_check"("tbl" "text", "user_col" "text", "user_id" "uuid", "window_seconds" integer, "max_rows" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."rate_limit_check"("tbl" "text", "user_col" "text", "user_id" "uuid", "window_seconds" integer, "max_rows" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."rate_limit_check"("tbl" "text", "user_col" "text", "user_id" "uuid", "window_seconds" integer, "max_rows" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."recalc_comment_score"("c_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."recalc_comment_score"("c_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."recalc_comment_score"("c_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."recalc_post_scores"("p_post_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."recalc_post_scores"("p_post_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."recalc_post_scores"("p_post_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."recompute_hot_score"("p_post_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."recompute_hot_score"("p_post_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."recompute_hot_score"("p_post_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."recompute_post_score"("p_post" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."recompute_post_score"("p_post" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."recompute_post_score"("p_post" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."reports_rl"() TO "anon";
GRANT ALL ON FUNCTION "public"."reports_rl"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."reports_rl"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "postgres";
GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "anon";
GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "service_role";



GRANT ALL ON FUNCTION "public"."set_post_timeboxes"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_post_timeboxes"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_post_timeboxes"() TO "service_role";



GRANT ALL ON FUNCTION "public"."show_limit"() TO "postgres";
GRANT ALL ON FUNCTION "public"."show_limit"() TO "anon";
GRANT ALL ON FUNCTION "public"."show_limit"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."show_limit"() TO "service_role";



GRANT ALL ON FUNCTION "public"."show_trgm"("text") TO "postgres";
GRANT ALL ON FUNCTION "public"."show_trgm"("text") TO "anon";
GRANT ALL ON FUNCTION "public"."show_trgm"("text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."show_trgm"("text") TO "service_role";



GRANT ALL ON FUNCTION "public"."similarity"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."similarity"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."similarity"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."similarity"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."similarity_dist"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."similarity_dist"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."similarity_dist"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."similarity_dist"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."similarity_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."similarity_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."similarity_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."similarity_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity_commutator_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_commutator_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_commutator_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_commutator_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_commutator_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_commutator_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_commutator_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_commutator_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."tg_votes_recalc"() TO "anon";
GRANT ALL ON FUNCTION "public"."tg_votes_recalc"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."tg_votes_recalc"() TO "service_role";



GRANT ALL ON FUNCTION "public"."toggle_vote"("p_post_id" "uuid", "p_value" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."toggle_vote"("p_post_id" "uuid", "p_value" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."toggle_vote"("p_post_id" "uuid", "p_value" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."trg_check_links_comments"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_check_links_comments"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_check_links_comments"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trg_check_links_posts"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_check_links_posts"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_check_links_posts"() TO "service_role";



GRANT ALL ON FUNCTION "public"."wilson_lower_bound"("up" integer, "down" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."wilson_lower_bound"("up" integer, "down" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."wilson_lower_bound"("up" integer, "down" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity_commutator_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity_commutator_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity_commutator_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity_commutator_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity_dist_commutator_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_commutator_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_commutator_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_commutator_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity_dist_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity_op"("text", "text") TO "service_role";
























GRANT ALL ON TABLE "public"."audit_log" TO "anon";
GRANT ALL ON TABLE "public"."audit_log" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_log" TO "service_role";



GRANT ALL ON TABLE "public"."bookmarks" TO "anon";
GRANT ALL ON TABLE "public"."bookmarks" TO "authenticated";
GRANT ALL ON TABLE "public"."bookmarks" TO "service_role";



GRANT ALL ON TABLE "public"."comment_reports" TO "anon";
GRANT ALL ON TABLE "public"."comment_reports" TO "authenticated";
GRANT ALL ON TABLE "public"."comment_reports" TO "service_role";



GRANT ALL ON TABLE "public"."comment_votes" TO "anon";
GRANT ALL ON TABLE "public"."comment_votes" TO "authenticated";
GRANT ALL ON TABLE "public"."comment_votes" TO "service_role";



GRANT ALL ON TABLE "public"."comments" TO "anon";
GRANT ALL ON TABLE "public"."comments" TO "authenticated";
GRANT ALL ON TABLE "public"."comments" TO "service_role";



GRANT ALL ON TABLE "public"."follows_republics" TO "anon";
GRANT ALL ON TABLE "public"."follows_republics" TO "authenticated";
GRANT ALL ON TABLE "public"."follows_republics" TO "service_role";



GRANT ALL ON TABLE "public"."follows_users" TO "anon";
GRANT ALL ON TABLE "public"."follows_users" TO "authenticated";
GRANT ALL ON TABLE "public"."follows_users" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."post_topics" TO "anon";
GRANT ALL ON TABLE "public"."post_topics" TO "authenticated";
GRANT ALL ON TABLE "public"."post_topics" TO "service_role";



GRANT ALL ON TABLE "public"."posts" TO "anon";
GRANT ALL ON TABLE "public"."posts" TO "authenticated";
GRANT ALL ON TABLE "public"."posts" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."reports" TO "anon";
GRANT ALL ON TABLE "public"."reports" TO "authenticated";
GRANT ALL ON TABLE "public"."reports" TO "service_role";



GRANT ALL ON TABLE "public"."republics" TO "anon";
GRANT ALL ON TABLE "public"."republics" TO "authenticated";
GRANT ALL ON TABLE "public"."republics" TO "service_role";



GRANT ALL ON TABLE "public"."topics" TO "anon";
GRANT ALL ON TABLE "public"."topics" TO "authenticated";
GRANT ALL ON TABLE "public"."topics" TO "service_role";



GRANT ALL ON TABLE "public"."votes" TO "anon";
GRANT ALL ON TABLE "public"."votes" TO "authenticated";
GRANT ALL ON TABLE "public"."votes" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































RESET ALL;
