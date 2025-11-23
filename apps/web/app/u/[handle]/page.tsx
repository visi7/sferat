"use client";

import { useEffect, useState } from "react";
import { supa } from "@/lib/supabase";
import ProfileHeader from "@/components/ProfileHeader";

type Profile = {
  id: string;
  username: string;              // string (jo | null), që t’i pëlqejë ProfileHeader
  display_name: string | null;   // KJO kërkohet nga ProfileHeader
  bio: string | null;
  avatar_url: string | null;
};

export default function UserProfilePage({ params }: { params: { handle: string } }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supa
        .from("profiles")
        // merr edhe display_name; nëse s’e ke në DB, kemi fallback poshtë nga full_name
        .select("id, username, display_name, full_name, bio, avatar_url")
        .eq("username", params.handle)      // nëse përdor 'handle' si kolonë, ktheje në .eq("handle", params.handle)
        .single();

      if (error || !data) {
        setError(error?.message ?? "not found");
        return;
      }

      // normalizim për të kënaqur tipat që pret ProfileHeader
      const normalized: Profile = {
        id: data.id,
        username: data.username ?? "",                               // s’lejojmë null
        display_name: data.display_name ?? data.full_name ?? null,   // fallback nga full_name nëse s’ke display_name
        bio: data.bio ?? null,
        avatar_url: data.avatar_url ?? null,
      };

      setProfile(normalized);
    })();
  }, [params.handle]);

  if (error) return <main className="mx-auto max-w-3xl p-6">Profile not found.</main>;
  if (!profile) return <main className="mx-auto max-w-3xl p-6">Loading…</main>;

  return (
    <main className="mx-auto max-w-3xl p-6">
      <ProfileHeader profile={profile} />
    </main>
  );
}
