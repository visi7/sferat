"use client";

import { useEffect, useState } from "react";
import { supa } from "@/lib/supabase";
import Shell from "@/components/shell";
import LeftNav from "@/components/LeftNav";
import RightAside from "@/components/RightAside";

type SponsoredPost = {
  id: string;
  sponsor_name: string;
  title: string;
  body: string | null;
  image_url: string | null;
  video_url: string | null;
  cta_label: string | null;
  cta_url: string | null;
  created_at: string;
};

type Arena = {
  id: string;
  sponsor_name: string;
  title: string;
  prize_description: string | null;
  post_id: string;
  ends_at: string;
  status: "open" | "awarded";
};

function daysUntil(iso: string): number {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
}

// YouTube/Vimeo linqe zakonshme -> URL embed-i; çdo gjë tjetër trajtohet si
// skedar video direkt (p.sh. .mp4 i hostuar diku), shfaqet me <video>.
function getEmbedUrl(url: string): string | null {
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{11})/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  const vimeo = url.match(/vimeo\.com\/(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  return null;
}

export default function AgoraPage() {
  const [ads, setAds] = useState<SponsoredPost[]>([]);
  const [arenas, setArenas] = useState<Arena[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [adsRes, arenasRes] = await Promise.all([
        supa
          .from("sponsored_posts")
          .select("id,sponsor_name,title,body,image_url,video_url,cta_label,cta_url,created_at")
          .eq("is_active", true)
          .order("created_at", { ascending: false }),
        supa
          .from("debate_arenas")
          .select("id,sponsor_name,title,prize_description,post_id,ends_at,status")
          .order("created_at", { ascending: false }),
      ]);
      setAds(adsRes.data ?? []);
      setArenas((arenasRes.data as Arena[]) ?? []);
      setLoading(false);
    })();
  }, []);

  return (
    <Shell left={<LeftNav />} right={<RightAside />}>
      <div className="max-w-2xl mx-auto mt-6 space-y-4">
        <div className="text-center space-y-2">
          <div className="text-3xl">🏛️</div>
          <h1 className="text-xl font-bold">Agora</h1>
          <p className="text-gray-600 text-sm max-w-md mx-auto">
            A separate space for sponsored content — clearly labeled, never disguised as an ordinary post.
          </p>
        </div>

        {!loading && arenas.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-gray-600">🏆 Debate Arenas</h2>
            {arenas.map((arena) => {
              const d = daysUntil(arena.ends_at);
              return (
                <a
                  key={arena.id}
                  href={`/post/${arena.post_id}`}
                  className="block bg-white border rounded-xl p-4 space-y-1 hover:border-amber-300"
                >
                  <div className="flex items-center gap-2 text-xs flex-wrap">
                    <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-medium">
                      Sponsored Debate
                    </span>
                    <span className="text-gray-500">{arena.sponsor_name}</span>
                    {arena.status === "awarded" ? (
                      <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">
                        🏆 Winner announced
                      </span>
                    ) : d < 0 ? (
                      <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium">
                        Voting closed
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">
                        Ends in {d}d
                      </span>
                    )}
                  </div>
                  <h3 className="font-semibold">{arena.title}</h3>
                  {arena.prize_description && (
                    <p className="text-sm text-gray-600">Prize: {arena.prize_description}</p>
                  )}
                  <p className="text-sm text-amber-700 font-medium">Join the debate →</p>
                </a>
              );
            })}
          </div>
        )}

        {loading ? (
          <p className="text-sm text-gray-500 text-center">Loading…</p>
        ) : ads.length === 0 && arenas.length === 0 ? (
          <p className="text-sm text-gray-500 text-center">Nothing sponsored right now.</p>
        ) : (
          ads.map((ad) => (
            <article key={ad.id} className="bg-white border rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2 text-xs">
                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-medium">
                  Sponsored
                </span>
                <span className="text-gray-500">{ad.sponsor_name}</span>
              </div>

              <h2 className="font-semibold text-lg">{ad.title}</h2>

              {ad.body && (
                <p className="text-sm text-gray-700 whitespace-pre-wrap break-words">{ad.body}</p>
              )}

              {ad.video_url ? (
                (() => {
                  const embed = getEmbedUrl(ad.video_url!);
                  return embed ? (
                    <iframe
                      src={embed}
                      className="w-full aspect-video rounded-lg border mt-1"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : (
                    <video controls className="w-full rounded-lg border mt-1" src={ad.video_url!} />
                  );
                })()
              ) : (
                ad.image_url && (
                  <img
                    src={ad.image_url}
                    alt={ad.title}
                    loading="lazy"
                    className="rounded-lg mt-1 max-h-[400px] w-auto object-contain border"
                  />
                )
              )}

              {ad.cta_label && ad.cta_url && (
                <a
                  href={ad.cta_url}
                  className="inline-block mt-1 px-4 py-2 rounded-md bg-black text-white text-sm hover:opacity-90"
                >
                  {ad.cta_label}
                </a>
              )}
            </article>
          ))
        )}
      </div>
    </Shell>
  );
}
