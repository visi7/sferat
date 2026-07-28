"use client";

import { useEffect, useState } from "react";
import { supa } from "@/lib/supabase";
import Shell from "@/components/shell";
import LeftNav from "@/components/LeftNav";
import RightAside from "@/components/RightAside";
import PostCard from "@/components/postCard";

type Post = {
  id: string;
  title: string;
  body: string;
  republic_id: string;
  author_id: string;
  score: number;
  created_at: string;
  post_type?: "text" | "link" | "image" | "poll";
  url?: string | null;
  image_url?: string | null;
};

type Republic = { id: string; slug: string; title: string };
type Profile = { id: string; username: string; display_name: string | null; avatar_url: string | null };

// Postgrest .or() reserves , ( ) as syntax — strip them from user input before building filters.
function sanitizeForFilter(q: string) {
  return q.replace(/[,()%]/g, " ").trim();
}

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [republics, setRepublics] = useState<Republic[]>([]);
  const [people, setPeople] = useState<Profile[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [repMap, setRepMap] = useState<Record<string, string>>({});

  useEffect(() => {
    const term = sanitizeForFilter(query);
    if (term.length < 2) {
      setSearched(false);
      setRepublics([]);
      setPeople([]);
      setPosts([]);
      return;
    }

    const handle = setTimeout(async () => {
      setLoading(true);
      const like = `%${term}%`;

      const [repsRes, peopleRes, postsRes] = await Promise.all([
        supa
          .from("republics")
          .select("id,slug,title")
          .eq("is_active", true)
          .ilike("title", like)
          .limit(5),
        supa
          .from("profiles")
          .select("id,username,display_name,avatar_url")
          .or(`username.ilike.${like},display_name.ilike.${like}`)
          .limit(5),
        supa
          .from("posts")
          .select("id,title,body,republic_id,author_id,score,created_at,post_type,url,image_url")
          .eq("status", "active")
          .or(`title.ilike.${like},body.ilike.${like}`)
          .order("created_at", { ascending: false })
          .limit(30),
      ]);

      setRepublics(repsRes.data ?? []);
      setPeople(peopleRes.data ?? []);
      setPosts(postsRes.data ?? []);

      // Resolve republic titles for the matched posts (for PostCard's republicTitle prop)
      const repIds = Array.from(new Set((postsRes.data ?? []).map((p) => p.republic_id)));
      if (repIds.length) {
        const { data: repsForPosts } = await supa
          .from("republics")
          .select("id,title")
          .in("id", repIds);
        const map: Record<string, string> = {};
        for (const r of repsForPosts ?? []) map[r.id] = r.title;
        setRepMap(map);
      } else {
        setRepMap({});
      }

      setSearched(true);
      setLoading(false);
    }, 300);

    return () => clearTimeout(handle);
  }, [query]);

  const nothingFound =
    searched && !loading && republics.length === 0 && people.length === 0 && posts.length === 0;

  return (
    <Shell left={<LeftNav />} right={<RightAside />}>
      <div className="mb-4">
        <input
          autoFocus
          className="w-full border rounded-xl px-4 py-3 text-sm"
          placeholder="Kërko postime, republika, ose përdorues…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {loading && <p className="text-gray-500 text-sm">Duke kërkuar…</p>}

      {!loading && !searched && (
        <p className="text-gray-400 text-sm">Shkruaj të paktën 2 karaktere për të filluar kërkimin.</p>
      )}

      {nothingFound && <p className="text-gray-600 text-sm">Asnjë rezultat për "{query}".</p>}

      {republics.length > 0 && (
        <section className="mb-4">
          <h2 className="text-xs uppercase tracking-wide text-gray-500 mb-2">Republika</h2>
          <div className="flex flex-wrap gap-2">
            {republics.map((r) => (
              <a
                key={r.id}
                href={`/republic/${r.slug}`}
                className="px-3 py-1.5 text-sm rounded-full border bg-white hover:bg-gray-50"
              >
                {r.title}
              </a>
            ))}
          </div>
        </section>
      )}

      {people.length > 0 && (
        <section className="mb-4">
          <h2 className="text-xs uppercase tracking-wide text-gray-500 mb-2">Përdorues</h2>
          <div className="flex flex-col gap-1">
            {people.map((p) => (
              <a
                key={p.id}
                href={`/profile/${p.username}`}
                className="px-3 py-2 text-sm rounded-lg border bg-white hover:bg-gray-50"
              >
                @{p.username} {p.display_name ? `· ${p.display_name}` : ""}
              </a>
            ))}
          </div>
        </section>
      )}

      {posts.length > 0 && (
        <section>
          <h2 className="text-xs uppercase tracking-wide text-gray-500 mb-2">Postime</h2>
          <div className="space-y-3">
            {posts.map((p) => (
              <PostCard key={p.id} {...p} republicTitle={repMap[p.republic_id]} />
            ))}
          </div>
        </section>
      )}
    </Shell>
  );
}
