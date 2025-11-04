// apps/web/components/RightAside.tsx
"use client";
import { useEffect, useState } from "react";
import { supa } from "@/lib/supabase";

type Republic = { id: string; title: string; slug: string };
type Profile = { id: string; username: string | null; display_name: string | null };

export default function RightAside() {
  const [trending, setTrending] = useState<Republic[]>([]);
  const [people, setPeople] = useState<Profile[]>([]);

  useEffect(() => {
    (async () => {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
      // trending republics by posts last 7d (cheap heuristic)
      const { data: reps } = await supa
        .from("posts")
        .select("republic_id, republics!inner(id,slug,title)")
        .gt("created_at", sevenDaysAgo)
        .limit(200);
      const uniq = new Map<string, Republic>();
      (reps ?? []).forEach((row: any) => {
        const r = row.republics;
        if (r && !uniq.has(r.id)) uniq.set(r.id, r);
      });
      setTrending(Array.from(uniq.values()).slice(0, 5));

      // who to follow (latest posters)
      const { data: latest } = await supa
        .from("posts")
        .select("author_id, profiles!inner(id,username,display_name)")
        .order("created_at", { ascending: false })
        .limit(30);
      const u = new Map<string, Profile>();
      (latest ?? []).forEach((row: any) => {
        const p = row.profiles;
        if (p && !u.has(p.id)) u.set(p.id, p);
      });
      setPeople(Array.from(u.values()).slice(0, 5));
    })();
  }, []);

  return (
    <div className="sticky top-16 space-y-4">
      <section className="bg-white border rounded-xl p-3">
        <div className="text-xs uppercase tracking-wide text-gray-500 mb-2">Trending Republics</div>
        {trending.length === 0 ? <p className="text-sm">—</p> : (
          <ul className="space-y-1">
            {trending.map(r => (
              <li key={r.id}>
                <a href={`/#rep=${r.id}`} className="px-2 py-1 rounded hover:bg-gray-100 block">{r.title}</a>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="bg-white border rounded-xl p-3">
        <div className="text-xs uppercase tracking-wide text-gray-500 mb-2">Who to follow</div>
        {people.length === 0 ? <p className="text-sm">—</p> : (
          <ul className="space-y-1">
            {people.map(p => (
              <li key={p.id} className="flex items-center justify-between">
                <a href={`/profile/${p.username ?? p.id}`} className="px-2 py-1 rounded hover:bg-gray-100">
                  @{p.username ?? p.id.slice(0,8)} {p.display_name ? `· ${p.display_name}` : ""}
                </a>
                <a href={`/profile/${p.username ?? p.id}`} className="text-xs underline">View</a>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="bg-white border rounded-xl p-3">
        <div className="text-xs uppercase tracking-wide text-gray-500 mb-2">Announcements</div>
        <ul className="list-disc list-inside text-sm leading-relaxed">
          <li>Posts disappear after 7 days.</li>
          <li>Speak freely. Inspire others. Stay kind.</li>
        </ul>
      </section>
    </div>
  );
}
