"use client";
import type { PostCardProps, Author, CommentRow } from "@/types/content";
import PostHeader from "./post/PostHeader";
import PostBody from "./post/PostBody";
import PostToolbar from "./post/PostToolbar";
import PostKebab from "./post/PostKebab";
import PostEditModal from "@/components/PostEditModal";
import Avatar from "./Avatar";

import { useEffect, useRef, useState } from "react";
import { supa } from "@/lib/supabase";

function timeSince(date: Date) {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  const steps: [number, string][] = [
    [31536000, "year"], [2592000, "month"], [86400, "day"], [3600, "hour"], [60, "minute"]
  ];
  for (const [s, label] of steps) {
    const n = Math.floor(seconds / s);
    if (n >= 1) return `${n} ${label}${n > 1 ? "s" : ""}`;
  }
  return "just now";
}

function timeLeft(createdAt: string | Date) {
  const created = new Date(createdAt);
  const expiry = new Date(created.getTime() + 7 * 24 * 60 * 60 * 1000);
  const ms = expiry.getTime() - Date.now();

  if (ms <= 0) return { label: "Expired", urgent: true };

  const totalMin = Math.floor(ms / 60000);
  if (totalMin < 24 * 60) {
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    return { label: `${h}h ${m}m`, urgent: true };
  }
  const days = Math.ceil(totalMin / (60 * 24));
  return { label: `${days} day${days > 1 ? "s" : ""}`, urgent: false };
}

export default function PostCard(p: PostCardProps) {
  const [busy, setBusy] = useState(false);
  const [me, setMe] = useState<string | null>(null);
const [imgOpen, setImgOpen] = useState(false);

const [comments, setComments] = useState<CommentRow[]>([]);
  
  const [author, setAuthor] = useState<Author | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [commentCount, setCommentCount] = useState<number>(0);
const [editing, setEditing] = useState(false);

  // Score dhe vota e përdoruesit në post
  const [localScore, setLocalScore] = useState<number>(p.score);
  const [userVote, setUserVote] = useState<0 | 1 | -1>(0);

  // Kebab menu
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null); 
  const [saved, setSaved] = useState(false);

  // Comments drawer
  const [showComments, setShowComments] = useState(false);
  const [commentsLoading, setCommentsLoading] = useState(false);

  // Votes e komenteve: comment_id -> score dhe vota ime
  const [cScores, setCScores] = useState<Record<string, number>>({});
  const [cUserVotes, setCUserVotes] = useState<Record<string, -1 | 0 | 1>>({});

  // Për reply inline
  const [replyingId, setReplyingId] = useState<string | null>(null);
  const [replyValue, setReplyValue] = useState("");
  const [commentMenuFor, setCommentMenuFor] = useState<string|null>(null);

useEffect(() => {
  function onDoc(e: MouseEvent) {
    if (!menuRef.current) return;
    if (!menuRef.current.contains(e.target as Node)) setMenuOpen(false);
  }
  if (menuOpen) document.addEventListener("mousedown", onDoc);
  return () => document.removeEventListener("mousedown", onDoc);
}, [menuOpen]);

useEffect(() => {
  (async () => {
    const s = (await supa.auth.getSession()).data.session;
    const uid = s?.user.id;
    if (!uid) { setSaved(false); return; }

    const { data, error } = await supa
      .from("bookmarks")
      .select("id")
      .eq("user_id", uid)
      .eq("post_id", p.id)
      .maybeSingle();

    setSaved(!!data && !error);
  })();
}, [p.id]);
async function loadComments() {
  const { data, error } = await supa
    .from("comments")
    .select(`
      id, body, created_at, author_id,
      profiles:profiles!comments_author_id_fkey ( username, avatar_url )
    `)
    .eq("post_id", p.id)
    .order("created_at", { ascending: false });
if (error) { console.error("[comments]", error); return; }
  setComments((data as any) ?? []);
  setCommentCount((data?.length ?? 0));
}
useEffect(() => { loadComments(); }, [p.id]);


  // ========= Boot: session, author, follow, counts, userVote (post) =========
  useEffect(() => {
    (async () => {
      const s = (await supa.auth.getSession()).data.session;
      const uid = s?.user.id ?? null;
      setMe(uid);

      // Author
      const prof = await supa
        .from("profiles")
        .select("id,username,display_name,avatar_url")
        .eq("id", p.author_id)
        .maybeSingle();
      if (!prof.error && prof.data) setAuthor(prof.data as any);

      // Follow state
      if (uid) {
        const { data } = await supa
          .from("follows_users")
          .select("id")
          .eq("follower_id", uid)
          .eq("followed_user_id", p.author_id)
          .limit(1);
        setIsFollowing((data ?? []).length > 0);
      }

      // Comment count
      const { data: cs } = await supa
  .from("comments")
  .select(`
    id, body, created_at, author_id,
    posts!inner ( id, title ),
    author:profiles!comments_author_id_fkey ( id, username, avatar_url )
  `)
  .eq("post_id", p.id)
  .order("created_at", { ascending: true });
setComments((cs as any) ?? []);


      // User vote në post
      if (uid) {
        const { data } = await supa
          .from("votes")
          .select("value")
          .eq("user_id", uid)
          .eq("post_id", p.id)
          .maybeSingle();
        setUserVote((data?.value as 1 | -1 | undefined) ?? 0);
      } else {
        setUserVote(0);
      }
    })();
  }, [p.author_id, p.id]);

  // mbyll menunë kur klikon jashtë
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    if (menuOpen) document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [menuOpen]);

  // ========= Votim i postit me RPC toggle_vote =========
  async function doVote(wanted: 1 | -1) {
    const s = (await supa.auth.getSession()).data.session;
    if (!s?.user?.id) return alert("You must be logged in.");

    // Optimistic: shëno vizualisht menjëherë
    setUserVote((prev) => (prev === wanted ? 0 : wanted));

    const { data, error } = await supa.rpc("toggle_vote", {
      p_post_id: p.id,
      p_value: wanted,
    });

    if (error) {
      alert(error.message);
      // opc: mund të bëjmë një refresh nga DB nëse do
      return;
    }

    // sinkronizo UI me DB
    const row = Array.isArray(data) ? data[0] : data;
    if (row) {
      setLocalScore(row.score as number);
      setUserVote((row.user_vote as 0 | 1 | -1) ?? 0);
    }
    p.onChanged?.();
  }

  // ========= Komente =========
  async function addCommentRaw(text: string) {
    if (!me) return alert("You must be logged in.");
    const body = text.trim();
    if (!body) return;
    setBusy(true);
    try {
    const { data, error } = await supa
  .from("comments")
  .insert({ post_id: p.id, author_id: me, body })
  .select(`
    id, body, created_at, author_id,
    profiles:profiles!comments_author_id_fkey ( username, avatar_url )
  `)
  .single();
if (error) throw error;


   setCommentCount(n => (n ?? 0) + 1);

  setComments(prev => {
  const arr = prev ?? [];
  const id = (data as any).id;
  return arr.some(c => c.id === id) ? arr : [data as any, ...arr];
});
    
      p.onChanged?.();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function loadCommentsOnce() {
    if (comments.length > 0) return;
    setCommentsLoading(true);

    const c = await supa
      .from("comments")
      .select(`
  id, body, created_at, author_id,
  profiles:profiles!comments_author_id_fkey ( username, avatar_url )
`)

      .eq("post_id", p.id)
      .order("created_at", { ascending: true })
      .limit(200);

    const list = (c.data as any as CommentRow[]) ?? [];
    setComments(list);

    // Scores e komenteve
    if (list.length > 0) {
      const ids = list.map((x) => x.id);
      const v = await supa
        .from("comment_votes")
        .select("comment_id,value")
        .in("comment_id", ids);

      if (!v.error) {
        const map: Record<string, number> = {};
        for (const row of v.data ?? []) {
          map[row.comment_id] = (map[row.comment_id] ?? 0) + (row.value as number);
        }
        setCScores(map);
      }

      // Vota ime për secilin koment
      if (me) {
        const mv = await supa
          .from("comment_votes")
          .select("comment_id,value")
          .eq("user_id", me)
          .in("comment_id", ids);
        if (!mv.error) {
          const mine: Record<string, -1 | 0 | 1> = {};
          for (const row of mv.data ?? []) {
            mine[row.comment_id] = (row.value as -1 | 1) ?? 0;
          }
          setCUserVotes(mine);
        }
      }
    }

    setCommentsLoading(false);
  }

  async function voteComment(commentId: string, wanted: 1 | -1) {
    if (!me) return alert("You must be logged in.");

    const prev = cUserVotes[commentId] ?? 0;
    const newVote: -1 | 0 | 1 = prev === wanted ? 0 : wanted;
    const delta = newVote - prev;

    // Optimistic
    setCUserVotes((m) => ({ ...m, [commentId]: newVote }));
    setCScores((m) => ({ ...m, [commentId]: (m[commentId] ?? 0) + delta }));

    try {
      if (newVote === 0) {
        const { error } = await supa
          .from("comment_votes")
          .delete()
          .eq("user_id", me)
          .eq("comment_id", commentId);
        if (error) throw error;
      } else {
        const { error } = await supa
          .from("comment_votes")
          .upsert(
            { user_id: me, comment_id: commentId, value: newVote },
            { onConflict: "user_id,comment_id" }
          );
        if (error) throw error;
      }
    } catch (e: any) {
      // rollback
      setCUserVotes((m) => ({ ...m, [commentId]: prev }));
      setCScores((m) => ({ ...m, [commentId]: (m[commentId] ?? 0) - delta }));
      alert(e.message);
    }
  }

  async function reportComment(commentId: string) {
    if (!me) return alert("You must be logged in.");
    const reason = prompt("Reason for report (spam, abuse, etc.)")?.trim();
    if (!reason) return;
    const { error } = await supa
      .from("comment_reports")
      .insert({ comment_id: commentId, reporter_id: me, reason });
    if (error) return alert(error.message);
    alert("Comment reported.");
  }

  // ========= Follow / Save / Report post =========
  async function follow() {
    if (!me || me === p.author_id) return;
    setBusy(true);
    try {
      const { error } = await supa
        .from("follows_users")
        .upsert(
          { follower_id: me, followed_user_id: p.author_id },
          { onConflict: "follower_id,followed_user_id" }
        );
      if (error) throw error;
      setIsFollowing(true);
    } finally {
      setBusy(false);
    }
  }
async function removePost() {
  if (!me) return alert("You must be logged in.");
  if (!confirm("Delete this post?")) return;
  const { error } = await supa.from("posts").delete().eq("id", p.id);
  if (error) return alert(error.message);
  p.onChanged?.();
}

  async function unfollow() {
    if (!me) return;
    setBusy(true);
    try {
      const { error } = await supa
        .from("follows_users")
        .delete()
        .eq("follower_id", me)
        .eq("followed_user_id", p.author_id);
      if (error) throw error;
      setIsFollowing(false);
    } finally {
      setBusy(false);
    }
  }

   // ===== SAVE / UNSAVE =====
  useEffect(() => {
    if (!me) return setSaved(false);
    (async () => {
      const { data, error } = await supa
        .from("bookmarks")
        .select("id")
        .eq("user_id", me)
        .eq("post_id", p.id)
        .maybeSingle();
      if (!error && data) setSaved(true);
      else setSaved(false);
    })();
  }, [p.id, me]);

  async function toggleSave() {
    if (!me) return alert("You must be logged in.");
    const wasSaved = saved;
    setSaved(!wasSaved); // UI update menjëherë

    try {
      if (wasSaved) {
        const { error } = await supa
          .from("bookmarks")
          .delete()
          .eq("user_id", me)
          .eq("post_id", p.id);
        if (error) throw error;
      } else {
        const { error } = await supa
          .from("bookmarks")
          .upsert(
            { user_id: me, post_id: p.id },
            { onConflict: "user_id,post_id" }
          );
        if (error) throw error;
      }
    } catch (e: any) {
      setSaved(wasSaved); // nëse dështoi, ktheje siç ishte
      alert(e.message);
    }
  }

  async function report() {
    if (!me) return alert("You must be logged in.");
    const reason = prompt("Why are you reporting this?")?.trim();
    if (!reason) return;
    await supa.from("reports").insert({ post_id: p.id, reporter_id: me, reason });
    alert("Report submitted.");
  }
  function copyShare() {
    const url = `${window.location.origin}/post/${p.id}`;
    navigator.clipboard.writeText(url);
    alert("Link copied.");
  }

  return (
    <article className="relative bg-white border rounded-xl p-4">
      <div ref={menuRef} className="absolute right-2 top-2 z-20">
  <button
    className="h-8 w-8 grid place-items-center rounded-md hover:bg-gray-50 border text-sm"
    onClick={() => setMenuOpen(s => !s)}
    aria-label="More"
  >
    ⁝
  </button>

  {menuOpen && (
    <div className="absolute right-0 mt-1 z-10">
      <PostKebab
        inSavedList={p.inSavedList ?? false}
        saved={saved}
        onToggleSave={toggleSave}
        onRemoveFromSaved={async () => {
          await supa.from("bookmarks").delete().eq("user_id", me).eq("post_id", p.id);
          p.onRemovedFromSaved?.(p.id);
          p.onChanged?.();
        }}
        onDelete={async () => {
          if (!confirm("Delete this post?")) return;
          const { error } = await supa.from("posts").delete().eq("id", p.id);
          if (error) return alert(error.message);
          p.onChanged?.();
        }}
        onReport={report}
      >
        {me === p.author_id && (
          <button
            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
            onClick={() => setEditing(true)}
          >
            ✎ Edit post
          </button>
        )}
      </PostKebab>
    </div>
  )}
</div>




      {/* header: Republic · Author · Follow (majtas) */}
       <PostHeader
  p={p}
  author={author}
  me={me}
  isFollowing={isFollowing}
  busy={busy}
  onFollow={follow}
  onUnfollow={unfollow}
/>

{(() => {
  const posted = timeSince(new Date(p.created_at));
  const left = timeLeft(p.created_at);
  return (
    <p className="text-xs text-gray-500 mt-1">
      Posted {posted} ago ·{" "}
      <span className={left.urgent ? "text-red-600 font-medium" : ""}>
        Expires in {left.label}
      </span>
    </p>
  );
})()}

      {/* title */}
      <PostBody
  title={p.title}
  body={p.body}
  post_type={p.post_type}
  url={p.url}
  image_url={p.image_url}
  onOpenImage={() => setImgOpen(true)}
/>



      {/* toolbar (post) */}
      <PostToolbar
  userVote={userVote}
  score={localScore}
  onUpvote={() => doVote(1)}
  onDownvote={() => doVote(-1)}
  commentCount={commentCount}
  commentsOpen={showComments}
  onToggleComments={async () => {
    const next = !showComments;
    setShowComments(next);
    if (next) await loadCommentsOnce();
  }}
  onShare={copyShare}
/>


      {/* comments drawer */}
      {showComments && (
        <div id="comments" className="mt-3 border-t pt-3">
          {/* input i përgjithshëm */}
          <div className="mb-3">
            <input
              className="border rounded-md w-full h-9 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
              placeholder="Write a comment… (Enter)"
              onKeyDown={async (e) => {
                if (e.key !== "Enter") return;
                const v = (e.target as HTMLInputElement).value.trim();
                if (!v) return;
                await addCommentRaw(v);
                (e.target as HTMLInputElement).value = "";
              }}
            />
          </div>

          {/* lista e komenteve */}
          {commentsLoading ? (
            <p className="text-sm text-gray-500">Loading comments…</p>
          ) : comments.length === 0 ? (
            <p className="text-sm text-gray-500">No comments yet.</p>
          ) : (
            <ul className="space-y-2">
              {comments.map((c) => {
                const my = cUserVotes[c.id] ?? 0;
                const sc = cScores[c.id] ?? 0;
                return (
                  <li key={c.id} className="bg-gray-50 border rounded-md p-2">
  <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
  <Avatar src={c.profiles?.avatar_url ?? null} size={20} />
  <span>{c.profiles?.username ?? "user"}</span>
  <span>· {new Date(c.created_at).toLocaleString()}</span>
</div>
{commentMenuFor === c.id && me === c.author_id && (
  <div className="absolute right-2 mt-1 bg-white border rounded shadow p-2 text-sm z-10">
    <button
      className="px-2 py-1 hover:bg-gray-50 w-full text-left"
      onClick={async () => {
        const { error } = await supa.from("comments").delete().eq("id", c.id);
        if (error) return alert(error.message);
        setComments(prev => (prev ?? []).filter(x => x.id !== c.id));
        setCommentCount(n => Math.max(0, (n ?? 1) - 1));
        setCommentMenuFor(null);
      }}
    >
      Delete
    </button>
  </div>
)}




  <div className="text-sm whitespace-pre-wrap">{c.body}</div>

                    {/* toolbar i komentit */}
                    <div className="mt-2 flex items-center gap-2 text-[11px]">
                      <button
                        className={`h-7 px-2 rounded-full border bg-white hover:bg-gray-50 ${my === 1 ? "border-black" : ""}`}
                        onClick={() => voteComment(c.id, 1)}
                        aria-pressed={my === 1}
                      >
                        ▲ Upvote
                      </button>
                      <button
                        className={`h-7 px-2 rounded-full border bg-white hover:bg-gray-50 ${my === -1 ? "border-black" : ""}`}
                        onClick={() => voteComment(c.id, -1)}
                        aria-pressed={my === -1}
                      >
                        ▼ Downvote
                      </button>
                      <span className="text-gray-500">Score: {sc}</span>

                      <span className="mx-2 text-gray-300">·</span>

                      {/* Reply inline */}
                      {replyingId === c.id ? (
                        <>
                          <input
                            className="border rounded h-7 px-2 text-[11px] w-64"
                            value={replyValue}
                            onChange={(e) => setReplyValue(e.target.value)}
                            placeholder="Reply… (Enter)"
                            onKeyDown={async (e) => {
                              if (e.key !== "Enter") return;
                              const text = replyValue.trim();
                              if (!text) return;
                              await addCommentRaw(`@${c.profiles?.username ?? "user"} ${text}`);
                              setReplyingId(null);
                              setReplyValue("");
                            }}
                          />
                          <button
                            className="text-[11px] underline"
                            onClick={() => {
                              setReplyingId(null);
                              setReplyValue("");
                            }}
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <button
                          className="h-7 px-2 rounded-full border bg-white hover:bg-gray-50"
                          onClick={() => setReplyingId(c.id)}
                        >
                          ↩ Reply
                        </button>
                      )}

                      <button
                        className="h-7 px-2 rounded-full border bg-white hover:bg-gray-50"
                        onClick={() => reportComment(c.id)}
                      >
                        🚩 Report
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
      {imgOpen && p.image_url && (
  <div className="flex items-center gap-2">
  <Avatar src={p.profiles?.avatar_url ?? null} size={32} />
  <div className="text-sm text-gray-600">@{p.profiles?.username}</div>
</div>

  
)}
<PostEditModal
  open={editing}
  post={{ id: p.id, body: p.body, url: p.url ?? null, image_url: p.image_url ?? null }}
  onClose={() => setEditing(false)}
  onSaved={() => {
    setEditing(false);
    p.onChanged?.();
  }}
/>

    </article>
  );
}
