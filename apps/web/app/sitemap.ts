import { supa } from "@/lib/supabase";

export default async function sitemap() {
  const base = "https://sferat.com";

  const { data: republics } = await supa.from("republics").select("slug");
  const reps = (republics ?? []).map((r) => ({
    url: `${base}/republic/${r.slug}`,
    lastModified: new Date(),
  }));

  // Postimet e skaduara shënohen vetëm status="expired" (nuk fshihen), kështu
  // që sitemap-i përfshin vetëm ato aktive — përmbajtja e skaduar nuk ka
  // kuptim të indeksohet në Google.
  const { data: posts } = await supa
    .from("posts")
    .select("id, created_at")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1000);
  const postUrls = (posts ?? []).map((p) => ({
    url: `${base}/post/${p.id}`,
    lastModified: new Date(p.created_at),
  }));

  const { data: profiles } = await supa
    .from("profiles")
    .select("username, created_at")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(1000);
  const profileUrls = (profiles ?? []).map((p) => ({
    url: `${base}/profile/${p.username}`,
    lastModified: new Date(p.created_at),
  }));

  return [
    { url: base, lastModified: new Date() },
    ...reps,
    ...postUrls,
    ...profileUrls,
  ];
}
