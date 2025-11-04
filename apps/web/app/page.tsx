"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supa } from "@/lib/supabase";
import Shell from "@/components/shell";
import LeftNav from "@/components/LeftNav";
import RightAside from "@/components/RightAside";
import PostCard from "@/components/postCard";

type Post = {
  id: string;
  title: string | null;
  body: string;
  republic_id: string;
  author_id: string;
  score: number;
  created_at: string;
  status?: string;
  post_type?: "text" | "link" | "image";
  url?: string | null;
  image_url?: string | null;
};

type Republic = { id: string; title: string; slug?: string };

// ---------- helper: upload image -> public URL ----------
async function uploadImageAndGetUrl(file: File, userId: string) {
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `user/${userId}/${Date.now()}.${ext}`;

  const up = await supa.storage.from("images").upload(path, file, {
    cacheControl: "3600",
    upsert: true,
  });
  if (up.error) throw up.error;

  const pub = supa.storage.from("images").getPublicUrl(path);
  return pub.data.publicUrl; // ruhet në posts.image_url
}

export default function Home() {
  // Auth
  const [session, setSession] =
    useState<Awaited<ReturnType<typeof supa.auth.getSession>>["data"]["session"]>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(true);

  // Data
  const [republics, setRepublics] = useState<Republic[]>([]);
  const [repId, setRepId] = useState<string>("");
  const [repFilter, setRepFilter] = useState<string | null>(null);
  const [tab, setTab] = useState<"top" | "new">("top");

  // Feed + paging
  const [posts, setPosts] = useState<Post[]>([]);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadingFeed, setLoadingFeed] = useState(false);
  const [feedError, setFeedError] = useState<string | null>(null);

  // Composer
  const [postType, setPostType] = useState<"text" | "link" | "image">("text");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [file, setFile] = useState<File | null>(null);
const [imageFile, setImageFile] = useState<File | null>(null);
const [linkUrl, setLinkUrl] = useState("");
const [showLink, setShowLink] = useState(false);
const [uploadingImage, setUploadingImage] = useState(false);
// ---- Sections per republic (Home composer) ----
const [sections, setSections] = useState<{slug:string; label:string}[]>([]);
const [section, setSection] = useState<string>("feed");

  // Quick map for republic title
  const repMap = useMemo(() => {
    const m = new Map<string, Republic>();
    for (const r of republics) m.set(r.id, r);
    return m;
  }, [republics]);

 // ---- Boot ----
useEffect(() => {
  let cancelled = false;

  (async () => {
    // session
    const res = await supa.auth.getSession();
    if (!cancelled) {
      setSession(res.data.session ?? null);
      setAuthLoading(false);
    }

    // republics
    const reps = await supa
      .from("republics")
      .select("id,title,slug")
      .eq("is_active", true)
      .order("title");

    if (!cancelled && !reps.error) {
      setRepublics(reps.data ?? []);
      if (reps.data?.length) setRepId(reps.data[0].id);
    }

    // tabs & filter
    const qs = new URLSearchParams(window.location.search);
    const initialTab = qs.get("tab") === "new" ? "new" : "top";
    setTab(initialTab);

    const rawHash = new URL(window.location.href).hash.replace("#rep=", "");
    const initialRep = rawHash || null;
    setRepFilter(initialRep);

    await refreshFeed(initialTab, initialRep, true);

    const onHash = () => {
      const rep = new URL(window.location.href).hash.replace("#rep=", "") || null;
      setRepFilter(rep);
      refreshFeed(initialTab, rep, true);
    };
    window.addEventListener("hashchange", onHash);

    return () => {
      cancelled = true;
      window.removeEventListener("hashchange", onHash);
    };
  })();
}, []);

// ---- Sections per republic (kur ndryshon repId) ----
useEffect(() => {
  (async () => {
    if (!repId) {
      setSections([]);
      setSection("feed");
      return;
    }
    const { data, error } = await supa
      .from("republic_sections")
      .select("slug,label")
      .eq("republic_id", repId)
      .order("position");
    if (!error && data) {
      setSections(data);
      setSection(data[0]?.slug ?? "feed");
    }
  })();
}, [repId]);


  // ---- Feed loader ----
  async function refreshFeed(
    which: "top" | "new" = tab,
    rep: string | null = repFilter,
    reset = false
  ) {
    if (reset) setLoadingFeed(true);
    setFeedError(null);
    if (!reset) setLoadingMore(true);

    try {
      // resolve rep slug -> id if needed
      let repIdToUse: string | null = rep;
      if (rep && rep.length < 36) {
        const found = republics.find((r) => r.slug === rep);
        if (found) {
          repIdToUse = found.id;
        } else {
          const r = await supa.from("republics").select("id").eq("slug", rep).maybeSingle();
          repIdToUse = r.data?.id ?? null;
        }
      }

    let q = supa
  .from("posts")
  .select(`
  id, title, body, section, created_at, author_id, republic_id, score,
  image_url, post_type,
  profiles:profiles!posts_author_id_fkey ( id, username, avatar_url ),
  republics:republics!posts_republic_id_fkey ( id, title )
`)

  .eq("status", "active"); // nëse s'ke fushë "status", hiqe këtë rresht

// filtro sipas republike nëse ke një të zgjedhur (opsionale)
if (repIdToUse) q = q.eq("republic_id", repIdToUse);

// renditja sipas tab-it
if (which === "top") {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
  q = q.gt("created_at", sevenDaysAgo).order("hot_score", { ascending: false });
} else {
  q = q.order("created_at", { ascending: false });
}


      const nextPage = reset ? 0 : (page ?? 0) + 1;
      const from = nextPage * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, error } = await q.range(from, to);
      if (error) throw error;
      const rows = Array.isArray(data) ? (data as any[]) : [];
const withRep = rows.map(r => ({
  ...r,                                     // kjo ruan edhe r.profiles
  republicTitle: r.republics?.title ?? "Republic",
}));
setPosts(prev => reset ? withRep : [...prev, ...withRep]);


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

  const hasText = !!body.trim();
  const hasLink = !!linkUrl.trim();
  const hasImage = !!imageFile;

  if (!hasText && !hasImage && !hasLink) {
    return alert("Write something or attach an image/link.");
  }

  const userId = session.user.id;
  const payload: any = {
    // title hoqëm fare; mbetet bosh
    title: "",
    body: hasText ? body.trim() : "",
    url: hasLink ? linkUrl.trim() : null,
    image_url: null,
    republic_id: repId,
    author_id: userId,
    post_type: hasImage ? "image" : hasLink ? "link" : "text",
    section,
  };

  try {
    if (hasImage && imageFile) {
      setUploadingImage(true);
      const ext = (imageFile.name.split(".").pop() || "jpg").toLowerCase();
      const fileName = `${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supa.storage
        .from("images")
        .upload(fileName, imageFile, { upsert: false });
      if (upErr) throw upErr;
      const { data: pub } = supa.storage.from("images").getPublicUrl(fileName);
      payload.image_url = pub.publicUrl;
    }
   payload.republic_id = repFilter ?? repId;  // lidh me republikën aktive
   payload.section = section || "feed";                 // dërgoje në seksionin “Feed”
  const { error } = await supa.from("posts").insert(payload);  // pastaj bëj insert
  if (error) throw error;



    // reset composer
    setBody("");
    setImageFile(null);
    setShowLink(false);
    setLinkUrl("");
    await refreshFeed(tab, repFilter, true);
  } catch (e: any) {
    alert(e.message);
  } finally {
    setUploadingImage(false);
  }
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
            refreshFeed("top", repFilter, true);
          }}
        >
          Top (7 days)
        </button>
        <button
          className={`px-3 py-1.5 rounded-full border ${tab === "new" ? "bg-black text-white" : "bg-white"}`}
          onClick={() => {
            setTab("new");
            setPage(0);
            refreshFeed("new", repFilter, true);
          }}
        >
          New
        </button>

        <div className="text-sm text-gray-500 ml-2">
          {repFilter ? "Filtered by Republic" : "All Republics"}
        </div>

        <button className="ml-auto underline text-sm" onClick={() => refreshFeed(tab, repFilter, true)}>
          Refresh
        </button>
      </div>

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
              onClick={signIn}
              className="px-3 py-2 rounded bg-black text-white"
            >
              {authLoading ? "..." : "Sign in"}
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
      {/* Republika */}
      <div className="flex items-center gap-2">
        <select
          className="border rounded-md px-3 py-2 text-sm min-w-[220px]"
          value={repId}
          onChange={(e) => setRepId(e.target.value)}
        >
          {republics.map((r) => (
            <option key={r.id} value={r.id}>{r.title}</option>
          ))}
        </select>
      </div>
      {repId && (
  <select
    className="border rounded-md px-3 py-2 text-sm"
    value={section}
    onChange={(e) => setSection(e.target.value)}
    aria-label="Select section"
  >
    {sections.map((s) => (
      <option key={s.slug} value={s.slug}>
        {s.label}
      </option>
    ))}
  </select>
)}


      {/* KUTIA E TEKSTIT – titulli u hoq */}
      <div className="border rounded-xl">
        <textarea
          className="w-full min-h-[120px] resize-y p-3 text-sm rounded-t-xl focus:outline-none"
          placeholder="Say something…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />

        {/* Toolbar brenda kutisë (poshtë) */}
        <div className="flex items-center justify-between px-3 py-2 border-t rounded-b-xl bg-gray-50">
          <div className="flex items-center gap-2">
            {/* Add image */}
            <label className="inline-flex items-center gap-1 px-2 py-1 text-xs border rounded cursor-pointer bg-white hover:bg-gray-100">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
              />
              🖼️ Add image
            </label>
            {imageFile && (
              <span className="text-xs text-gray-600">
                {imageFile.name}
                <button
                  className="ml-2 text-gray-400 hover:text-gray-600"
                  onClick={() => setImageFile(null)}
                  title="Remove"
                >
                  ✕
                </button>
              </span>
            )}

            {/* Add link */}
            <button
              className="px-2 py-1 text-xs border rounded bg-white hover:bg-gray-100"
              onClick={() => setShowLink((s) => !s)}
            >
              🔗 Add link
            </button>
            {showLink && (
              <input
                className="ml-2 border rounded px-2 py-1 text-xs w-64"
                placeholder="https://example.com"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
              />
            )}
          </div>

          <button
            onClick={createPost}
            disabled={uploadingImage}
            className="bg-black text-white rounded-md px-4 py-1.5 text-sm hover:bg-gray-800 disabled:opacity-60"
          >
            {uploadingImage ? "Uploading…" : "Post"}
          </button>
        </div>
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
  id={p.id}
  title={p.title ?? ""}
  body={p.body ?? ""}
  republic_id={p.republic_id}
  author_id={p.author_id}
  score={p.score ?? 0}
  created_at={p.created_at}
  post_type={p.post_type ?? "text"}
  image_url={p.image_url ?? ""}
  url={p.url ?? ""}
  republicTitle={repMap.get(p.republic_id)?.title ?? ""}
  onChanged={() => refreshFeed(tab, repFilter, true)}
/>

          ))
        )}
      </div>

      <LoadMore onVisible={() => refreshFeed(tab, repFilter, false)} loading={loadingMore} />
    </Shell>
  );
}

/** Infinite scroll sentinel */
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
