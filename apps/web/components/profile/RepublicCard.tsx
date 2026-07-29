"use client";

import { useMemo, useState } from "react";

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

export default function RepublicCard({ profile, stats }: Props) {
  const [flipped, setFlipped] = useState(false);

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
      <button
        onClick={() => setFlipped((f) => !f)}
        className="w-full text-left"
        aria-label="Flip Republic Card"
      >
        <div
          className="relative w-full aspect-[1.586/1] transition-transform duration-500 [transform-style:preserve-3d]"
          style={{ transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)" }}
        >
          {/* Front */}
          <div
            className={`absolute inset-0 rounded-2xl p-4 text-white bg-gradient-to-br ${level.gradient} shadow-lg flex flex-col justify-between [backface-visibility:hidden]`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold tracking-wide opacity-90">SFERAT · REPUBLIC CARD</span>
              <span className="text-lg">{level.emoji}</span>
            </div>

            <div className="flex items-center gap-3">
              <img
                src={profile.avatar_url || "/default-avatar.png"}
                alt=""
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
      </button>
    </div>
  );
}
