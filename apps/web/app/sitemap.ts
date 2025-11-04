import { supa } from "@/lib/supabase";
export default async function sitemap() {
  const base = "https://sferat.app";
  const { data: republics } = await supa.from("republics").select("slug");
  const reps = (republics ?? []).map(r => ({ url: `${base}/republic/${r.slug}`, lastModified: new Date() }));
  return [
    { url: base, lastModified: new Date() },
    ...reps,
  ];
}
