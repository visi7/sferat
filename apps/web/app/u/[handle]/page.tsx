// @ts-nocheck
"use client";

import { useEffect, useState } from "react";
import { supa } from "@/lib/supabase";
import ProfileHeader from "@/components/ProfileHeader";
import { useParams } from "next/navigation";

type Profile = {
  id: string;
  username: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
};

export default function UserProfilePage() {
  const { handle } = useParams<{ handle: string }>();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!handle) return;

    (async () => {
      const { data, error } = await supa
        .from("profiles")
        .select("id, username, display_name, full_name, bio, avatar_url")
        .eq("username", handle)
        .single();

      if (error || !data) {
        setError(error?.message ?? "not found");
        return;
      }

      const normalized: Profile = {
        id: data.id,
        username: data.username ?? "",
        display_name: data.display_name ?? data.full_name ?? null,
        bio: data.bio ?? null,
        avatar_url: data.avatar_url ?? null,
      };

      setProfile(normalized);
    })();
  }, [handle]);

  if (error)
    return (
      <main className="mx-auto max-w-3xl p-6">
        Profile not found.
      </main>
    );

  if (!profile)
    return (
      <main className="mx-auto max-w-3xl p-6">
        Loading…
      </main>
    );

  return (
    <main className="mx-auto max-w-3xl p-6">
      <ProfileHeader profile={profile} />
    </main>
  );
}
