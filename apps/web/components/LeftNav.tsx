"use client";
import { useEffect, useState } from "react";
import { supa } from "@/lib/supabase";

export default function LeftNav() {
  const [reps, setReps] = useState<{ id: string; slug: string; title: string }[]>([]);
  const [logged, setLogged] = useState(false);
  const [isMod, setIsMod] = useState(false);
  const [isGlobalAdmin, setIsGlobalAdmin] = useState(false);
  const [isManager, setIsManager] = useState(false);

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
        .in("role", ["admin", "manager", "moderator", "assistant"]);
      setIsMod((data?.length ?? 0) > 0);
      setIsGlobalAdmin((data ?? []).some((r) => r.role === "admin" && r.republic_id === null));
      setIsManager((data ?? []).some((r) => r.role === "manager"));
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
          <a href="/">Top (7 days)</a>
          <a href="/?tab=new">New</a>
          <a href="/search">Search</a>
          <a href="/saved">Saved</a>
          <a href="/notifications">Notifications</a>
        </nav>
      </section>

      <section className="bg-white border rounded-xl p-3">
        <h3 className="text-sm font-semibold text-gray-500 mb-2">REPUBLICS</h3>
        <nav className="flex flex-col gap-1 text-sm">
          {reps.map((r) => (
            <a key={r.id} href={`/republic/${r.slug}`} className="hover:underline">
              {r.title}
            </a>
          ))}
        </nav>
      </section>

      <section className="bg-white border rounded-xl p-3">
        <h3 className="text-sm font-semibold text-gray-500 mb-2">AGORA</h3>
        <nav className="flex flex-col gap-1 text-sm">
          <a href="/agora" className="hover:underline">Sponsored</a>
        </nav>
      </section>

      <section className="bg-white border rounded-xl p-3">
        <h3 className="text-sm font-semibold text-gray-500 mb-2">ACCOUNT</h3>
        <nav className="flex flex-col gap-1 text-sm">
          {logged ? (
            <>
              {isMod && <a href="/mod/panel">Moderator panel</a>}
              {(isGlobalAdmin || isManager) && <a href="/mod/roles">Manage roles</a>}
              {isGlobalAdmin && <a href="/mod/agora">Manage Agora ads</a>}
              <a href="/settings">Settings</a>
              <button onClick={signOut} className="text-left">Sign out</button>
            </>
          ) : (
            <>
              <a href="/sign-in">Sign in</a>
              <a href="/sign-up">Create account</a>
            </>
          )}
        </nav>
      </section>
    </aside>
  );
}
