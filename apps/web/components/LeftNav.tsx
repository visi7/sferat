"use client";
import { useEffect, useState } from "react";
import { supa } from "@/lib/supabase";

export default function LeftNav() {
  const [reps, setReps] = useState<{ id: string; slug: string; title: string }[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supa
        .from("republics")
        .select("id,slug,title")
        .eq("is_active", true)
        .order("title");
      setReps(data ?? []);
    })();
  }, []);

  return (
    <aside className="space-y-4">
      <section className="bg-white border rounded-xl p-3">
        <h3 className="text-sm font-semibold text-gray-500 mb-2">HOME</h3>
        <nav className="flex flex-col gap-1 text-sm">
          <a href="/">Top (7 days)</a>
          <a href="/?tab=new">New</a>
          <a href="/saved">Saved</a>
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
    </aside>
  );
}
