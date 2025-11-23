// apps/web/types/content.ts
export type Author = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

export type CommentRow = {
  author_id: string | null;
  id: string;
  body: string;
  created_at: string;
  // Profili i autorit të KOMENTIT
  profiles: { username: string | null; avatar_url: string | null };
};

export type PostCardProps = {
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

  // Këto dy fusha shpesh vijnë nga join-et
  profiles?: { id: string; username: string | null; avatar_url: string | null } | null;
  republicTitle?: string;

  inSavedList?: boolean;
  onRemovedFromSaved?: (postId: string) => void;
  onChanged?: () => void;
};

