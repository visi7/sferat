"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supa } from "@/lib/supabase";

type Noti = {
  id: string;
  type: string;
  payload: any;
  created_at: string;
  read_at: string | null;
};

export default function NotificationsPage() {
  const [rows, setRows] = useState<Noti[]>([]);
  const [me, setMe] = useState<string | null>(null);
  const [commentPostMap, setCommentPostMap] = useState<Record<string, string>>({});
  const [tab, setTab] = useState<"all" | "unread">("all");

  useEffect(() => {
    (async () => {
      const sess = (await supa.auth.getSession()).data.session;
      setMe(sess?.user.id ?? null);
      if (!sess) return;

      const { data, error } = await supa
        .from("notifications")
        .select("id,type,payload,created_at,read_at")
        .eq("user_id", sess.user.id)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) return;
      const list = (data as Noti[]) ?? [];
      setRows(list);

      // comment_upvoted/comment_convinced s'e kanë post_id te payload — e marrim veçmas që linku të dijë ku të çojë
      const commentIds = Array.from(
        new Set(
          list
            .filter((n) => n.type === "comment_upvoted" || n.type === "comment_convinced")
            .map((n) => n.payload?.comment_id)
            .filter(Boolean)
        )
      );
      if (commentIds.length > 0) {
        const { data: comments } = await supa.from("comments").select("id,post_id").in("id", commentIds);
        const map: Record<string, string> = {};
        for (const c of comments ?? []) map[c.id] = c.post_id;
        setCommentPostMap(map);
      }
    })();
  }, []);

  async function markRead(id: string) {
    const { error } = await supa
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", id);
    if (!error) {
      setRows((s) => s.map((r) => (r.id === id ? { ...r, read_at: new Date().toISOString() } : r)));
    }
  }

  async function markAllRead() {
    if (!me) return;
    const { error } = await supa
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", me)
      .is("read_at", null);
    if (!error) {
      setRows((s) => s.map((r) => (r.read_at ? r : { ...r, read_at: new Date().toISOString() })));
    }
  }

  async function deleteOne(id: string) {
    const { error } = await supa.from("notifications").delete().eq("id", id);
    if (!error) setRows((s) => s.filter((r) => r.id !== id));
  }

  async function clearAll() {
    if (!me) return;
    if (!confirm("Delete all notifications? This can't be undone.")) return;
    const { error } = await supa.from("notifications").delete().eq("user_id", me);
    if (!error) setRows([]);
  }

  function formatNotification(n: Noti): string {
    const actor = n.payload?.actor_username ?? "Someone";
    switch (n.type) {
      case "follow":           return `${actor} followed you.`;
      case "comment_replied":  return `${actor} replied to your comment.`;
      case "post_upvoted":     return `${actor} upvoted your post.`;
      case "comment_upvoted":  return `${actor} upvoted your comment.`;
      case "comment_convinced": return `${actor} said your comment convinced them.`;
      case "debate_arena_won": {
        const p = n.payload ?? {};
        return `🏆 Your argument won "${p.arena_title ?? "a debate arena"}"${p.prize_description ? ` — ${p.prize_description}` : ""}!`;
      }
      case "report_result":    return `Your report was ${n.payload?.status ?? "processed"}.`;
      case "role_changed": {
        const p = n.payload ?? {};
        const roleLabel = p.role ? p.role.charAt(0).toUpperCase() + p.role.slice(1) : "a role";
        const scope = p.republic_title ? ` in ${p.republic_title}` : " (global)";
        return p.action === "revoked"
          ? `${actor} removed your ${roleLabel} role${scope}.`
          : `${actor} granted you the ${roleLabel} role${scope}.`;
      }
      default:                 return "You have a new notification.";
    }
  }

  function notificationHref(n: Noti): string | null {
    switch (n.type) {
      case "comment_replied":
      case "post_upvoted":
        return n.payload?.post_id ? `/post/${n.payload.post_id}` : null;
      case "comment_upvoted":
      case "comment_convinced": {
        const postId = commentPostMap[n.payload?.comment_id];
        return postId ? `/post/${postId}` : null;
      }
      case "debate_arena_won":
        return n.payload?.post_id ? `/post/${n.payload.post_id}` : null;
      case "follow":
        return n.payload?.actor_username ? `/profile/${n.payload.actor_username}` : null;
      default:
        return null;
    }
  }

  const visibleRows = useMemo(
    () => (tab === "unread" ? rows.filter((r) => !r.read_at) : rows),
    [rows, tab]
  );

  return (
    <main className="p-6 max-w-2xl mx-auto space-y-4">
      <div className="mb-2 flex items-center justify-between">
        <h1 className="text-xl font-bold">Notifications</h1>
        <Link
          href="/"
          className="inline-flex items-center gap-1 rounded border px-3 py-1.5 text-sm hover:bg-neutral-50"
          aria-label="Go to home"
        >
          Home
        </Link>
      </div>

      {me && rows.length > 0 && (
        <div className="flex items-center justify-between">
          <div className="flex gap-1 text-sm">
            <button
              onClick={() => setTab("all")}
              className={`px-3 py-1 rounded-full border ${tab === "all" ? "bg-black text-white" : "hover:bg-gray-50"}`}
            >
              All
            </button>
            <button
              onClick={() => setTab("unread")}
              className={`px-3 py-1 rounded-full border ${tab === "unread" ? "bg-black text-white" : "hover:bg-gray-50"}`}
            >
              Unread
            </button>
          </div>
          <div className="flex gap-2 text-sm">
            <button onClick={markAllRead} className="text-blue-600 hover:underline">
              Mark all read
            </button>
            <button onClick={clearAll} className="text-red-600 hover:underline">
              Clear all
            </button>
          </div>
        </div>
      )}

      {!me ? (
        <p>Sign in to view your notifications.</p>
      ) : visibleRows.length === 0 ? (
        <p>{tab === "unread" ? "No unread notifications." : "No notifications yet."}</p>
      ) : (
        visibleRows.map((n) => {
          const href = notificationHref(n);
          const text = formatNotification(n);
          return (
            <article key={n.id} className="border p-4 rounded bg-white flex items-start justify-between gap-3">
              <div>
                {href ? (
                  <Link href={href} onClick={() => !n.read_at && markRead(n.id)} className="hover:underline">
                    {text}
                  </Link>
                ) : (
                  <p>{text}</p>
                )}
                <time
                  dateTime={n.created_at}
                  suppressHydrationWarning
                  className="mt-1 block text-xs text-neutral-500"
                >
                  {new Date(n.created_at).toLocaleString()}
                </time>
              </div>

              <div className="flex flex-col items-end gap-1 shrink-0">
                {!n.read_at && (
                  <button
                    onClick={() => markRead(n.id)}
                    className="h-8 rounded border px-3 text-sm hover:bg-neutral-50"
                  >
                    Mark read
                  </button>
                )}
                <button
                  onClick={() => deleteOne(n.id)}
                  className="h-8 rounded border px-3 text-sm text-red-600 hover:bg-red-50"
                  aria-label="Delete notification"
                >
                  🗑
                </button>
              </div>
            </article>
          );
        })
      )}
    </main>
  );
}
