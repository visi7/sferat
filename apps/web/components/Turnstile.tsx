"use client";
import Script from "next/script";
import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: Record<string, unknown>) => string;
      reset: (widgetId?: string) => void;
    };
  }
}

type Props = {
  onVerify: (token: string) => void;
  theme?: "light" | "dark" | "auto";
};

// Cloudflare Turnstile — mbrojtje kundër bot-eve te sign-in/sign-up/forgot-password.
// Kërkon NEXT_PUBLIC_TURNSTILE_SITE_KEY si environment variable (publik, i sigurt
// të jetë në kodin klientit — çelësi privat "Secret Key" vendoset vetëm te Supabase).
export default function Turnstile({ onVerify, theme = "auto" }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);

  useEffect(() => {
    if (!scriptLoaded || !ref.current || !window.turnstile) return;
    window.turnstile.render(ref.current, {
      sitekey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
      callback: onVerify,
      theme,
    });
  }, [scriptLoaded, onVerify, theme]);

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js"
        strategy="afterInteractive"
        onLoad={() => setScriptLoaded(true)}
      />
      <div ref={ref} />
    </>
  );
}
