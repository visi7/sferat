"use client";

import React from "react";

type Props = {
  src?: string | null;
  alt?: string;
  size?: number;          // p.sh. 20, 24, 32, 96...
  className?: string;
};

export default function Avatar({ src, alt = "avatar", size = 32, className = "" }: Props) {
  const [err, setErr] = React.useState(false);
  const url = !err && src ? src : "/default-avatar.png";

  return (
    <img
      src={url}
      alt={alt}
      width={size}
      height={size}
      className={`rounded-full object-cover ${className}`}
      onError={() => setErr(true)}
    />
  );
}
