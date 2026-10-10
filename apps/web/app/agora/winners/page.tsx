"use client";

import { useEffect, useState } from "react";
import { supa } from "@/lib/supabase";
import Shell from "@/components/shell";
import LeftNav from "@/components/LeftNav";
import RightAside from "@/components/RightAside";

type Winner = {
  id: string;
  sponsor_name: string;
  title: string;
  prize_description: string | null;
  post_id: string;
  ends_at: string;
  winnerBody: string | null;
  winnerUsername: string | null;
  winnerDisplayName: string | null;
  winnerAvatarUrl: string | null;
};

export default function HallOfFamePage() {
  const [winners, setWinners] = useState<Winner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: arenas } = await supa
        .from("debate_arenas")
        .select("id,sponsor_name,title,prize_description,post_id,ends_at,winner_comment_id")
        .eq("status", "awarded")
        .order("ends_at", { ascending: false });

      const rows = (arenas ?? []) as any[];
      const commentIds = rows.map((r) => r.winner_comment_id).filter(Boolean);

      let commentsById: Record<string, { body: string; author_id: string }> = {};
      let profilesById: Record<string, { username: string; display_name: string | null; avatar_url: string | null }> = {};

      if (commentIds.length > 0) {
        const { data: comments } = await supa
          .from("comments")
          .select("id,body,author_id")
          .in("id", commentIds);
        for (const c of comments ?? []) commentsById[c.id] = c as any;

        const authorIds = Array.from(new Set((comments ?? []).map((c: any) => c.author_id)));
        if (authorIds.length > 0) {
          const { data: profiles } = await supa
            .from("profiles")
            .select("id,username,display_name,avatar_url")
            .in("id", authorIds);
          for (const p of profiles ?? []) profilesById[p.id] = p as any;
        }
      }

      setWinners(
        rows.map((r) => {
          const comment = r.winner_comment_id ? commentsById[r.winner_comment_id] : null;
          const profile = comment ? profilesById[comment.author_id] : null;
          return {
            id: r.id,
            sponsor_name: r.sponsor_name,
            title: r.title,
            prize_description: r.prize_description,
            post_id: r.post_id,
            ends_at: r.ends_at,
            winnerBody: comment?.body ?? null,
            winnerUsername: profile?.username ?? null,
            winnerDisplayName: profile?.display_name ?? null,
            winnerAvatarUrl: profile?.avatar_url ?? null,
          };
        })
      );
      setLoading(false);
    })();
  }, []);

  return (
    <Shell left={<LeftNav />} right={<RightAside />}>
      <div className="max-w-2xl mx-auto mt-6 space-y-4">
        <div className="text-center space-y-2">
          <div className="text-3xl">🏆</div>
          <h1 className="text-xl font-bold">Hall of Fame</h1>
          <p className="text-gray-600 text-sm max-w-md mx-auto">
            The arguments that won real, sponsored debates — judged by the community, not by who paid the most.
          </p>
          <a
            href="/agora"
            className="inline-block mt-1 px-4 py-2 rounded-lg border text-sm font-medium hover:bg-gray-50"
          >
            ← Back to Agora
          </a>
        </div>

        {loading ? (
          <p className="text-sm text-gray-500 text-center">Loading…</p>
        ) : winners.length === 0 ? (
          <p className="text-sm text-gray-500 text-center">No debates have been awarded yet.</p>
        ) : (
          winners.map((w) => (
            <article key={w.id} className="bg-white border rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2 text-xs flex-wrap">
                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-medium">
                  Sponsored Debate
                </span>
                <span className="text-gray-500">{w.sponsor_name}</span>
                <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">
                  🏆 Winner
                </span>
              </div>

              <h2 className="font-semibold text-lg">{w.title}</h2>
              {w.prize_description && (
                <p className="text-sm text-gray-600">Prize: {w.prize_description}</p>
              )}

              {w.winnerBody && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-2">
                  <p className="text-sm text-gray-800 whitespace-pre-wrap break-words">{w.winnerBody}</p>
                  {w.winnerUsername && (
                    <a
                      href={`/profile/${w.winnerUsername}`}
                      className="flex items-center gap-2 text-xs text-gray-600 hover:underline"
                    >
                      <img
                        src={w.winnerAvatarUrl || "/default-avatar.png"}
                        alt=""
                        className="w-5 h-5 rounded-full object-cover"
                      />
                      {w.winnerDisplayName || `@${w.winnerUsername}`}
                    </a>
                  )}
                </div>
              )}

              <a href={`/post/${w.post_id}`} className="text-sm text-amber-700 font-medium hover:underline">
                See the full debate →
              </a>
            </article>
          ))
        )}
      </div>
    </Shell>
  );
}
