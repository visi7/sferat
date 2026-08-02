"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supa } from "@/lib/supabase";
import Shell from "@/components/shell";
import LeftNav from "@/components/LeftNav";
import RightAside from "@/components/RightAside";
import PostCard from "@/components/postCard";
import Turnstile from "@/components/Turnstile";

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
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
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
const [duration, setDuration] = useState<1 | 3 | 7>(7);
const [uploadingImage, setUploadingImage] = useState(false);
const [postCooldown, setPostCooldown] = useState(0);

useEffect(() => {
  if (postCooldown <= 0) return;
  const t = setInterval(() => setPostCooldown((s) => Math.max(0, s - 1)), 1000);
  return () => clearInterval(t);
}, [postCooldown]);
// ---- Section per republic (Home composer) — no UI picker; every
// Republic has exactly one section ("feed") today, so we just use it.
const [section, setSection] = useState<string>("feed");
const [mutedRepublicIds, setMutedRepublicIds] = useState<string[]>([]);

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
    }

    // tabs & filter
    const qs = new URLSearchParams(window.location.search);
    const initialTab = qs.get("tab") === "new" ? "new" : "top";
    setTab(initialTab);

    const rawHash = new URL(window.location.href).hash.replace("#rep=", "");
    let initialRep: string | null = rawHash || null;

    // Nëse s'ka #rep= eksplicit në URL, përdor Republikën e parazgjedhur
    // të përdoruesit (nëse ka zgjedhur një te Settings) në vend të "All Republics".
    if (!initialRep && res.data.session) {
      const { data: prof } = await supa
        .from("profiles")
        .select("default_republic_id")
        .eq("id", res.data.session.user.id)
        .maybeSingle();
      if (prof?.default_republic_id) initialRep = prof.default_republic_id;
    }

    setRepFilter(initialRep);

    let initialMuted: string[] = [];
    if (res.data.session) {
      const { data: mutes } = await supa
        .from("muted_republics")
        .select("republic_id")
        .eq("user_id", res.data.session.user.id);
      initialMuted = (mutes ?? []).map((m) => m.republic_id);
      setMutedRepublicIds(initialMuted);
    }

    await refreshFeed(initialTab, initialRep, true, initialMuted);

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

// ---- Auth state sync (rikthen sesionin kur Supabase e vendos në background, p.sh. pas konfirmimit të email-it) ----
useEffect(() => {
  const { data: sub } = supa.auth.onAuthStateChange((_event, newSession) => {
    setSession(newSession);
    if (!newSession) {
      setEmail("");
      setPassword("");
    }
  });
  return () => sub.subscription.unsubscribe();
}, []);

// ---- Section per republic (kur ndryshon repId) ----
useEffect(() => {
  (async () => {
    if (!repId) {
      setSection("feed");
      return;
    }
    const { data, error } = await supa
      .from("republic_sections")
      .select("slug")
      .eq("republic_id", repId)
      .order("position")
      .limit(1);
    if (!error && data && data[0]) setSection(data[0].slug);
  })();
}, [repId]);


  // ---- Feed loader ----
  async function refreshFeed(
    which: "top" | "new" = tab,
    rep: string | null = repFilter,
    reset = false,
    muted: string[] = mutedRepublicIds
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
if (repIdToUse) {
  q = q.eq("republic_id", repIdToUse);
} else if (muted.length > 0) {
  // "All Republics" — hiq postimet e Republikave të heshtuara nga ky përdorues
  q = q.not("republic_id", "in", `(${muted.join(",")})`);
}

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
    const { data, error } = await supa.auth.signInWithPassword({
      email,
      password,
      options: captchaToken ? { captchaToken } : undefined,
    });
    setAuthLoading(false);
    if (error) return alert(error.message);
    setSession(data.session ?? null);
  }
  async function signOut() {
    await supa.auth.signOut();
    setSession(null);
    setEmail("");
    setPassword("");
  }

  // ---- Create post ----
 async function createPost() {
  if (!session) return alert("You must be logged in.");
  if (!repId) return alert("Please choose a republic.");

  const hasText = !!body.trim();
  const hasImage = !!imageFile;

  if (!hasText && !hasImage) {
    return alert("Write something or attach an image.");
  }

  const userId = session.user.id;
  const payload: any = {
    // title hoqëm fare; mbetet bosh
    title: "",
    body: hasText ? body.trim() : "",
    url: null,
    image_url: null,
    republic_id: repId,
    author_id: userId,
    post_type: hasImage ? "image" : "text",
    section,
    expires_at: new Date(Date.now() + duration * 24 * 3600 * 1000).toISOString(),
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
   payload.section = section || "feed";                 // dërgoje në seksionin “Feed”
  const { error } = await supa.from("posts").insert(payload);  // pastaj bëj insert
  if (error) throw error;



    // reset composer
    setBody("");
    setImageFile(null);
    setDuration(7);
    await refreshFeed(tab, repFilter, true);
  } catch (e: any) {
    const m = /wait (\d+) seconds?/i.exec(e.message ?? "");
    if (m) {
      setPostCooldown(parseInt(m[1], 10));
    } else {
      alert(e.message);
    }
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
          {repFilter ? (
            <>
              {republics.find((r) => r.id === repFilter || r.slug === repFilter)?.title ?? "Filtered by Republic"}
              {" · "}
              <button
                className="underline"
                onClick={() => {
                  setRepFilter(null);
                  refreshFeed(tab, null, true);
                }}
              >
                Show all Republics
              </button>
            </>
          ) : (
            "All Republics"
          )}
        </div>

        <button className="ml-auto underline text-sm" onClick={() => refreshFeed(tab, repFilter, true)}>
          Refresh
        </button>
      </div>

      {/* Composer */}
     <section className="bg-white border rounded-xl p-4 mb-4 w-full mt-3">
  {!session ? (
          <div className="flex flex-col gap-1">
  <div className="flex flex-wrap items-center gap-2">
    <input
      type="email"
      value={email}
      onChange={(e) => setEmail(e.target.value)}
      placeholder="Email"
      className="border p-2 rounded flex-1 min-w-[140px]"
    />
    <input
      type="password"
      value={password}
      onChange={(e) => setPassword(e.target.value)}
      placeholder="Password"
      className="border p-2 rounded flex-1 min-w-[140px]"
    />
    <button
      disabled={authLoading || !captchaToken}
      onClick={signIn}
      className="px-3 py-2 rounded bg-black text-white disabled:opacity-50"
    >
      {authLoading ? "..." : "Sign in"}
    </button>
  </div>

  <Turnstile onVerify={setCaptchaToken} />

  <p className="text-xs text-gray-600">
    Don't have an account?{" "}
    <a href="/sign-up" className="underline text-blue-600">
      Create one
    </a>
    {" · "}
    <a href="/forgot-password" className="underline text-blue-600">
      Forgot password?
    </a>
  </p>
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
          <option value="" disabled>Select a Republic</option>
          {republics.map((r) => (
            <option key={r.id} value={r.id}>{r.title}</option>
          ))}
        </select>
      </div>
      {/* KUTIA E TEKSTIT – titulli u hoq */}
      <div className="border rounded-xl">
        <textarea
          className="w-full min-h-[120px] resize-y p-3 text-sm rounded-t-xl focus:outline-none"
          placeholder="Say something…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />

        {/* Toolbar brenda kutisë (poshtë) */}
        <div className="px-3 py-2 border-t rounded-b-xl bg-gray-50 space-y-2">
          <div className="flex items-center justify-between">
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

              {/* Post duration */}
              <select
                className="px-2 py-1 text-xs border rounded bg-white"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value) as 1 | 3 | 7)}
                aria-label="Post duration"
                title="How long this post stays up"
              >
                <option value={1}>1 day</option>
                <option value={3}>3 days</option>
                <option value={7}>7 days</option>
              </select>
            </div>

            <button
              onClick={createPost}
              disabled={uploadingImage || !repId || postCooldown > 0}
              className="bg-black text-white rounded-md px-4 py-1.5 text-sm hover:bg-gray-800 disabled:opacity-60"
            >
              {uploadingImage ? "Uploading…" : postCooldown > 0 ? `Wait ${postCooldown}s` : "Post"}
            </button>
          </div>

          {postCooldown > 0 && (
            <p className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
              You're posting too fast — you can post again in <strong>{postCooldown}s</strong>.
            </p>
          )}
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
