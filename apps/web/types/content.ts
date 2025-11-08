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
  inSavedList?: boolean;
  onRemovedFromSaved?: (postId: string) => void;
  author_id: string;
  score: number;
  created_at: string;
  status?: string;

  // Profili i autorit të POST-it (join nga posts_author_id_fkey)
  profiles?: { id: string; username: string; avatar_url: string | null };

  post_type?: "text" | "link" | "image" | "poll";
  url?: string | null;
  image_url?: string | null;

  republicTitle?: string;
  onChanged?: () => void;
};
