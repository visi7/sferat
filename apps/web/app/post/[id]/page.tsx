// apps/web/app/post/[id]/page.tsx
"use client";

import { use, useEffect, useState } from "react";
import { supa } from "@/lib/supabase";
import PostCard from "@/components/postCard";

type Post = {
  id: string;
  title: string;
  body: string;
  republic_id: string;
  author_id: string;
  score: number;
  created_at: string;
  status?: string;
  post_type?: "text" | "link" | "image" | "poll";
  url?: string | null;
  image_url?: string | null;
};

type Arena = {
  id: string;
  sponsor_name: string;
  title: string;
  prize_description: string | null;
  ends_at: string;
  status: "open" | "awarded";
  winner_comment_id: string | null;
};

type WinnerComment = { body: string; username: string } | null;

function daysUntil(iso: string): number {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
}

export default function PostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [arena, setArena] = useState<Arena | null>(null);
  const [winnerComment, setWinnerComment] = useState<WinnerComment>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);

      const p = await supa
        .from("posts")
        .select(
          "id,title,body,republic_id,author_id,score,created_at,status,post_type,url,image_url"
        )
        .eq("id", id)
        .single();

      if (!cancelled && !p.error) setPost(p.data as Post);
      if (!cancelled) setLoading(false);

      const a = await supa
        .from("debate_arenas")
        .select("id,sponsor_name,title,prize_description,ends_at,status,winner_comment_id")
        .eq("post_id", id)
        .maybeSingle();
      if (!cancelled && a.data) {
        const arenaRow = a.data as Arena;
        setArena(arenaRow);
        if (arenaRow.winner_comment_id) {
          const c = await supa
            .from("comments")
            .select("body,author_id")
            .eq("id", arenaRow.winner_comment_id)
            .maybeSingle();
          if (!cancelled && c.data) {
            const { data: prof } = await supa
              .from("profiles")
              .select("username")
              .eq("id", (c.data as any).author_id)
              .maybeSingle();
            setWinnerComment({ body: (c.data as any).body, username: prof?.username ?? "user" });
          }
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return <main className="p-6">Loading…</main>;
  }

  if (!post) {
    return <main className="p-6">Post not found.</main>;
  }

  // PostCard vetë e bën editimin, votimin dhe komentet (view + add + vote + report)
  return (
    <main className="p-6 max-w-2xl mx-auto space-y-3">
      {arena && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-1">
          <div className="flex items-center gap-2 text-xs flex-wrap">
            <span className="px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 font-medium">
              🏆 Sponsored Debate Arena
            </span>
            <span className="text-amber-800">{arena.sponsor_name}</span>
          </div>
          <p className="text-sm text-amber-900">
            {arena.prize_description && <>Prize: <strong>{arena.prize_description}</strong> · </>}
            {arena.status === "awarded"
              ? "Winner announced."
              : daysUntil(arena.ends_at) < 0
              ? "Voting closed — winner coming soon."
              : `Ends in ${daysUntil(arena.ends_at)}d.`}
          </p>
        </div>
      )}

      {winnerComment && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-1">
          <div className="text-xs font-medium text-blue-800">🏆 Winning argument — @{winnerComment.username}</div>
          <p className="text-sm text-blue-900 whitespace-pre-wrap break-words">{winnerComment.body}</p>
        </div>
      )}

      <PostCard {...post} onChanged={() => {}} />
    </main>
  );
}
