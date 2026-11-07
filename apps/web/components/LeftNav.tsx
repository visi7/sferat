"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { supa } from "@/lib/supabase";
import { TrophyIcon } from "@/components/Icons";

export default function LeftNav() {
  const [reps, setReps] = useState<{ id: string; slug: string; title: string }[]>([]);
  const [logged, setLogged] = useState(false);
  const [isMod, setIsMod] = useState(false);
  const [isGlobalAdmin, setIsGlobalAdmin] = useState(false);
  const [isManager, setIsManager] = useState(false);
  const [isDirector, setIsDirector] = useState(false);
  const [isMarketingMod, setIsMarketingMod] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supa
        .from("republics")
        .select("id,slug,title")
        .eq("is_active", true)
        .order("title");
      setReps(data ?? []);
    })();

    (async () => {
      const s = (await supa.auth.getSession()).data.session;
      const uid = s?.user?.id;
      setLogged(!!uid);
      if (!uid) return;

      const { data } = await supa
        .from("user_roles")
        .select("role,republic_id")
        .eq("user_id", uid)
        .in("role", ["admin", "director", "manager", "moderator", "assistant", "marketing"]);
      const roles = data ?? [];
      setIsMod(roles.some((r) => r.role !== "marketing"));
      setIsGlobalAdmin(roles.some((r) => r.role === "admin" && r.republic_id === null));
      setIsManager(roles.some((r) => r.role === "manager"));
      setIsDirector(roles.some((r) => r.role === "director"));
      setIsMarketingMod(roles.some((r) => r.role === "marketing"));
    })();
  }, []);

  async function signOut() {
    await supa.auth.signOut();
    window.location.href = "/";
  }

  return (
    <aside className="space-y-4">
      <section className="bg-white border rounded-xl p-3">
        <h3 className="text-sm font-semibold text-gray-500 mb-2">HOME</h3>
        <nav className="flex flex-col gap-1 text-sm">
          <Link href="/">Top (7 days)</Link>
          <Link href="/?tab=new">New</Link>
          <Link href="/search">Search</Link>
          <Link href="/saved">Saved</Link>
          <Link href="/leaderboard" className="flex items-center gap-1.5">
            <TrophyIcon className="w-4 h-4 text-gray-500" />
            Leaderboard
          </Link>
          <Link href="/notifications">Notifications</Link>
        </nav>
      </section>

      <section className="bg-white border rounded-xl p-3">
        <h3 className="text-sm font-semibold text-gray-500 mb-2">REPUBLICS</h3>
        <nav className="flex flex-col gap-1 text-sm">
          {reps.map((r) => (
            <Link key={r.id} href={`/republic/${r.slug}`} className="hover:underline">
              {r.title}
            </Link>
          ))}
        </nav>
      </section>

      <section className="bg-white border rounded-xl p-3">
        <h3 className="text-sm font-semibold text-gray-500 mb-2">AGORA</h3>
        <nav className="flex flex-col gap-1 text-sm">
          <Link href="/agora" className="hover:underline">Sponsored</Link>
        </nav>
      </section>

      <section className="bg-white border rounded-xl p-3">
        <h3 className="text-sm font-semibold text-gray-500 mb-2">ACCOUNT</h3>
        <nav className="flex flex-col gap-1 text-sm">
          {logged ? (
            <>
              {isMod && <Link href="/mod/panel">Moderator panel</Link>}
              {(isGlobalAdmin || isDirector || isManager) && <Link href="/mod/roles">Manage roles</Link>}
              {(isGlobalAdmin || isMarketingMod) && <Link href="/mod/agora">Manage Agora ads</Link>}
              <Link href="/settings">Settings</Link>
              <button onClick={signOut} className="text-left">Sign out</button>
            </>
          ) : (
            <>
              <Link href="/sign-in">Sign in</Link>
              <Link href="/sign-up">Create account</Link>
            </>
          )}
        </nav>
      </section>
    </aside>
  );
}
