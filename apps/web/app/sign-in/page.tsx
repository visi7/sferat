"use client";
import { useEffect, useState } from "react";
import { supa } from "@/lib/supabase";
import Turnstile from "@/components/Turnstile";
import GoogleSignInButton from "@/components/GoogleSignInButton";
import Toast from "@/components/Toast";

export default function EmailSignIn() {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supa.auth.signInWithPassword({
      email,
      password: pw,
      options: captchaToken ? { captchaToken } : undefined,
    });
    if (error) {
      setLoading(false);
      return setErrorMsg(error.message);
    }
    window.location.href = "/";
  }

  return (
    <main className="relative min-h-screen bg-neutral-950 flex items-center justify-center p-6 overflow-hidden">
      {/* Sfond: rrjetë pikash e imët + dy "blob" ngjyra të animuara butësisht */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.15]"
        style={{
          backgroundImage: "radial-gradient(rgba(255,255,255,0.6) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[28rem] h-[28rem] rounded-full bg-amber-500/25 blur-3xl animate-blob-pulse" />
        <div
          className="absolute -bottom-40 -right-40 w-[28rem] h-[28rem] rounded-full bg-indigo-500/25 blur-3xl animate-blob-pulse"
          style={{ animationDelay: "3s" }}
        />
      </div>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-neutral-950" />

      <div
        className={`relative w-full max-w-sm transition-all duration-700 ${
          mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
        }`}
      >
        {/* Emblema */}
        <div className="flex justify-center mb-5">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 shadow-[0_0_40px_-8px_rgba(251,191,36,0.6)] flex items-center justify-center text-3xl">
            🏛️
          </div>
        </div>

        <div
          className="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl p-7"
          style={{ boxShadow: "0 20px 60px -20px rgba(0,0,0,0.6), inset 0 1px 0 0 rgba(255,255,255,0.06)" }}
        >
          <div className="text-center mb-6">
            <h1 className="text-2xl font-semibold text-white tracking-tight">Welcome back</h1>
            <p className="text-sm text-white/45 mt-1.5">Sign in to SFERAT — Republic of Free Thoughts</p>
          </div>

          <GoogleSignInButton dark />

          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 border-t border-white/10" />
            <span className="text-xs uppercase tracking-wider text-white/30">or</span>
            <div className="flex-1 border-t border-white/10" />
          </div>

          <form onSubmit={submit} className="flex flex-col gap-3.5">
            <div className="relative">
              <MailIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/35" />
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-white/10 bg-white/[0.03] text-white placeholder-white/35 rounded-xl pl-10 pr-3 py-2.5 text-sm focus:outline-none focus:border-amber-400/70 focus:bg-white/[0.06] transition-colors"
                required
              />
            </div>

            <div className="relative">
              <LockIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/35" />
              <input
                type={showPw ? "text" : "password"}
                placeholder="Password"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                className="w-full border border-white/10 bg-white/[0.03] text-white placeholder-white/35 rounded-xl pl-10 pr-10 py-2.5 text-sm focus:outline-none focus:border-amber-400/70 focus:bg-white/[0.06] transition-colors"
                required
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/35 hover:text-white/70 transition-colors p-1"
                aria-label={showPw ? "Hide password" : "Show password"}
                title={showPw ? "Hide password" : "Show password"}
              >
                {showPw ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
              </button>
            </div>

            <Turnstile onVerify={setCaptchaToken} theme="dark" />

            <button
              type="submit"
              disabled={loading || !captchaToken}
              className="mt-1 bg-gradient-to-r from-amber-400 to-amber-500 text-black font-semibold rounded-xl px-4 py-2.5 text-sm shadow-[0_8px_24px_-8px_rgba(251,191,36,0.5)] hover:from-amber-300 hover:to-amber-400 hover:shadow-[0_8px_28px_-6px_rgba(251,191,36,0.65)] transition-all disabled:opacity-40 disabled:shadow-none disabled:cursor-not-allowed"
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>

        <p className="mt-5 text-sm text-white/45 text-center">
          Don't have an account?{" "}
          <a href="/sign-up" className="text-amber-400 hover:text-amber-300 hover:underline">Create one</a>
          {" · "}
          <a href="/forgot-password" className="text-amber-400 hover:text-amber-300 hover:underline">Forgot password?</a>
        </p>
      </div>

      <Toast message={errorMsg} onClose={() => setErrorMsg(null)} />
    </main>
  );
}

function MailIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  );
}

function LockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="4" y="11" width="16" height="9" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

function EyeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M1.5 12S5 5 12 5s10.5 7 10.5 7-3.5 7-10.5 7S1.5 12 1.5 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 3l18 18" />
      <path d="M10.6 5.1A10.6 10.6 0 0 1 12 5c7 0 10.5 7 10.5 7a13.5 13.5 0 0 1-3.1 3.9M6.6 6.6C3.4 8.7 1.5 12 1.5 12s3.5 7 10.5 7a10.4 10.4 0 0 0 5.4-1.5" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    </svg>
  );
}
