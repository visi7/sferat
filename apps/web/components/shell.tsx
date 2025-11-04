// apps/web/components/Shell.tsx
"use client";
import NotificationBell from "@/components/NotificationBell";
import { ReactNode, useEffect, useState } from "react";
import { supa } from "@/lib/supabase";
import { useIsModerator } from "@/components/hooks/useIsModerator";
export default function Shell({ left, children, right }: { left: ReactNode; children: ReactNode; right: ReactNode }) {
  return (
    <div>
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b bg-white/70 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 h-12 flex items-center justify-between">
          <a href="/" className="font-bold">SFERAT</a>
          <TopNav />
        </div>
      </header>

      {/* 3-columns */}
      <div className="mx-auto max-w-6xl px-4 grid grid-cols-1 md:grid-cols-[260px_minmax(0,1fr)_300px] gap-4 mt-4">
        <aside className="hidden md:block">{left}</aside>
        <main>{children}</main>
        <aside className="hidden lg:block">{right}</aside>
      </div>
    </div>
  );
}

function TopNav() {
  const [isMod, setIsMod] = useState(false);
  const [profileHref, setProfileHref] = useState<string>("/settings/profile");
  const [logged, setLogged] = useState(false);

useEffect(() => {
  (async () => {
    const s = (await supa.auth.getSession()).data.session;
    setLogged(!!s);
    if (!s) return;

    // marrim username për profilin
    const { data: me } = await supa
      .from("profiles")
      .select("username")
      .eq("id", s.user.id)
      .single();
    if (me?.username) setProfileHref(`/profile/${me.username}`);

    // kontrollojmë në tabelën user_roles nëse ka rol "moderator"
    const { data: role } = await supa
      .from("user_roles")
      .select("role")
      .eq("user_id", s.user.id)
      .is("republic_id", null) // null = moderator global
      .maybeSingle();

    setIsMod(role?.role === "moderator");
  })();
}, []);


  async function doSignOut() {
    await supa.auth.signOut();
    window.location.href = "/"; // kthehu në home pas dalje
  }

  return (
  <div className="flex items-center gap-4 w-full">
    <nav className="flex items-center gap-4 text-sm ml-auto">
      <a className="hover:underline" href="/">🏠︎</a>

      {/* ZILJA — dropdown me njoftime */}
      <NotificationBell />
      <a className="hover:underline" href={profileHref}>Profile</a>
      {isMod && <a className="hover:underline" href="/mod/panel">Mod</a>}
      {logged && (
        <button onClick={doSignOut} className="hover:underline">
          Sign out
        </button>
      )}
    </nav>
  </div>
);

}

