// imports ekzistues...
"use client";
import { useEffect, useRef, useState } from "react";
import { supa } from "@/lib/supabase";
import Shell from "@/components/shell";
import LeftNav from "@/components/LeftNav";
import RightAside from "@/components/RightAside";
import PostCard from "@/components/postCard";

type Row = {
  post_id: string;
  created_at: string;         // nga bookmarks
  posts: {
    id: string;
    title: string | null;
    body: string;
    post_type: "text" | "link" | "image" | "poll" | null;
    image_url: string | null;
    url: string | null;
    republic_id: string;
    author_id: string;
    score: number;
    created_at: string;       // created_at i post-it
  };
};

const PAGE_SIZE = 15;

export default function SavedPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const uidRef = useRef<string | null>(null);

  // merre uid dhe bëj load fillestar
  useEffect(() => {
    (async () => {
      const s = (await supa.auth.getSession()).data.session;
      uidRef.current = s?.user.id ?? null;
      await fetchPage(true);
    })();
  }, []);

  async function fetchPage(reset = false) {
  const uid = uidRef.current;
  if (!uid) { setRows([]); setLoading(false); return; }

  reset ? setLoading(true) : setLoadingMore(true);
  setError(null);

  try {
    const next = reset ? 0 : page + 1;
    const from = next * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const { data, error } = await supa
      .from("bookmarks")
      .select(`
        post_id,
        created_at,
        posts (
          id, title, body, post_type, image_url, url,
          republic_id, author_id, score, created_at
        )
      `)
      .eq("user_id", uid)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) throw error;

    // 🔥 zgjidhja e gabimit — i themi TS që është any, pastaj konvertojmë në Row[]
    const newRows = (data as any as Row[]) ?? [];
    setRows((prev) => (reset ? newRows : [...prev, ...newRows]));
    setPage(next);
  } catch (e: any) {
    setError(e.message ?? "Failed to load");
  } finally {
    reset ? setLoading(false) : setLoadingMore(false);
  }
}

  // thirret nga PostCard kur bëhet upvote/koment → rifresko listën
  async function refreshAll() {
    await fetchPage(true);
  }

  // thirret kur hiqet nga saved (nga PostCard) → fshi lokalisht
  function handleRemoved(postId: string) {
    setRows(prev => prev.filter(r => r.posts.id !== postId));
  }

  return (
    <Shell left={<LeftNav />} right={<RightAside />}>
      <h2 className="text-xl font-semibold mb-4">Saved Posts</h2>

      {error && <p className="text-red-600 text-sm">Error: {error}</p>}
      {loading && <p className="text-gray-500 text-sm">Loading…</p>}
      {!loading && rows.length === 0 && <p className="text-gray-600">You haven’t saved any posts yet.</p>}

      <div className="space-y-4">
        {rows.map((r) => (
          <PostCard
            key={r.posts.id}
            {...{
              id: r.posts.id,
              title: r.posts.title ?? "",
              body: r.posts.body ?? "",
              republic_id: r.posts.republic_id,
              author_id: r.posts.author_id,
              score: r.posts.score ?? 0,
              created_at: r.posts.created_at,
              post_type: (r.posts.post_type ?? "text") as any,
              image_url: r.posts.image_url ?? "",
              url: r.posts.url ?? "",
              republicTitle: "Republic", // ose mapa jote nëse e ke
            }}
            inSavedList={true}
            onChanged={refreshAll}                 // ← auto-refresh kur votohet/komentohet
            onRemovedFromSaved={handleRemoved}     // ← fshi kartën lokalisht kur bëhet Unsave
          />
        ))}
      </div>

      <LoadMore onVisible={() => fetchPage(false)} loading={loadingMore} />
    </Shell>
  );
}

/** sentinel për lazy load */
function LoadMore({ onVisible, loading }: { onVisible: () => void; loading: boolean }) {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (ents) => ents[0].isIntersecting && !loading && onVisible(),
      { rootMargin: "200px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [onVisible, loading]);
  return <div ref={ref} className="h-10 flex items-center justify-center text-sm text-gray-500">
    {loading ? "Loading…" : " "}
  </div>;
}
