"use client";

import { useMemo, useRef, useState } from "react";
import Image from "next/image";
import { toPng } from "html-to-image";

type Props = {
  profile: {
    id: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
    created_at: string;
  };
  stats: { postsCount: number; commentsCount: number; karma: number };
};

const LEVELS = [
  { name: "Founder", threshold: 800, emoji: "👑", gradient: "from-amber-500 via-yellow-400 to-amber-600" },
  { name: "Senator", threshold: 300, emoji: "⚖️", gradient: "from-purple-600 via-fuchsia-500 to-purple-700" },
  { name: "Voice", threshold: 100, emoji: "🗣️", gradient: "from-sky-500 via-cyan-400 to-sky-700" },
  { name: "Contributor", threshold: 20, emoji: "📣", gradient: "from-emerald-500 via-teal-400 to-emerald-700" },
  { name: "Citizen", threshold: 0, emoji: "🏛️", gradient: "from-slate-500 via-gray-400 to-slate-700" },
] as const;

function levelFor(points: number) {
  return LEVELS.find((l) => points >= l.threshold) ?? LEVELS[LEVELS.length - 1];
}

function memberNumber(id: string) {
  const clean = id.replace(/-/g, "").toUpperCase();
  return `${clean.slice(0, 4)}-${clean.slice(4, 8)}`;
}

function ShareIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M12 3v12" />
      <path d="M8 7l4-4 4 4" />
      <path d="M4 14v4a2 2 0 002 2h12a2 2 0 002-2v-4" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

function ImageIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="M21 15l-5-5L5 21" />
    </svg>
  );
}

function SpinnerIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth={2}
        strokeOpacity={0.25}
      />
      <path d="M21 12a9 9 0 00-9-9" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
    </svg>
  );
}

export default function RepublicCard({ profile, stats }: Props) {
  const [flipped, setFlipped] = useState(false);
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [imageSaved, setImageSaved] = useState(false);
  const frontRef = useRef<HTMLDivElement>(null);

  async function handleShare(e: React.MouseEvent) {
    e.stopPropagation();
    const url = `${window.location.origin}/profile/${profile.username}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: `@${profile.username} on SFERAT`, url });
      } catch {
        // anuluar nga vetë përdoruesi — s'ka nevojë për mesazh gabimi
      }
    } else {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  }

  async function handleShareImage(e: React.MouseEvent) {
    e.stopPropagation();
    if (!frontRef.current || exporting) return;

    setExporting(true);
    const wasFlipped = flipped;
    if (wasFlipped) {
      // karta duhet të shfaqë faqen e përparme (jo "Points breakdown") për imazhin e eksportuar —
      // presim të mbarojë animacioni i "flip"-it (500ms, i njëjtë me transition-duration) para kapjes.
      setFlipped(false);
      await new Promise((resolve) => setTimeout(resolve, 550));
    }

    try {
      const dataUrl = await toPng(frontRef.current, {
        pixelRatio: 3,
        cacheBust: true,
        filter: (node) => !(node instanceof HTMLElement && node.dataset.exportIgnore === "true"),
      });
      const fileName = `sferat-republic-card-${profile.username}.png`;

      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], fileName, { type: "image/png" });

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `@${profile.username}'s Republic Card`,
          text: "Check out my Republic Card on SFERAT",
        });
      } else {
        const link = document.createElement("a");
        link.href = dataUrl;
        link.download = fileName;
        link.click();
      }

      setImageSaved(true);
      setTimeout(() => setImageSaved(false), 1500);
    } catch {
      // anuluar nga vetë përdoruesi (share sheet), ose dështim gjenerimi — s'është kritike për alarm
    } finally {
      if (wasFlipped) setFlipped(true);
      setExporting(false);
    }
  }

  const points = useMemo(
    () => stats.karma + stats.postsCount * 5 + stats.commentsCount * 2,
    [stats]
  );
  const level = useMemo(() => levelFor(points), [points]);

  const nextLevel = useMemo(() => {
    const idx = LEVELS.findIndex((l) => l.name === level.name);
    return idx > 0 ? LEVELS[idx - 1] : null;
  }, [level]);

  const memberSince = new Date(profile.created_at).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="[perspective:1000px]">
      <div
        role="button"
        tabIndex={0}
        onClick={() => setFlipped((f) => !f)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setFlipped((f) => !f);
          }
        }}
        className="w-full text-left cursor-pointer"
        aria-label="Flip Republic Card"
      >
        <div
          className="relative w-full aspect-[1.586/1] transition-transform duration-500 [transform-style:preserve-3d]"
          style={{ transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)" }}
        >
          {/* Front */}
          <div
            ref={frontRef}
            className={`absolute inset-0 rounded-2xl p-4 text-white bg-gradient-to-br ${level.gradient} shadow-lg flex flex-col justify-between [backface-visibility:hidden]`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold tracking-wide opacity-90">SFERAT · REPUBLIC CARD</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  data-export-ignore="true"
                  onClick={handleShareImage}
                  disabled={exporting}
                  className="w-6 h-6 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors disabled:opacity-50"
                  aria-label={imageSaved ? "Image saved" : "Share as image"}
                  title={imageSaved ? "Saved!" : exporting ? "Generating…" : "Share as image"}
                >
                  {imageSaved ? (
                    <CheckIcon className="w-3.5 h-3.5" />
                  ) : exporting ? (
                    <SpinnerIcon className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <ImageIcon className="w-3.5 h-3.5" />
                  )}
                </button>
                <button
                  type="button"
                  data-export-ignore="true"
                  onClick={handleShare}
                  className="w-6 h-6 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
                  aria-label={copied ? "Link copied" : "Share Republic Card link"}
                  title={copied ? "Link copied!" : "Share link"}
                >
                  {copied ? <CheckIcon className="w-3.5 h-3.5" /> : <ShareIcon className="w-3.5 h-3.5" />}
                </button>
                <span className="text-lg">{level.emoji}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Image
                src={profile.avatar_url || "/default-avatar.png"}
                alt=""
                width={48}
                height={48}
                priority
                className="w-12 h-12 rounded-full object-cover border-2 border-white/70"
              />
              <div>
                <div className="font-semibold leading-tight">
                  {profile.display_name || profile.username}
                </div>
                <div className="text-xs opacity-90">@{profile.username}</div>
              </div>
            </div>

            <div className="flex items-end justify-between text-xs">
              <div>
                <div className="opacity-75">Citizen since</div>
                <div className="font-medium">{memberSince}</div>
              </div>
              <div className="text-right">
                <div className="opacity-75">Rank</div>
                <div className="font-semibold uppercase tracking-wide">{level.name}</div>
              </div>
            </div>

            <div className="text-[10px] tracking-widest opacity-70 font-mono">
              {memberNumber(profile.id)}
            </div>
          </div>

          {/* Back */}
          <div
            className={`absolute inset-0 rounded-2xl p-4 text-white bg-gradient-to-br ${level.gradient} shadow-lg flex flex-col justify-between [backface-visibility:hidden]`}
            style={{ transform: "rotateY(180deg)" }}
          >
            <div className="text-xs font-semibold tracking-wide opacity-90">POINTS BREAKDOWN</div>

            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="opacity-80">Karma</span>
                <span className="font-medium">{stats.karma}</span>
              </div>
              <div className="flex justify-between">
                <span className="opacity-80">Posts × 5</span>
                <span className="font-medium">{stats.postsCount * 5}</span>
              </div>
              <div className="flex justify-between">
                <span className="opacity-80">Comments × 2</span>
                <span className="font-medium">{stats.commentsCount * 2}</span>
              </div>
              <div className="flex justify-between border-t border-white/30 pt-1 mt-1">
                <span className="font-semibold">Total</span>
                <span className="font-semibold">{points} pts</span>
              </div>
            </div>

            <div className="rounded-lg bg-white/15 px-2 py-1.5 text-[11px]">
              {nextLevel
                ? `${nextLevel.threshold - points} pts to ${nextLevel.name} ${nextLevel.emoji}`
                : "Highest rank reached 🎉"}
            </div>

            <div className="text-[10px] tracking-wide opacity-75">
              🔒 Rewards for top ranks — Coming soon
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
