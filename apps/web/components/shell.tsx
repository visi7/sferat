// apps/web/components/Shell.tsx
"use client";
import NotificationBell from "@/components/NotificationBell";
import { ReactNode, useEffect, useState } from "react";
import { supa } from "@/lib/supabase";

export default function Shell({ left, children, right }: { left: ReactNode; children: ReactNode; right: ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div>
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b bg-white/70 backdrop-blur">
        <div className="mx-auto max-w-6xl px-3 sm:px-4 h-12 flex items-center gap-2 sm:gap-3">
          <button
            className="md:hidden -ml-1 w-9 h-9 grid place-items-center rounded hover:bg-gray-100 text-lg"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
          >
            ☰
          </button>
          <a href="/" className="font-bold shrink-0">SFERAT</a>
          <div className="flex-1" />
          <TopNav />
        </div>
      </header>

      {/* Mobile drawer (Republics, Home tabs, account, + përmbajtja e kolonës së djathtë) */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDrawerOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-72 max-w-[85%] bg-gray-50 overflow-y-auto p-3 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <span className="font-bold">SFERAT</span>
              <button
                className="w-8 h-8 grid place-items-center rounded hover:bg-gray-200"
                onClick={() => setDrawerOpen(false)}
                aria-label="Close menu"
              >
                ✕
              </button>
            </div>
            <div className="space-y-4">
              {left}
              {right}
            </div>
          </div>
        </div>
      )}

      {/* 3-columns (telefon: vetëm main, sidebar-et janë te drawer-i ☰; tablet+: 2-3 kolona) */}
      <div className="mx-auto max-w-6xl px-3 sm:px-4 grid grid-cols-1 md:grid-cols-[260px_minmax(0,1fr)_300px] gap-4 mt-4">
        <aside className="hidden md:block">{left}</aside>
        <main className="min-w-0">{children}</main>
        <aside className="hidden md:block">{right}</aside>
      </div>

      <footer className="mt-10 border-t bg-white/50">
        <div className="mx-auto max-w-6xl px-3 sm:px-4 py-6 text-center text-xs text-gray-500 space-y-1">
          <p className="italic">"Ideas deserve a Republic."</p>
          <p>© {new Date().getFullYear()} SFERAT — Republika e Mendimeve të Lira</p>
        </div>
      </footer>
    </div>
  );
}

function TopNav() {
  const [profileHref, setProfileHref] = useState<string>("/settings/profile");
  const [logged, setLogged] = useState(false);

  useEffect(() => {
    (async () => {
      const s = (await supa.auth.getSession()).data.session;
      setLogged(!!s);
      if (!s) return;

      const { data: me } = await supa
        .from("profiles")
        .select("username")
        .eq("id", s.user.id)
        .single();
      if (me?.username) setProfileHref(`/profile/${me.username}`);
    })();
  }, []);

  return (
    <nav className="flex items-center gap-1 sm:gap-2">
      <a
        href="/search"
        className="w-9 h-9 grid place-items-center rounded hover:bg-gray-100"
        title="Search"
        aria-label="Search"
      >
        🔍
      </a>

      {logged ? (
        <>
          <NotificationBell />
          <a
            href={profileHref}
            className="w-9 h-9 grid place-items-center rounded hover:bg-gray-100"
            title="Profile"
            aria-label="Profile"
          >
            👤
          </a>
        </>
      ) : (
        <>
          <a className="hover:underline text-sm px-2" href="/sign-in">Sign in</a>
          <a className="hover:underline text-sm px-2 hidden sm:inline" href="/sign-up">Create account</a>
        </>
      )}
    </nav>
  );
}
