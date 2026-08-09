"use client";
import type { PostCardProps, Author, CommentRow } from "@/types/content";
import PostHeader from "./post/PostHeader";
import PostBody from "./post/PostBody";
import PostToolbar from "./post/PostToolbar";
import PostKebab from "./post/PostKebab";
import PostEditModal from "@/components/PostEditModal";
import Avatar from "./Avatar";
import CommentItem from "@/components/comments/CommentItem";
import SignInPrompt from "@/components/SignInPrompt";
import ConfirmDialog from "@/components/ConfirmDialog";
import Toast from "@/components/Toast";
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
  const [signInMsg, setSignInMsg] = useState<string | null>(null);
  const [commentCooldown, setCommentCooldown] = useState(0);

  useEffect(() => {
    if (commentCooldown <= 0) return;
    const t = setInterval(() => setCommentCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [commentCooldown]);
const [imgOpen, setImgOpen] = useState(false);

const [comments, setComments] = useState<CommentRow[]>([]);
  
  const [author, setAuthor] = useState<Author | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [commentCount, setCommentCount] = useState<number>(0);
const [editing, setEditing] = useState(false);
 const isMine = me === p.author_id;

  // Score dhe vota e përdoruesit në post
  const [localScore, setLocalScore] = useState<number>(p.score);
  const [userVote, setUserVote] = useState<0 | 1 | -1>(0);

  // Kebab menu
  const [menuOpen, setMenuOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [pendingDeleteCommentId, setPendingDeleteCommentId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null); 
  const [saved, setSaved] = useState(false);
  const [reportingPost, setReportingPost] = useState(false);
const [postReportText, setPostReportText] = useState("");


  // Comments drawer
  const [showComments, setShowComments] = useState(false);
  const [commentsLoading, setCommentsLoading] = useState(false);
  
  // Votes e komenteve: comment_id -> score dhe vota ime
  const [cScores, setCScores] = useState<Record<string, number>>({});
  const [cUserVotes, setCUserVotes] = useState<Record<string, -1 | 0 | 1>>({});
  const [cConvinced, setCConvinced] = useState<Record<string, number>>({});
  const [cMyConvinced, setCMyConvinced] = useState<Record<string, boolean>>({});

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
      .select("user_id")
      .eq("user_id", uid)
      .eq("post_id", p.id)
      .maybeSingle();

    setSaved(!!data && !error);
  })();
}, [p.id]);
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
          .select("follower_id")
          .eq("follower_id", uid)
          .eq("followed_user_id", p.author_id)
          .limit(1);
        setIsFollowing((data ?? []).length > 0);
      }

      // Comment count (vetëm numri; përmbajtja e plotë ngarkohet nga loadCommentsOnce te hapja e drawer-it)
      const { count } = await supa
        .from("comments")
        .select("id", { count: "exact", head: true })
        .eq("post_id", p.id);
      setCommentCount(count ?? 0);


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
    if (!s?.user?.id) return setSignInMsg("Sign in to vote on posts.");

    // Optimistic: shëno vizualisht menjëherë
    setUserVote((prev) => (prev === wanted ? 0 : wanted));

    const { data, error } = await supa.rpc("toggle_vote", {
      p_post_id: p.id,
      p_value: wanted,
    });

    if (error) {
      setErrorMsg(error.message);
      // opc: mund të bëjmë një refresh nga DB nëse do
      return;
    }

    // sinkronizo UI me DB
    const row = Array.isArray(data) ? data[0] : data;
    if (row) {
      setLocalScore(row.score as number);
      setUserVote((row.user_vote as 0 | 1 | -1) ?? 0);
    }
    // s'thërrasim p.onChanged() këtu qëllimisht — do të rifreskonte GJITHË
    // feed-in (reset=true) për çdo votë të vetme, duke shkaktuar "Loading…"
    // të dukshëm dhe rirenditje befasuese; gjendja lokale (score/userVote)
    // e mbulon plotësisht ndryshimin që i duhet UI-t.
  }

  // ========= Komente =========
  async function addCommentRaw(text: string) {
    if (!me) return setSignInMsg("Sign in to join the discussion.");
    const body = text.trim();
    if (!body) return;
    setBusy(true);
    try {
    const { data, error } = await supa
  .from("comments")
  .insert({ post_id: p.id, author_id: me, body })
  .select("id, body, created_at, author_id")
  .single();
if (error) throw error;

   // profili im (komentuesi) e kemi tashmë të disponueshëm nga "author" vetëm
   // nëse jam edhe autori i postit; përndryshe e marrim veçmas, të sigurt
   let myProfile = author && author.id === me ? author : null;
   if (!myProfile) {
     const { data: prof } = await supa
       .from("profiles")
       .select("id,username,display_name,avatar_url")
       .eq("id", me)
       .maybeSingle();
     myProfile = (prof as any) ?? null;
   }

   setCommentCount(n => (n ?? 0) + 1);

  setComments(prev => {
  const arr = prev ?? [];
  const id = (data as any).id;
  if (arr.some(c => c.id === id)) return arr;
  const newRow = {
    ...(data as any),
    profiles: myProfile ? { username: myProfile.username, avatar_url: myProfile.avatar_url } : { username: null, avatar_url: null },
  };
  return [...arr, newRow];
});

      // s'thërrasim p.onChanged() këtu për të njëjtën arsye si te doVote() —
      // gjendja lokale (commentCount/comments) tashmë e mbulon UI-n.
    } catch (e: any) {
      const m = /wait (\d+) seconds?/i.exec(e.message ?? "");
      if (m) {
        setCommentCooldown(parseInt(m[1], 10));
      } else {
        setErrorMsg(e.message);
      }
    } finally {
      setBusy(false);
    }
  }

  async function loadCommentsOnce() {
    if (comments.length > 0) return;
    setCommentsLoading(true);

    const c = await supa
      .from("comments")
      .select("id, body, created_at, author_id")
      .eq("post_id", p.id)
      .order("created_at", { ascending: true })
      .limit(200);

    const rawList = (c.data as any[]) ?? [];

    // marrim profilet veçmas (më e besueshme se embed-i, sidomos me RLS)
    const authorIds = Array.from(new Set(rawList.map((x) => x.author_id).filter(Boolean)));
    let profileMap: Record<string, { username: string | null; avatar_url: string | null }> = {};
    if (authorIds.length) {
      const { data: profs } = await supa
        .from("profiles")
        .select("id,username,avatar_url")
        .in("id", authorIds);
      for (const pr of profs ?? []) profileMap[pr.id] = pr;
    }

    const list: CommentRow[] = rawList.map((x) => ({
      ...x,
      profiles: profileMap[x.author_id] ?? { username: null, avatar_url: null },
    }));
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

      // "Convinced me" — sa herë gjithsej + a e kam shënuar unë
      const cc = await supa
        .from("comment_convinces")
        .select("comment_id")
        .in("comment_id", ids);

      if (!cc.error) {
        const map: Record<string, number> = {};
        for (const row of cc.data ?? []) {
          map[row.comment_id] = (map[row.comment_id] ?? 0) + 1;
        }
        setCConvinced(map);
      }

      if (me) {
        const mcc = await supa
          .from("comment_convinces")
          .select("comment_id")
          .eq("user_id", me)
          .in("comment_id", ids);
        if (!mcc.error) {
          const mine: Record<string, boolean> = {};
          for (const row of mcc.data ?? []) mine[row.comment_id] = true;
          setCMyConvinced(mine);
        }
      }
    }

    setCommentsLoading(false);
  }

 
 
  async function voteComment(commentId: string, wanted: 1 | -1) {
    if (!me) return setSignInMsg("Sign in to vote on comments.");

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
      setErrorMsg(e.message);
    }
  }

  async function toggleConvince(commentId: string) {
    if (!me) return setSignInMsg("Sign in to mark a comment as convincing.");

    const wasConvinced = cMyConvinced[commentId] ?? false;

    // Optimistic
    setCMyConvinced((m) => ({ ...m, [commentId]: !wasConvinced }));
    setCConvinced((m) => ({ ...m, [commentId]: (m[commentId] ?? 0) + (wasConvinced ? -1 : 1) }));

    try {
      if (wasConvinced) {
        const { error } = await supa
          .from("comment_convinces")
          .delete()
          .eq("user_id", me)
          .eq("comment_id", commentId);
        if (error) throw error;
      } else {
        const { error } = await supa
          .from("comment_convinces")
          .insert({ user_id: me, comment_id: commentId });
        if (error) throw error;
      }
    } catch (e: any) {
      // rollback
      setCMyConvinced((m) => ({ ...m, [commentId]: wasConvinced }));
      setCConvinced((m) => ({ ...m, [commentId]: (m[commentId] ?? 0) + (wasConvinced ? 1 : -1) }));
      setErrorMsg(e.message);
    }
  }

  // ========= Follow / Save / Report post =========
  async function follow() {
    if (me === p.author_id) return;
    if (!me) return setSignInMsg("Sign in to follow people.");
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
async function confirmDeletePost() {
  setShowDeleteConfirm(false);
  const { error } = await supa.from("posts").delete().eq("id", p.id);
  if (error) return setErrorMsg(error.message);
  p.onChanged?.();
}

async function confirmDeleteComment() {
  const id = pendingDeleteCommentId;
  setPendingDeleteCommentId(null);
  if (!id) return;
  const { error } = await supa.from("comments").delete().eq("id", id);
  if (error) return setErrorMsg(error.message);
  setComments((prev) => (prev ?? []).filter((x) => x.id !== id));
  setCommentCount((n) => Math.max(0, (n ?? 1) - 1));
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
        .select("user_id")
        .eq("user_id", me)
        .eq("post_id", p.id)
        .maybeSingle();
      if (!error && data) setSaved(true);
      else setSaved(false);
    })();
  }, [p.id, me]);

  async function toggleSave() {
    if (!me) return setSignInMsg("Sign in to save posts for later.");
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
      setErrorMsg(e.message);
    }
  }

  async function reportComment(id: string, reason: string) {
  const clean = reason.trim();
  if (!clean || !me) return;

  const { error } = await supa.from("reports").insert({
    comment_id: id,
    reporter_id: me,
    reason: clean,
  });

  if (error) setErrorMsg(error.message);
}

  function copyShare() {
    const url = `${window.location.origin}/post/${p.id}`;
    navigator.clipboard.writeText(url);
    setSuccessMsg("Link copied.");
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
  onDelete={
    isMine
      ? async () => {
          setMenuOpen(false);
          setShowDeleteConfirm(true);
        }
      : undefined
  }
     onReport={isMine ? undefined : async () => { 
    setReportingPost(true); 
}}

 // 🔴 KËTU – report vetëm për jo-autorët
  onShare={copyShare}
>
  {isMine && (
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
/>
{reportingPost && !isMine && (
  <div className="mt-3 border rounded-lg p-3 bg-red-50/40">
    <label className="block text-xs font-medium text-gray-700 mb-1">
      Reason for report (spam, abuse, etc.)
    </label>

    <textarea
      className="w-full border rounded-md px-2 py-1 text-sm min-h-[60px]"
      value={postReportText}
      onChange={(e) => setPostReportText(e.target.value)}
    />

    <div className="mt-2 flex gap-2">
      <button
        className="px-3 py-1 text-xs rounded bg-red-600 text-white"
        onClick={async () => {
          const clean = postReportText.trim();
          if (!clean) return;

          if (!me) return;
          const { error } = await supa.from("reports").insert({
            post_id: p.id,
            reporter_id: me,
            reason: clean,
          });

          if (error) {
            setErrorMsg(error.message);
            return;
          }

          // mbyll formën dhe pastro tekstin
          setReportingPost(false);
          setPostReportText("");
        }}
      >
        Send report
      </button>

      <button
        className="px-3 py-1 text-xs rounded border text-gray-600"
        onClick={() => {
          setReportingPost(false);
          setPostReportText("");
        }}
      >
        Cancel
      </button>
    </div>
  </div>
)}



      {/* comments drawer */}
      {showComments && (
        <div id="comments" className="mt-3 border-t pt-3">
          {/* input i përgjithshëm */}
          <div className="mb-3">
            <input
              className="border rounded-md w-full h-9 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-200 disabled:bg-gray-50 disabled:text-gray-400"
              placeholder={commentCooldown > 0 ? `Wait ${commentCooldown}s…` : "Write a comment… (Enter)"}
              disabled={commentCooldown > 0}
              onKeyDown={async (e) => {
                if (e.key !== "Enter") return;
                const v = (e.target as HTMLInputElement).value.trim();
                if (!v) return;
                await addCommentRaw(v);
                (e.target as HTMLInputElement).value = "";
              }}
            />
            {commentCooldown > 0 && (
              <p className="mt-1 flex items-center gap-2 rounded-md bg-amber-50 border border-amber-200 px-3 py-1.5 text-xs text-amber-800">
                You're commenting too fast — you can comment again in <strong>{commentCooldown}s</strong>.
              </p>
            )}
          </div>

          {/* lista e komenteve */}
          {commentsLoading ? (
            <p className="text-sm text-gray-500">Loading comments…</p>
          ) : comments.length === 0 ? (
            <p className="text-sm text-gray-500">No comments yet.</p>
          ) : (
            <ul className="space-y-2">
  {comments.map((c) => (
    <CommentItem
      key={c.id}
      c={c}
      me={me}
      myVote={cUserVotes[c.id] ?? 0}
      score={cScores[c.id] ?? 0}
      onVote={voteComment}
      convinced={cConvinced[c.id] ?? 0}
      myConvinced={cMyConvinced[c.id] ?? false}
      onConvince={toggleConvince}
      onReport={(reason) => reportComment(c.id, reason)}

      onDelete={async (id) => {
        setPendingDeleteCommentId(id);
      }}
      onUpdate={async (id, newBody) => {
        const { error } = await supa
          .from("comments")
          .update({ body: newBody })
          .eq("id", id);
        if (error) return setErrorMsg(error.message);
        setComments((prev) =>
          (prev ?? []).map((x) => (x.id === id ? { ...x, body: newBody } : x))
        );
      }}
      menuFor={commentMenuFor}
      setMenuFor={setCommentMenuFor}
    />
  ))}
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

<SignInPrompt open={!!signInMsg} message={signInMsg ?? undefined} onClose={() => setSignInMsg(null)} />

<ConfirmDialog
  open={showDeleteConfirm}
  title="Delete this post?"
  message="This can't be undone."
  confirmLabel="Delete"
  danger
  onConfirm={confirmDeletePost}
  onCancel={() => setShowDeleteConfirm(false)}
/>

<ConfirmDialog
  open={!!pendingDeleteCommentId}
  title="Delete this comment?"
  message="This can't be undone."
  confirmLabel="Delete"
  danger
  onConfirm={confirmDeleteComment}
  onCancel={() => setPendingDeleteCommentId(null)}
/>

<Toast message={errorMsg} onClose={() => setErrorMsg(null)} />
<Toast message={successMsg} variant="success" onClose={() => setSuccessMsg(null)} />

    </article>
  );
}
