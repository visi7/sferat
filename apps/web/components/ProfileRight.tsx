"use client";

import { useState } from "react";
import { supa } from "@/lib/supabase";
import ProfileCredentialsCard from "./profile/ProfileCredentialsCard";
import ProfileTopicsCard from "./profile/ProfileTopicsCard";

// *** TIPI I RI ***
export type ProfileInfo = {
  id: string;
  username: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  created_at: string;           // data kur u krijua profili
  employment?: string | null;
  education?: string | null;
  location?: string | null;
  topics?: string[] | null;
};

type Props = {
  profile: ProfileInfo;
  isMe: boolean;
};
export default function ProfileRight({ profile, isMe }: { profile: any; isMe: boolean }) {



  // gjendja lokale
  
  const [employment, setEmployment] = useState<string | null>(
    profile.employment ?? null
  );
  const [education, setEducation] = useState<string | null>(
    profile.education ?? null
  );
  const [location, setLocation] = useState<string | null>(
    profile.location ?? null
  );
  const [topics, setTopics] = useState<string[]>(
    Array.isArray(profile.topics) ? profile.topics : []
  );
  const [saving, setSaving] = useState(false);

  async function updateProfile(patch: Partial<ProfileInfo>): Promise<void> {
    setSaving(true);
    const { error } = await supa
      .from("profiles")
      .update(patch)
      .eq("id", profile.id);
    setSaving(false);

    if (error) {
      alert(error.message);
      return;
    }
  }

  async function editEmployment() {
    const next =
      prompt("Add your employment (job / role):", employment ?? "") ?? "";
    const clean = next.trim() || null;
    await updateProfile({ employment: clean });
    setEmployment(clean);
  }

  async function editEducation() {
    const next =
      prompt("Add your education (school / degree):", education ?? "") ?? "";
    const clean = next.trim() || null;
    await updateProfile({ education: clean });
    setEducation(clean);
  }

  async function editLocation() {
    const next =
      prompt("Add your location (city / country):", location ?? "") ?? "";
    const clean = next.trim() || null;
    await updateProfile({ location: clean });
    setLocation(clean);
  }

  async function editTopics() {
    const current = topics.join(", ");
    const next =
      prompt(
        "Add topics you know about (comma separated):",
        current
      ) ?? "";
    const arr = next
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    await updateProfile({ topics: arr.length ? arr : null });
    setTopics(arr);
  }

  const joinedLabel = new Date(profile.created_at).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
  <div className="space-y-4">
    <ProfileCredentialsCard
      profile={profile}
      isMe={isMe}
      onUpdate={updateProfile}
    />
    <ProfileTopicsCard
      profile={profile}
      isMe={isMe}
      onUpdate={updateProfile}
    />
  </div>
);

}
