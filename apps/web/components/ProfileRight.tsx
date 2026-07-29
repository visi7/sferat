"use client";

import { useState } from "react";
import { supa } from "@/lib/supabase";
import ProfileCredentialsCard from "./profile/ProfileCredentialsCard";
import ProfileTopicsCard from "./profile/ProfileTopicsCard";
import ProfileStatsCard from "./profile/ProfileStatsCard";
import RepublicCard from "./profile/RepublicCard";

export type ProfileInfo = {
  id: string;
  username: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  created_at: string;
  employment?: string | null;
  education?: string | null;
  location?: string | null;
  topics?: string[] | null;
};

type Stats = { postsCount: number; commentsCount: number; karma: number };

type Props = {
  profile: ProfileInfo;
  isMe: boolean;
  stats?: Stats;
  viewerLoggedIn: boolean;
};

export default function ProfileRight({ profile, isMe, stats, viewerLoggedIn }: Props) {
  const [, setSaving] = useState(false);

  async function updateProfile(patch: Partial<ProfileInfo>): Promise<void> {
    setSaving(true);
    const { error } = await supa.from("profiles").update(patch).eq("id", profile.id);
    setSaving(false);

    if (error) {
      alert(error.message);
      throw error;
    }
  }

  return (
    <div className="space-y-4">
      {viewerLoggedIn && stats && <RepublicCard profile={profile} stats={stats} />}
      {stats && (
        <ProfileStatsCard
          postsCount={stats.postsCount}
          commentsCount={stats.commentsCount}
          karma={stats.karma}
        />
      )}
      <ProfileCredentialsCard profile={profile} isMe={isMe} onUpdate={updateProfile} />
      <ProfileTopicsCard profile={profile} isMe={isMe} onUpdate={updateProfile} />
    </div>
  );
}
