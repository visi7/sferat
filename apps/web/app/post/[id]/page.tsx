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

export default function PostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);

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
    <main className="p-6">
      <PostCard {...post} onChanged={() => {}} />
    </main>
  );
}
