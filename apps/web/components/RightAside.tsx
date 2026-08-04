// apps/web/components/RightAside.tsx
"use client";
import { useEffect, useState } from "react";
import { supa } from "@/lib/supabase";

type Republic = { id: string; title: string; slug: string };
type Profile = { id: string; username: string | null; display_name: string | null };
type Convincer = {
  author_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  convince_count: number;
};

export default function RightAside() {
  const [trending, setTrending] = useState<Republic[]>([]);
  const [people, setPeople] = useState<Profile[]>([]);
  const [convincers, setConvincers] = useState<Convincer[]>([]);

  useEffect(() => {
    (async () => {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
      // trending republics by posts last 7d (cheap heuristic)
      const { data: reps, error: repsErr } = await supa
        .from("posts")
        .select("republic_id, republics!inner(id,slug,title)")
        .gt("created_at", sevenDaysAgo)
        .limit(200);
      if (repsErr) console.error("[RightAside] trending republics", repsErr);
      const uniq = new Map<string, Republic>();
      (reps ?? []).forEach((row: any) => {
        const r = row.republics;
        if (r && !uniq.has(r.id)) uniq.set(r.id, r);
      });
      setTrending(Array.from(uniq.values()).slice(0, 5));

      // who to follow (latest posters)
      const { data: latest, error: latestErr } = await supa
        .from("posts")
        .select("author_id, profiles:profiles!posts_author_id_fkey(id,username,display_name)")
        .order("created_at", { ascending: false })
        .limit(30);
      if (latestErr) console.error("[RightAside] who to follow", latestErr);
      const u = new Map<string, Profile>();
      (latest ?? []).forEach((row: any) => {
        const p = row.profiles;
        if (p && !u.has(p.id)) u.set(p.id, p);
      });
      setPeople(Array.from(u.values()).slice(0, 5));

      // top convincers this week (leaderboard)
      const { data: top, error: topErr } = await supa.rpc("top_convincers", { p_days: 7, p_limit: 5 });
      if (topErr) console.error("[RightAside] top convincers", topErr);
      setConvincers((top as Convincer[]) ?? []);
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
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs uppercase tracking-wide text-gray-500">🏆 Top convincers this week</div>
          <a href="/leaderboard" className="text-xs underline text-gray-500 hover:text-gray-800">See all</a>
        </div>
        {convincers.length === 0 ? <p className="text-sm">—</p> : (
          <ul className="space-y-1">
            {convincers.map((c, i) => (
              <li key={c.author_id} className="flex items-center justify-between">
                <a href={`/profile/${c.username ?? c.author_id}`} className="px-2 py-1 rounded hover:bg-gray-100 flex items-center gap-1">
                  <span className="text-gray-400 w-4 text-right">{i + 1}.</span>
                  @{c.username ?? c.author_id.slice(0, 8)} {c.display_name ? `· ${c.display_name}` : ""}
                </a>
                <span className="text-xs text-amber-700 font-medium">💡 {c.convince_count}</span>
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
