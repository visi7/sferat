// apps/web/app/post/[id]/page.tsx
import type { Metadata } from "next";
import { supa } from "@/lib/supabase";
import PostPageClient from "./PostPageClient";

type Props = { params: Promise<{ id: string }> };

// Faqja ishte krejt "use client" — Next.js s'lejon export metadata nga
// komponentë client, kështu që çdo postim ndahej të njëjtin titull/
// përshkrim gjenerik të sajtit te Google dhe kur linku ndahej në rrjete
// sociale. Kjo e ndan në wrapper server (vetëm për metadata) + komponenti
// ekzistues client (PostPageClient.tsx), pa ndryshuar sjelljen e faqes.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const { data: post } = await supa
    .from("posts")
    .select("title,body")
    .eq("id", id)
    .maybeSingle();

  if (!post) {
    return { title: "Post not found — SFERAT" };
  }

  const title = post.title?.trim() || post.body?.slice(0, 70) || "A post on SFERAT";
  const description = post.body?.slice(0, 160) || "Join the discussion on SFERAT.";

  return {
    title: `${title} — SFERAT`,
    description,
    openGraph: { title, description, type: "article" },
  };
}

export default function PostPage({ params }: Props) {
  return <PostPageClient params={params} />;
}
