// apps/web/app/republic/[slug]/page.tsx
import type { Metadata } from "next";
import { supa } from "@/lib/supabase";
import RepublicPageClient from "./RepublicPageClient";

type Props = { params: Promise<{ slug: string }> };

// Faqja ishte krejt "use client" — Next.js s'lejon export metadata nga
// komponentë client, kështu që çdo Republikë ndahej të njëjtin titull/
// përshkrim gjenerik të sajtit te Google. Kjo e ndan në wrapper server
// (vetëm për metadata) + komponenti ekzistues client
// (RepublicPageClient.tsx, lexon slug-un vetë nga useParams), pa
// ndryshuar sjelljen e faqes.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { data: republic } = await supa
    .from("republics")
    .select("title,description")
    .eq("slug", slug)
    .maybeSingle();

  if (!republic) {
    return { title: "Republic not found — SFERAT" };
  }

  const description = republic.description?.slice(0, 160) || `Discuss ${republic.title} on SFERAT.`;

  return {
    title: `${republic.title} — SFERAT`,
    description,
    openGraph: { title: republic.title, description, type: "website" },
  };
}

export default function RepublicPage(_props: Props) {
  return <RepublicPageClient />;
}
