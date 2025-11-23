"use client";
import { useEffect, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { supa } from "@/lib/supabase";
import PostCard from "@/components/postCard";
type Section = { slug: string; label: string; position: number };

export default function RepublicPage() {
  const params = useParams();
  const slugStr = Array.isArray((params as any)?.slug)
    ? (params as any).slug[0]
    : (params as any)?.slug ?? "";

  const router = useRouter();
  const searchParams = useSearchParams();

  const [republic, setRepublic] = useState<any>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [activeTab, setActiveTab] = useState<string>("feed");
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // 1) Load republic + sections
  useEffect(() => {
    (async () => {
      if (!slugStr) return;
      setLoading(true);

      const { data: rep, error: repErr } = await supa
        .from("republics")
        .select("id, slug, title, description")
        .eq("slug", slugStr)
        .maybeSingle();

      if (repErr || !rep) {
        setRepublic(null);
        setSections([]);
        setPosts([]);
        setLoading(false);
        return;
      }
      setRepublic(rep);

      const { data: sects } = await supa
        .from("republic_sections")
        .select("slug,label,position")
        .eq("republic_id", rep.id)
        .order("position");
        

      const list = (sects ?? []) as Section[];
      setSections(list);
      // prefero ?tab= nga URL; ndryshe përdor të parin ose "feed"
      const qtab = searchParams.get("tab");
      setActiveTab(qtab ?? "feed");

      setLoading(false);
    })();
  }, [slugStr, searchParams]);

  // 2) Load posts for active tab
useEffect(() => {
 (async () => {
    if (!republic?.id) return;

    // baza: mer të gjitha postimet e kësaj republike
    let q = supa
  .from("posts")
  .select(`
  id, title, body, section, created_at, author_id, republic_id, score,
  image_url, post_type,
  profiles:profiles!posts_author_id_fkey ( id, username, avatar_url )
` )

  .eq("republic_id", republic.id)
  .order("created_at", { ascending: false });

if (activeTab !== "feed") q = q.eq("section", activeTab);


if (activeTab !== "feed") {
  q = q.eq("section", activeTab);
}

const { data, error } = await q;
if (error) {
  console.error("posts error", {
    message: error.message,
    details: (error as any)?.details,
    hint: (error as any)?.hint,
    code: (error as any)?.code,
  });
  setPosts([]);
  return;
}
setPosts(data ?? []);

  })();
}, [republic?.id, activeTab]);


  function goTab(slug: string) {
    setActiveTab(slug);
    router.push(`?tab=${slug}`);
  }

  if (loading) return <p className="text-gray-500 p-4">Loading republic…</p>;
  if (!republic) return <p className="text-red-500 p-4">Republic not found.</p>;

  return (
    <div className="p-4">
      {/* header + Home link */}
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-semibold">{republic.title}</h1>
        <a href="/" className="h-9 px-3 rounded border hover:bg-gray-50">Home</a>
      </div>
      <p className="text-gray-500 mb-4">{republic.description}</p>

      {/* Tabs */}
      <div className="flex gap-3 border-b mb-4 pb-2">
        {sections.map((s) => (
          <button
            key={s.slug}
            onClick={() => goTab(s.slug)}
            className={`px-3 py-1 rounded-md ${
              activeTab === s.slug ? "bg-gray-900 text-white" : "bg-gray-100 hover:bg-gray-200"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Posts */}
      <div className="space-y-3">
        {posts.length ? (
          posts.map((p) => <PostCard key={p.id} {...p} />)
        ) : (
          <p className="text-gray-400">No posts in this section yet.</p>
        )}
      </div>
    </div>
  );
}
