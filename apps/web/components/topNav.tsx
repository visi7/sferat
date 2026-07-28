"use client";

import { useEffect, useState } from "react";
import { supa } from "@/lib/supabase";
import dynamic from "next/dynamic";

const NotificationBell = dynamic(() => import("@/components/NotificationBell"), { ssr: false });

export default function TopNav() {
  const [isMod, setIsMod] = useState(false);
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const s = (await supa.auth.getSession()).data.session;
      const uid = s?.user?.id;
      if (!uid) {
        setIsMod(false);
        setUsername(null);
        return;
      }

      const { data, error } = await supa
        .from("user_roles")
        .select("role")
        .eq("user_id", uid)
        .in("role", ["admin", "moderator"])
        .limit(1);

      setIsMod(!error && (data?.length ?? 0) > 0);

      const { data: profile } = await supa
        .from("profiles")
        .select("username")
        .eq("id", uid)
        .single();

      setUsername(profile?.username ?? null);
    })();
  }, []);

  return (
    <nav className="flex items-center gap-4">
      <a href="/">Home</a>
      <a href="/search">Search</a>
      <a href="/saved">Saved</a>
      <a href="/notifications">Notifications</a>
      <a href={username ? `/profile/${username}` : "/sign-in"}>Profile</a>
      {isMod && <a href="/mod/panel">Mod</a>}

      {/* vendose zilen në skajin e djathtë */}
      <div className="ml-auto">
        <NotificationBell />
      </div>
    </nav>
  );
}
