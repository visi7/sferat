// apps/web/app/profile/[username]/page.tsx
import type { Metadata } from "next";
import { supa } from "@/lib/supabase";
import ProfilePageClient from "./ProfilePageClient";

type Props = { params: Promise<{ username: string }> };

// Faqja ishte krejt "use client" — Next.js s'lejon export metadata nga
// komponentë client, kështu që çdo profil ndahej të njëjtin titull/
// përshkrim gjenerik të sajtit te Google. Kjo e ndan në wrapper server
// (vetëm për metadata) + komponenti ekzistues client
// (ProfilePageClient.tsx, lexon username-in vetë nga useParams), pa
// ndryshuar sjelljen e faqes.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  const { data: profile } = await supa
    .from("profiles")
    .select("username,display_name,bio")
    .eq("username", username)
    .maybeSingle();

  if (!profile) {
    return { title: "Profile not found — SFERAT" };
  }

  const name = profile.display_name || profile.username;
  const description = profile.bio?.slice(0, 160) || `@${profile.username} on SFERAT.`;

  return {
    title: `${name} (@${profile.username}) — SFERAT`,
    description,
    openGraph: { title: `${name} (@${profile.username})`, description, type: "profile" },
  };
}

export default function ProfilePage(_props: Props) {
  return <ProfilePageClient />;
}
