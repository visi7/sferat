"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supa } from "@/lib/supabase";
import { UserIcon, XIcon } from "@/components/Icons";
import { ListSkeleton } from "@/components/Skeleton";
import EmptyState from "@/components/EmptyState";

type Person = { id: string; username: string; display_name: string | null; avatar_url: string | null };

type Props = {
  userId: string;
  kind: "followers" | "following";
  onClose: () => void;
};

export default function FollowListModal({ userId, kind, onClose }: Props) {
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const query =
        kind === "followers"
          ? supa
              .from("follows_users")
              .select("profiles:profiles!follows_users_follower_id_fkey(id,username,display_name,avatar_url)")
              .eq("followed_user_id", userId)
          : supa
              .from("follows_users")
              .select("profiles:profiles!follows_users_followed_user_id_fkey(id,username,display_name,avatar_url)")
              .eq("follower_id", userId);

      const { data, error } = await query.limit(200);
      if (error) console.error("[FollowListModal]", error);
      if (cancelled) return;
      setPeople(((data ?? []) as any[]).map((row) => row.profiles).filter(Boolean));
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, kind]);

  return (
    <div className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="w-full max-w-sm bg-white rounded-xl border shadow-lg max-h-[70vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
          <h3 className="text-sm font-semibold">{kind === "followers" ? "Followers" : "Following"}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700" aria-label="Close">
            <XIcon className="w-4 h-4" />
          </button>
        </div>
        <div className="overflow-y-auto p-3">
          {loading ? (
            <ListSkeleton count={6} />
          ) : people.length === 0 ? (
            <EmptyState
              icon={UserIcon}
              title={kind === "followers" ? "No followers yet" : "Not following anyone yet"}
              compact
            />
          ) : (
            <ul className="space-y-1">
              {people.map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/profile/${p.username}`}
                    onClick={onClose}
                    className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50"
                  >
                    <img
                      src={p.avatar_url || "/default-avatar.png"}
                      alt=""
                      className="w-8 h-8 rounded-full object-cover"
                    />
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{p.display_name || p.username}</div>
                      <div className="text-xs text-gray-500 truncate">@{p.username}</div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
