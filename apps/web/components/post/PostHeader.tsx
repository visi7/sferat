// apps/web/components/post/PostHeader.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
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
      {/* avatar + username (gjithmonë nga fetch-i i vet-mjaftueshëm `author`) */}
      <Link
        href={author?.username ? `/profile/${author.username}` : "#"}
        className="flex items-center gap-2 hover:underline"
      >
        <Image
          src={author?.avatar_url || p.profiles?.avatar_url || "/default-avatar.png"}
          width={32}
          height={32}
          className="w-8 h-8 rounded-full object-cover"
          alt=""
        />
        <div className="text-sm text-gray-600">
          @{author?.username ?? p.profiles?.username ?? author?.id?.slice(0, 8) ?? "user"}
        </div>
      </Link>

      {/* Republic · Author · Follow */}
      <div className="text-xs text-gray-500 flex items-center gap-2 flex-wrap mt-1">
        <span>{p.republicTitle ?? "Republic"}</span>
        <span>•</span>

        {author ? (
          <Link className="hover:underline" href={`/profile/${author.username ?? author.id}`}>
            {author.display_name ?? `@${author.username ?? author.id.slice(0, 8)}`}
          </Link>
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
