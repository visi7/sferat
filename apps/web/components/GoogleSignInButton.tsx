"use client";

import { supa } from "@/lib/supabase";

export default function GoogleSignInButton({ disabled, dark }: { disabled?: boolean; dark?: boolean }) {
  async function signInWithGoogle() {
    await supa.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
  }

  return (
    <button
      type="button"
      onClick={signInWithGoogle}
      disabled={disabled}
      className={`flex items-center justify-center gap-2 rounded px-4 py-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed ${
        dark
          ? "border border-white/15 bg-white/5 text-white hover:bg-white/10"
          : "border text-gray-700 hover:bg-gray-50"
      }`}
    >
      <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
        <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.71v2.26h2.9c1.7-1.57 2.7-3.88 2.7-6.61z" />
        <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.19l-2.9-2.26c-.81.54-1.85.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.98v2.33A9 9 0 0 0 9 18z" />
        <path fill="#FBBC05" d="M3.95 10.69A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.16.28-1.69V4.98H.98A9 9 0 0 0 0 9c0 1.45.35 2.83.98 4.02l2.97-2.33z" />
        <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .98 4.98l2.97 2.33C4.66 5.17 6.65 3.58 9 3.58z" />
      </svg>
      Continue with Google
    </button>
  );
}
