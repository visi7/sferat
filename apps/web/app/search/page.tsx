"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supa } from "@/lib/supabase";
import Shell from "@/components/shell";
import LeftNav from "@/components/LeftNav";
import RightAside from "@/components/RightAside";
import PostCard from "@/components/postCard";

type Post = {
  id: string;
  title: string;
  body: string;
  republic_id: string;
  author_id: string;
  score: number;
  created_at: string;
  status?: string;
};

type Republic = { id: string; title: string; slug?: string };
type Topic = { id: string; republic_id: string; name: string; slug: string; is_active: boolean };

export default function Home() {
  // Auth
  const [session, setSession] =
    useState<Awaited<ReturnType<typeof supa.auth.getSession>>["data"]["session"]>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(true);

  // Data
  const [republics, setRepublics] = useState<Republic[]>([]);
  const [repId, setRepId] = useState<string>("");                  // composer: republic_id for new post
  const [repFilter, setRepFilter] = useState<string | null>(null); // feed filter: can be slug or id
  const [tab, setTab] = useState<"top" | "new">("top");

  // Topics (feed filter + composer)
  const [topicsFeed, setTopicsFeed] = useState<Topic[]>([]);
  const [topicFilter, setTopicFilter] = useState<string | null>(null);
  const [topicsComposer, setTopicsComposer] = useState<Topic[]>([]);
  const [topicId, setTopicId] = useState<string>(""); // composer: selected topic_id

  // Feed + paging (infinite scroll)
  const [posts, setPosts] = useState<Post[]>([]);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;
  const [loadingMore, setLoadingMore] = useState(false);

  // First-load UX
  const [loadingFeed, setLoadingFeed] = useState(false);
  const [feedError, setFeedError] = useState<string | null>(null);

  // Composer
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  // Map for republic title on cards
  const repMap = useMemo(() => {
    const m = new Map<string, Republic>();
    for (const r of republics) m.set(r.id, r);
    return m;
  }, [republics]);

  // Helper: resolve repFilter (slug or id) -> id
  function resolveRepId(rep: string | null): string | null {
    if (!rep) return null;
    // if likely UUID, just return
    if (rep.length >= 36) return rep;
    const found = republics.find((r) => r.slug === rep);
    return found ? found.id : null;
  }
const [postType, setPostType] = useState<"text" | "link" | "image" | "poll">("text");
const [url, setUrl] = useState("");
const [imageUrl, setImageUrl] = useState("");

  // ---- Boot ----
  useEffect(() => {
    let cancelled = false;

    (async () => {
      // Session in parallel
      supa.auth.getSession().then((res) => {
        if (cancelled) return;
        setSession(res.data.session ?? null);
        setAuthLoading(false);
      });

      // Republics (include slug)
      const reps = await supa
        .from("republics")
        .select("id,title,slug")
        .eq("is_active", true)
        .order("title");

      if (!cancelled && !reps.error) {
        setRepublics(reps.data ?? []);
        if (reps.data?.length) setRepId(reps.data[0].id);
      }

      // Tabs & hash filter
      const qs = new URLSearchParams(window.location.search);
      const initialTab = qs.get("tab") === "new" ? "new" : "top";
      setTab(initialTab);

      const rawHash = new URL(window.location.href).hash.replace("#rep=", "");
      const initialRep = rawHash || null; // may be slug or id
      setRepFilter(initialRep);

      // Load topics for feed (if initial rep exists)
      const repIdResolved = resolveRepId(initialRep);
      if (repIdResolved) {
        const tf = await supa
          .from("topics")
          .select("id,republic_id,name,slug,is_active")
          .eq("republic_id", repIdResolved)
          .eq("is_active", true)
          .order("name");
        if (!tf.error) setTopicsFeed(tf.data ?? []);
      } else {
        setTopicsFeed([]);
        setTopicFilter(null);
      }

      // Load feed immediately
      await refreshFeed(initialTab, initialRep, null, true);

      // Listen to hash change (sidebar filter)
      const onHash = async () => {
        const rep = new URL(window.location.href).hash.replace("#rep=", "") || null;
        setRepFilter(rep);

        const rid = resolveRepId(rep);
        if (rid) {
          const ts = await supa
            .from("topics")
            .select("id,republic_id,name,slug,is_active")
            .eq("republic_id", rid)
            .eq("is_active", true)
            .order("name");
          if (!ts.error) setTopicsFeed(ts.data ?? []);
        } else {
          setTopicsFeed([]);
          setTopicFilter(null);
        }

        refreshFeed(initialTab, rep, null, true);
      };
      window.addEventListener("hashchange", onHash);

      return () => {
        cancelled = true;
        window.removeEventListener("hashchange", onHash);
      };
    })();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load topics for composer when republic selection changes
  useEffect(() => {
    if (!repId) {
      setTopicsComposer([]);
      setTopicId("");
      return;
    }
    (async () => {
      const { data } = await supa
        .from("topics")
        .select("id,republic_id,name,slug,is_active")
        .eq("republic_id", repId)
        .eq("is_active", true)
        .order("name");
      setTopicsComposer(data ?? []);
      setTopicId(""); // reset selection when republic changes
    })();
  }, [repId]);

  // ---- Feed loader (robust) ----
  async function refreshFeed(
    which: "top" | "new" = tab,
    rep: string | null = repFilter,           // slug or id
    topic: string | null = topicFilter,       // topic_id
    reset = false
  ) {
    if (reset) setLoadingFeed(true);
    setFeedError(null);
    if (!reset) setLoadingMore(true);

    try {
      const repIdToUse = resolveRepId(rep);

      // Build select; if filtering by topic, use inner join to post_topics
      let selectCols =
        "id,title,body,republic_id,author_id,score,created_at,status";
      if (topic) {
        // join only when topic filter is present
        selectCols += ", post_topics!inner(topic_id)";
      }

      let q = supa
        .from("posts")
        .select(selectCols)
        .eq("status", "active");

      if (repIdToUse) q = q.eq("republic_id", repIdToUse);
      if (topic)     q = q.eq("post_topics.topic_id", topic);

      if (which === "top") {
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
        // prefer hot_score for top
        q = q.gt("created_at", sevenDaysAgo).order("hot_score", { ascending: false });
      } else {
        q = q.order("created_at", { ascending: false });
      }

      const nextPage = reset ? 0 : (page ?? 0) + 1;
      const from = nextPage * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, error } = await q.range(from, to);
      if (error) throw error;

     const rows: Post[] = Array.isArray(data) ? (data as unknown as Post[]) : [];
setPosts((prev: Post[]) => (reset ? rows : [...prev, ...rows]));

      setPage(nextPage);
    } catch (err: any) {
      console.error("[feed]", err);
      setFeedError(err?.message ?? "Failed to load feed");
      if (reset) setPosts([]);
    } finally {
      if (reset) setLoadingFeed(false);
      setLoadingMore(false);
    }
  }

  // ---- Auth ----
  async function signIn() {
    setAuthLoading(true);
    const { data, error } = await supa.auth.signInWithPassword({ email, password });
    setAuthLoading(false);
    if (error) return alert(error.message);
    setSession(data.session ?? null);
  }
  async function signOut() {
    await supa.auth.signOut();
    setSession(null);
  }

  // ---- Create post ----
  async function createPost() {
    if (!session) return alert("You must be logged in.");
    if (!repId) return alert("Please choose a republic.");
    if (title.trim().length < 3) return alert("Title must be at least 3 characters.");
    if (!body.trim()) return alert("Body cannot be empty.");
    if (body.length > 2000) return alert("Max 2000 characters.");

    const userId = session.user.id;

    // Insert + return id
   const payload: any = {
  title: title.trim(),
  body: body.trim(),
  republic_id: repId,
  author_id: userId,
  post_type: postType,
};

if (postType === "link" && url) payload.url = url.trim();
if (postType === "image" && imageUrl) payload.image_url = imageUrl.trim();

const { data: inserted, error } = await supa
  .from("posts")
  .insert(payload)
  .select("id")
  .single();


    // reload feed so the new post shows up
    await refreshFeed(tab, repFilter, topicFilter, true);
  }

  return (
    <Shell left={<LeftNav />} right={<RightAside />}>
      {/* Tabs */}
      <div className="mb-3 flex items-center gap-2">
        <button
          className={`px-3 py-1.5 rounded-full border ${tab === "top" ? "bg-black text-white" : "bg-white"}`}
          onClick={() => {
            setTab("top");
            setPage(0);
            refreshFeed("top", repFilter, topicFilter, true);
          }}
        >
          Top (7 days)
        </button>
        <button
          className={`px-3 py-1.5 rounded-full border ${tab === "new" ? "bg-black text-white" : "bg-white"}`}
          onClick={() => {
            setTab("new");
            setPage(0);
            refreshFeed("new", repFilter, topicFilter, true);
          }}
        >
          New
        </button>

        <div className="text-sm text-gray-500 ml-2">
          {repFilter ? "Filtered by Republic" : "All Republics"}
        </div>

        <button className="ml-auto underline text-sm" onClick={() => refreshFeed(tab, repFilter, topicFilter, true)}>
          Refresh
        </button>
      </div>
<div className="flex flex-wrap items-center gap-2">
  <label className="text-sm text-gray-600">Type:</label>
  <select
    className="border rounded-md px-3 py-2 text-sm"
    value={postType}
    onChange={(e) => setPostType(e.target.value as any)}
  >
    <option value="text">Text</option>
    <option value="link">Link</option>
    <option value="image">Image</option>
    <option value="poll">Poll</option>
  </select>
</div>

      {/* Topic filter pills (only when a republic is selected) */}
      {resolveRepId(repFilter) && topicsFeed.length > 0 && (
        <div className="mb-3 flex items-center gap-2 flex-wrap">
          <button
            onClick={() => {
              setTopicFilter(null);
              setPage(0);
              refreshFeed(tab, repFilter, null, true);
            }}
            className={`px-3 py-1 text-sm rounded-full border ${topicFilter === null ? "bg-black text-white" : "bg-white"}`}
          >
            All topics
          </button>
          {topicsFeed.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setTopicFilter(t.id);
                setPage(0);
                refreshFeed(tab, repFilter, t.id, true);
              }}
              className={`px-3 py-1 text-sm rounded-full border ${
                topicFilter === t.id ? "bg-black text-white" : "bg-white"
              }`}
            >
              {t.name}
            </button>
          ))}
        </div>
      )}

      {/* Composer */}
      <section className="bg-white border rounded-xl p-4 mb-4 w-full mt-3">
        {!session ? (
          <div className="flex flex-wrap items-center gap-2">
            <input
              className="border p-2 rounded w-52"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              type="password"
              className="border p-2 rounded w-44"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              disabled={authLoading}
              onClick={() => signIn()}
              className="px-3 py-2 rounded bg-black text-white"
            >
              {authLoading ? "..." : "Sign in"}
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {/* Republic + Title + Topic on one row */}
            <div className="flex flex-wrap items-center gap-2">
              <select
                className="border rounded-md px-3 py-2 text-sm min-w-[200px]"
                value={repId}
                onChange={(e) => setRepId(e.target.value)}
                aria-label="Select republic"
              >
                {republics.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.title}
                  </option>
                ))}
              </select>

              <input
                className="border rounded-md px-3 py-2 text-sm flex-1 min-w-[220px]"
                placeholder="Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />

              {/* Topic select (depends on chosen republic) */}
              <select
                className="border rounded-md px-3 py-2 text-sm min-w-[160px]"
                value={topicId}
                onChange={(e) => setTopicId(e.target.value)}
                aria-label="Select topic"
              >
                <option value="">All topics</option>
                {topicsComposer.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Body */}
            <textarea
              className="border rounded-md w-full h-40 resize-none p-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
              placeholder="Share your thoughts…"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onInput={(e) => {
                const ta = e.currentTarget;
                ta.style.height = "auto";
                ta.style.height = Math.min(260, ta.scrollHeight) + "px";
              }}
            />
{postType === "link" && (
  <input
    type="url"
    className="border rounded-md w-full px-3 py-2 text-sm"
    placeholder="Paste a link (https://...)"
    value={url}
    onChange={(e) => setUrl(e.target.value)}
  />
)}

{postType === "image" && (
  <input
    type="url"
    className="border rounded-md w-full px-3 py-2 text-sm"
    placeholder="Image URL (https://...)"
    value={imageUrl}
    onChange={(e) => setImageUrl(e.target.value)}
  />
)}

            {/* Actions */}
            <div className="flex items-center justify-between">
              <button
                onClick={createPost}
                className="bg-black text-white rounded-md px-4 py-2 text-sm hover:bg-gray-800"
              >
                Post
              </button>
              <div className="text-xs text-gray-400">{body.length}/2000</div>
            </div>
          </div>
        )}
      </section>

      {/* Feed */}
      <div className="space-y-3">
        {loadingFeed && <p className="text-gray-500 text-sm">Loading…</p>}
        {feedError && <p className="text-red-600 text-sm">Error: {feedError}</p>}

        {!loadingFeed && !feedError && posts.length === 0 ? (
          <p className="text-gray-600">No posts.</p>
        ) : (
          posts.map((p) => (
            <PostCard
              key={p.id}
              {...p}
              republicTitle={repMap.get(p.republic_id)?.title}
              onChanged={() => refreshFeed(tab, repFilter, topicFilter, true)}
            />
          ))
        )}
      </div>

      {/* Infinite scroll sentinel */}
      <LoadMore onVisible={() => refreshFeed(tab, repFilter, topicFilter, false)} loading={loadingMore} />
    </Shell>
  );
}

/** Small sentinel for infinite scroll */
function LoadMore({ onVisible, loading }: { onVisible: () => void; loading: boolean }) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loading) onVisible();
      },
      { rootMargin: "200px" }
    );

    io.observe(el);
    return () => io.disconnect();
  }, [onVisible, loading]);

  return (
    <div ref={ref} className="h-10 flex items-center justify-center text-sm text-gray-500">
      {loading ? "Loading more…" : " "}
    </div>
  );
}
