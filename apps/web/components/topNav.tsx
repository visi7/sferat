"use client";

import { useEffect, useState } from "react";
import { supa } from "@/lib/supabase";
import NotificationBell from "@/components/NotificationBell"; // <- Kjo linjë ishte munguar!

export default function TopNav() {
  const [isMod, setIsMod] = useState(false);

  useEffect(() => {
    (async () => {
      const s = (await supa.auth.getSession()).data.session;
      const uid = s?.user?.id;
      if (!uid) return setIsMod(false);

      const { data, error } = await supa
        .from("user_roles")
        .select("role")
        .eq("user_id", uid)
        .in("role", ["admin", "moderator"])
        .limit(1);

      setIsMod(!error && (data?.length ?? 0) > 0);
    })();
  }, []);

  return (
    <nav className="flex items-center gap-4">
      <a href="/">Home</a>
      <a href="/saved">Saved</a>
      <a href="/notifications">Notifications</a>
      <a href="/profile">Profile</a>
      {isMod && <a href="/mod/panel">Mod</a>}

      {/* vendose zilen në skajin e djathtë */}
      <div className="ml-auto">
        <NotificationBell />
      </div>
    </nav>
  );
}
