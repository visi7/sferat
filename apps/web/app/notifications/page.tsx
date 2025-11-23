"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
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

  useEffect(() => {
    (async () => {
      const sess = (await supa.auth.getSession()).data.session;
      setMe(sess?.user.id ?? null);
      if (!sess) return;

      const { data, error } = await supa
        .from("notifications")
        .select("id,type,payload,created_at,read_at")
        .order("created_at", { ascending: false })
        .limit(100);

      if (!error) setRows((data as Noti[]) ?? []);
    })();
  }, []);

  async function markRead(id: string) {
    const { error } = await supa
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", id);
    if (!error) {
      setRows(s => s.map(r => r.id === id ? { ...r, read_at: new Date().toISOString() } : r));
    }
  }

  function formatNotification(n: Noti): string {
    const actor = n.payload?.actor_username ?? "Someone";
    switch (n.type) {
      case "follow":           return `${actor} followed you.`;
      case "comment_replied":  return `${actor} replied to your comment.`;
      case "post_upvoted":     return `${actor} upvoted your post.`;
      case "comment_upvoted":  return `${actor} upvoted your comment.`;
      case "report_result":    return `Your report was ${n.payload?.status ?? "processed"}.`;
      default:                 return "You have a new notification.";
    }
  }

  return (
    <main className="p-6 max-w-2xl mx-auto space-y-4">
      <div className="mb-4 flex items-center justify-between">
  <h1 className="text-xl font-bold">Notifications</h1>
  <Link
    href="/"
    className="inline-flex items-center gap-1 rounded border px-3 py-1.5 text-sm hover:bg-neutral-50"
    aria-label="Go to home"
  >
    Home
  </Link>
</div>

      {!me ? (
        <p>Sign in to view your notifications.</p>
      ) : rows.length === 0 ? (
        <p>No notifications yet.</p>
      ) : (
        rows.map((n) => (
          <article key={n.id} className="border p-4 rounded bg-white">
            <p>{formatNotification(n)}</p>
            <time
              dateTime={n.created_at}
              suppressHydrationWarning
              className="mt-1 block text-xs text-neutral-500"
            >
              {new Date(n.created_at).toLocaleString()} — {n.type}
            </time>

            {!n.read_at && (
              <button
                onClick={() => markRead(n.id)}
                className="mt-2 h-8 rounded border px-3 text-sm hover:bg-neutral-50"
              >
                Mark read
              </button>
            )}
          </article>
        ))
      )}
    </main>
  );
}
