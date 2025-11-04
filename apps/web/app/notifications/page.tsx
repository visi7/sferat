"use client";

import { useEffect, useState } from "react";
import { supa } from "@/lib/supabase";

type Noti = { id: string; type: string; payload: any; created_at: string; read_at: string | null };

export default function NotificationsPage() {
  const [rows, setRows] = useState<Noti[]>([]);
  const [me, setMe] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const sess = (await supa.auth.getSession()).data.session;
      setMe(sess?.user.id ?? null);
      if (!sess) return;
      const { data } = await supa
        .from("notifications")
        .select("id,type,payload,created_at,read_at")
        .order("created_at", { ascending: false })
        .limit(100);
      setRows((data as any) ?? []);
    })();
  }, []);

  async function markRead(id: string) {
    const { error } = await supa.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
    if (error) return alert(error.message);
    setRows(s => s.map(r => r.id === id ? { ...r, read_at: new Date().toISOString() } : r));
  }

  if (!me) return <main className="p-6">Hyr që të shohësh njoftimet.</main>;

  return (
    <main className="p-6 max-w-2xl mx-auto space-y-4">
      <h1 className="text-xl font-bold">Notifications</h1>
      {rows.length === 0 ? <p>S’ka njoftime.</p> : rows.map(n => (
        <article key={n.id} className="border p-4 rounded">
          <div className="text-xs opacity-70">{new Date(n.created_at).toLocaleString()} — {n.type}</div>
          <pre className="text-sm whitespace-pre-wrap">{JSON.stringify(n.payload, null, 2)}</pre>
          {!n.read_at && (
            <button onClick={() => markRead(n.id)} className="mt-2 px-3 py-1.5 rounded bg-black text-white">
              Mark read
            </button>
          )}
        </article>
      ))}
    </main>
  );
}
