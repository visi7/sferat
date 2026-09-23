"use client";

import GoogleSignInButton from "@/components/GoogleSignInButton";

type Props = {
  title: string;
  body: string;
  post_type?: "text" | "link" | "image" | "poll";
  url?: string | null;
  image_url?: string | null;
  onOpenImage?: () => void; // thirret kur klikon mbi figurën
  locked?: boolean; // vizitor i pa-kyçur -- postimet e gjata "turbullohen"
};

// Vetëm postimet e gjata (jo çdo mendim i shkurtër) fshihen pjesërisht --
// synon kuriozitetin real, jo të bezdisë dikë që lexon një koment 1-fjalie.
const GATE_THRESHOLD = 220;

function splitTeaser(text: string) {
  const snippet = text.slice(0, GATE_THRESHOLD);
  const match = snippet.match(/^[\s\S]*?[.!?](\s|$)/);
  const head = (match ? match[0] : text.slice(0, 120)).trim();
  return { head, rest: text.slice(head.length) };
}

export default function PostBody({
  title,
  body,
  post_type,
  url,
  image_url,
  onOpenImage,
  locked,
}: Props) {
  const shouldGate = !!locked && body.length > GATE_THRESHOLD;
  const { head, rest } = shouldGate ? splitTeaser(body) : { head: body, rest: "" };

  return (
    <>
      {/* title */}
      {title ? <h3 className="font-semibold text-lg mt-1">{title}</h3> : null}

      {/* body */}
      {body ? (
        <div className="mt-1">
          <div className="text-sm text-gray-700 whitespace-pre-wrap break-words">
            {head}
          </div>

          {shouldGate && (
            <div className="relative mt-1 rounded-md overflow-hidden">
              <div
                aria-hidden="true"
                className="text-sm text-gray-700 whitespace-pre-wrap break-words blur-[5px] select-none"
              >
                {rest}
              </div>
              <div className="absolute inset-0 flex flex-col items-center justify-end gap-2 pb-3 bg-gradient-to-t from-white via-white/85 to-transparent">
                <p className="text-xs text-gray-600 font-medium">🔒 Sign in to keep reading</p>
                <GoogleSignInButton />
              </div>
            </div>
          )}
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

