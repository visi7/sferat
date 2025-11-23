"use client";
import { useEffect, useRef, useState } from "react";
import { supa } from "@/lib/supabase";

type Noti = {
  id: string;
  type: string | null;
  created_at: string;
  payload: any | null;
};
function bellText(n: { type: string | null; payload: any | null }) {
  const p = n.payload ?? {};
  const actor = p.actor_username || p.actor_name || p.actor_handle || "Someone";
  const t = n.type ?? "";

  switch (t) {
    case "follow":           return `${actor} followed you.`;
    case "comment_replied":  return `${actor} replied to your comment.`;
    case "post_upvoted":     return `${actor} upvoted your post.`;
    case "comment_upvoted":  return `${actor} upvoted your comment.`;
    case "report_result":    return `Your report was ${p.status ?? "processed"}.`;
    default:                 return "You have a new notification.";
  }
}


export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [list, setList] = useState<Noti[]>([]);
  const [loading, setLoading] = useState(false);
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

  // ngarko njoftimet kur hapet dropdown
  async function loadIfNeeded() {
    if (list.length > 0 || loading) return;
    setLoading(true);
    try {
      const s = (await supa.auth.getSession()).data.session;
      const uid = s?.user?.id;
      if (!uid) return;

      const { data, error } = await supa
        .from("notifications")
        .select("id,type,created_at,payload")
        .eq("user_id", uid)
        .order("created_at", { ascending: false })
        .limit(10);

      if (!error && data) setList(data as any);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative" ref={boxRef}>
      <button
        className="h-8 px-3 rounded-md border hover:bg-gray-50"
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
              {list.map((n) => (
                <li key={n.id} className="px-2 py-2 hover:bg-gray-50 rounded">
                  <div className="text-sm">
                    <span className="font-medium">{n.type ?? "event"}</span>
                    <span className="text-gray-500"> · {new Date(n.created_at).toLocaleString()}</span>
                  </div>
                  {n.payload?.msg && (
                    <div className="text-sm text-gray-700 truncate">{bellText(n)}</div>



                  )}
                </li>
              ))}
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
