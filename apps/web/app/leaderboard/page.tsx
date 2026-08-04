"use client";
import { useEffect, useState } from "react";
import { supa } from "@/lib/supabase";
import Shell from "@/components/shell";
import LeftNav from "@/components/LeftNav";
import RightAside from "@/components/RightAside";

type Convincer = {
  author_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  convince_count: number;
};

const PERIODS = [
  { label: "This week", days: 7 },
  { label: "This month", days: 30 },
  { label: "All time", days: 36500 },
];

export default function LeaderboardPage() {
  const [rows, setRows] = useState<Convincer[]>([]);
  const [loading, setLoading] = useState(true);
  const [periodDays, setPeriodDays] = useState(7);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supa.rpc("top_convincers", { p_days: periodDays, p_limit: 50 });
      if (error) console.error("[Leaderboard] top_convincers", error);
      setRows((data as Convincer[]) ?? []);
      setLoading(false);
    })();
  }, [periodDays]);

  return (
    <Shell left={<LeftNav />} right={<RightAside />}>
      <div className="space-y-4">
        <div className="bg-white border rounded-xl p-4">
          <h1 className="text-lg font-semibold">🏆 Top Convincers</h1>
          <p className="text-sm text-gray-500 mt-1">
            Ranked by "Convinced me" marks received from other people — a signal of genuinely persuasive
            arguments, not just popularity.
          </p>

          <div className="flex gap-2 mt-3">
            {PERIODS.map((p) => (
              <button
                key={p.label}
                onClick={() => setPeriodDays(p.days)}
                className={`px-3 py-1.5 rounded-full border text-sm ${
                  periodDays === p.days ? "bg-black text-white" : "bg-white hover:bg-gray-50"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white border rounded-xl p-2">
          {loading ? (
            <p className="p-4 text-sm text-gray-500">Loading…</p>
          ) : rows.length === 0 ? (
            <p className="p-4 text-sm text-gray-500">No "Convinced me" marks in this period yet.</p>
          ) : (
            <ol className="divide-y">
              {rows.map((r, i) => (
                <li key={r.author_id} className="flex items-center gap-3 p-3">
                  <span className="w-6 text-right text-sm text-gray-400 shrink-0">{i + 1}</span>
                  <img
                    src={r.avatar_url || "/default-avatar.png"}
                    alt=""
                    className="w-8 h-8 rounded-full object-cover shrink-0"
                  />
                  <a
                    href={`/profile/${r.username ?? r.author_id}`}
                    className="flex-1 min-w-0 hover:underline"
                  >
                    <div className="text-sm font-medium truncate">
                      {r.display_name || `@${r.username ?? r.author_id.slice(0, 8)}`}
                    </div>
                    {r.display_name && (
                      <div className="text-xs text-gray-500 truncate">@{r.username ?? r.author_id.slice(0, 8)}</div>
                    )}
                  </a>
                  <span className="text-sm font-medium text-amber-700 shrink-0">💡 {r.convince_count}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </Shell>
  );
}
