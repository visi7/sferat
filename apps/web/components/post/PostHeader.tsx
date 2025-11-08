// apps/web/components/post/PostHeader.tsx
"use client";

import type { Author, PostCardProps } from "@/types/content";

type Props = {
  p: PostCardProps;
  author: Author | null;
  me: string | null;
  isFollowing: boolean;
  busy: boolean;
  onFollow(): void;
  onUnfollow(): void;
};

export default function PostHeader({
  p, author, me, isFollowing, busy, onFollow, onUnfollow,
}: Props) {
  return (
    <>
      {/* avatar + username (nga profiles e SELECT-it) */}
      <div className="flex items-center gap-2">
        <img
          src={p.profiles?.avatar_url || "/default-avatar.png"}
          className="w-8 h-8 rounded-full object-cover"
          alt=""
        />
        <div className="text-sm text-gray-600">@{p.profiles?.username}</div>
      </div>

      {/* Republic · Author · Follow */}
      <div className="text-xs text-gray-500 flex items-center gap-2 flex-wrap mt-1">
        <span>{p.republicTitle ?? "Republic"}</span>
        <span>•</span>

        {author ? (
          <a className="hover:underline" href={`/profile/${author.username ?? author.id}`}>
            {author.display_name ?? `@${author.username ?? author.id.slice(0, 8)}`}
          </a>
        ) : (
          <span>Author</span>
        )}

        {me !== p.author_id && (
          isFollowing ? (
            <button
              className="h-6 px-2 rounded border bg-gray-100 text-[11px]"
              disabled={busy}
              onClick={onUnfollow}
            >
              Following ✓
            </button>
          ) : (
            <button
              className="h-6 px-2 rounded border text-[11px]"
              disabled={busy}
              onClick={onFollow}
            >
              Follow
            </button>
          )
        )}
      </div>
    </>
  );
}
