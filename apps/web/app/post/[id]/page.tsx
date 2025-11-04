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
  // fushat e reja nëse i përdor
  post_type?: "text" | "link" | "image" | "poll";
  url?: string | null;
  image_url?: string | null;
};

type Comment = {
  id: string;
  body: string;
  created_at: string;
  // nëse ke join me profiles:
  profiles?: { username: string | null } | null;
};

export default function PostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // ✅ unwrapping i params Promise
  const { id } = use(params);

  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);

      // POST
      const p = await supa
        .from("posts")
        .select(
          "id,title,body,republic_id,author_id,score,created_at,status,post_type,url,image_url"
        )
        .eq("id", id)
        .single();

      if (!cancelled && !p.error) setPost(p.data as Post);

      // COMMENTS
      const c = await supa
        .from("comments")
        .select("id,body,created_at,profiles!inner(username)")
        .eq("post_id", id)
        .order("created_at", { ascending: true })
        .limit(200);

      if (!cancelled) setComments((c.data as any) ?? []);

      if (!cancelled) setLoading(false);
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

  return (
    <main className="p-6 space-y-6">
      <PostCard
        {...post}
        // nëse do t’i japësh titullin e republikës, mund ta marrësh me një query tjetër ose e lë bosh
        onChanged={() => {
          // rifresko post-in/komentet nëse bën veprime
        }}
      />

      <section>
        <h2 className="font-semibold mb-3">Comments</h2>
        {comments.length === 0 ? (
          <p className="text-gray-600 text-sm">No comments yet.</p>
        ) : (
          <ul className="space-y-3">
            {comments.map((c) => (
              <li key={c.id} className="border rounded-lg p-3 bg-white">
                <div className="text-xs text-gray-500 mb-1">
                  {c.profiles?.username ?? "user"} ·{" "}
                  {new Date(c.created_at).toLocaleString()}
                </div>
                <div className="text-sm whitespace-pre-wrap">{c.body}</div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
