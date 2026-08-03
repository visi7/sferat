"use client";
import { useEffect, useRef, useState } from "react";
import { supa } from "@/lib/supabase";

type Noti = {
  id: string;
  type: string | null;
  created_at: string;
  payload: any | null;
  read_at?: string | null;
};

function roleChangeText(p: any) {
  const roleLabel = p.role ? p.role.charAt(0).toUpperCase() + p.role.slice(1) : "a role";
  const scope = p.republic_title ? ` in ${p.republic_title}` : " (global)";
  const actor = p.actor_username || "An admin";
  return p.action === "revoked"
    ? `${actor} removed your ${roleLabel} role${scope}.`
    : `${actor} granted you the ${roleLabel} role${scope}.`;
}

function bellText(n: { type: string | null; payload: any | null }) {
  const p = n.payload ?? {};
  const actor = p.actor_username || p.actor_name || p.actor_handle || "Someone";
  const t = n.type ?? "";

  switch (t) {
    case "follow":           return `${actor} followed you.`;
    case "comment_replied":  return `${actor} replied to your comment.`;
    case "post_upvoted":     return `${actor} upvoted your post.`;
    case "comment_upvoted":  return `${actor} upvoted your comment.`;
    case "comment_convinced": return `${actor} said your comment convinced them.`;
    case "debate_arena_won": return `🏆 Your argument won "${p.arena_title ?? "a debate arena"}"${p.prize_description ? ` — ${p.prize_description}` : ""}!`;
    case "report_escalated": return `🚩 ${actor} escalated a ${p.target_type ?? "report"} for your review.`;
    case "report_result":    return `Your report was ${p.status ?? "processed"}.`;
    case "role_changed":     return roleChangeText(p);
    default:                 return "You have a new notification.";
  }
}

function notificationHref(n: Noti, commentPostMap: Record<string, string>): string | null {
  const p = n.payload ?? {};
  switch (n.type) {
    case "comment_replied":
    case "post_upvoted":
      return p.post_id ? `/post/${p.post_id}` : null;
    case "comment_upvoted":
    case "comment_convinced": {
      const postId = commentPostMap[p.comment_id];
      return postId ? `/post/${postId}` : null;
    }
    case "debate_arena_won":
      return p.post_id ? `/post/${p.post_id}` : null;
    case "report_escalated":
      return "/mod/panel";
    case "follow":
      return p.actor_username ? `/profile/${p.actor_username}` : null;
    default:
      return null;
  }
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [list, setList] = useState<Noti[]>([]);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [commentPostMap, setCommentPostMap] = useState<Record<string, string>>({});
  const boxRef = useRef<HTMLDivElement | null>(null);

  // mbyll kur klikon jashtë
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!boxRef.current) return;
      if (!boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  // numri i njoftimeve të palexuara, kur ngarkohet komponenti
  useEffect(() => {
    (async () => {
      const s = (await supa.auth.getSession()).data.session;
      const uid = s?.user?.id;
      if (!uid) return;

      const { count } = await supa
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", uid)
        .is("read_at", null);

      setUnreadCount(count ?? 0);
    })();
  }, []);

  async function loadIfNeeded() {
    if (list.length > 0 || loading) return;
    setLoading(true);
    try {
      const s = (await supa.auth.getSession()).data.session;
      const uid = s?.user?.id;
      if (!uid) return;

      const { data, error } = await supa
        .from("notifications")
        .select("id,type,created_at,payload,read_at")
        .eq("user_id", uid)
        .order("created_at", { ascending: false })
        .limit(10);

      if (!error && data) {
        setList(data as any);

        const commentIds = Array.from(
          new Set(
            (data as Noti[])
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
      }

      // shëno si të lexuara, meqë sapo i pa
      if (unreadCount > 0) {
        setUnreadCount(0);
        await supa
          .from("notifications")
          .update({ read_at: new Date().toISOString() })
          .eq("user_id", uid)
          .is("read_at", null);
      }
    } finally {
      setLoading(false);
    }
  }

  async function deleteOne(id: string) {
    setList((s) => s.filter((n) => n.id !== id));
    await supa.from("notifications").delete().eq("id", id);
  }

  return (
    <div className="relative" ref={boxRef}>
      <button
        className="relative h-8 px-3 rounded-md border hover:bg-gray-50"
        onClick={async () => {
          const next = !open;
          setOpen(next);
          if (next) await loadIfNeeded();
        }}
        aria-haspopup="menu"
        aria-expanded={open}
        title="Notifications"
      >
        🔔
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-600 text-white text-[10px] leading-4 text-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 mt-2 w-72 bg-white border rounded-lg shadow-lg p-2 z-50"
          role="menu"
        >
          <div className="px-2 py-1 text-sm font-semibold">Notifications</div>
          <div className="h-px bg-gray-100 my-1" />
          {loading ? (
            <div className="px-2 py-2 text-sm text-gray-500">Loading…</div>
          ) : list.length === 0 ? (
            <div className="px-2 py-2 text-sm text-gray-500">No notifications.</div>
          ) : (
            <ul className="max-h-80 overflow-auto">
              {list.map((n) => {
                const href = notificationHref(n, commentPostMap);
                return (
                  <li key={n.id} className="px-2 py-2 hover:bg-gray-50 rounded flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      {href ? (
                        <a href={href} className="text-sm text-gray-800 hover:underline">
                          {bellText(n)}
                        </a>
                      ) : (
                        <div className="text-sm text-gray-800">{bellText(n)}</div>
                      )}
                      <div className="text-xs text-gray-500">{new Date(n.created_at).toLocaleString()}</div>
                    </div>
                    <button
                      onClick={() => deleteOne(n.id)}
                      className="shrink-0 text-xs text-red-600 hover:underline"
                      aria-label="Delete notification"
                    >
                      Delete
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          <div className="h-px bg-gray-100 my-1" />
          <a
            href="/notifications"
            className="block text-center text-sm py-1 hover:underline"
          >
            View all
          </a>
        </div>
      )}
    </div>
  );
}
