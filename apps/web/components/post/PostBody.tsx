"use client";

type Props = {
  title: string;
  body: string;
  post_type?: "text" | "link" | "image" | "poll";
  url?: string | null;
  image_url?: string | null;
  onOpenImage?: () => void; // thirret kur klikon mbi figurën
};

export default function PostBody({
  title,
  body,
  post_type,
  url,
  image_url,
  onOpenImage,
}: Props) {
  return (
    <>
      {/* title */}
      {title ? <h3 className="font-semibold text-lg mt-1">{title}</h3> : null}

      {/* body */}
      {body ? (
        <div className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">
          {body}
        </div>
      ) : null}

      {/* link preview */}
      {post_type === "link" && url ? (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="block border rounded-md p-3 mt-2 hover:bg-gray-50 text-blue-600 truncate"
        >
          🔗 {url}
        </a>
      ) : null}

      {/* image */}
      {post_type === "image" && image_url ? (
        <img
          src={image_url}
          alt={title || "image"}
          loading="lazy"
          className="rounded-lg mt-2 max-h-[400px] w-auto object-contain border cursor-pointer hover:opacity-90 transition"
          onClick={onOpenImage}
        />
      ) : null}
    </>
  );
}
