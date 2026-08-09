"use client";

import { useEffect, useState } from "react";
import { supa } from "@/lib/supabase";
import Turnstile from "@/components/Turnstile";
import GoogleSignInButton from "@/components/GoogleSignInButton";
import Toast from "@/components/Toast";
import { MailIcon, LockIcon, EyeIcon, EyeOffIcon } from "@/components/FormIcons";

export default function SignUpPage() {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!agreed) return;
    setErr(null);
    if (pw.length < 8) {
      setErr("Password must be at least 8 characters.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supa.auth.signUp({
        email,
        password: pw,
        options: captchaToken ? { captchaToken } : undefined,
        // nëse do redirect pas konfirmimit:
        // options: { emailRedirectTo: `${window.location.origin}` },
      });

      if (error) {
        setErr(error.message);
        return;
      }

      setSuccessMsg("Account created. Check your email to confirm it.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative min-h-screen bg-neutral-950 flex items-center justify-center p-6 overflow-hidden">
      {/* Sfond: rrjetë pikash e imët + dy "blob" ngjyra të animuara butësisht — njësoj si /sign-in */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.15]"
        style={{
          backgroundImage: "radial-gradient(rgba(255,255,255,0.6) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[28rem] h-[28rem] rounded-full bg-indigo-500/25 blur-3xl animate-blob-pulse" />
        <div
          className="absolute -bottom-40 -right-40 w-[28rem] h-[28rem] rounded-full bg-amber-500/25 blur-3xl animate-blob-pulse"
          style={{ animationDelay: "3s" }}
        />
      </div>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-neutral-950" />

      <div
        className={`relative w-full max-w-sm transition-all duration-700 ${
          mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
        }`}
      >
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
            <h1 className="text-2xl font-semibold text-white tracking-tight">Create your account</h1>
            <p className="text-sm text-white/45 mt-1.5">Join SFERAT — Republic of Free Thoughts</p>
          </div>

          <label className="flex items-start gap-2 text-xs text-white/60 cursor-pointer mb-4">
            <input
              type="checkbox"
              className="mt-0.5 accent-amber-500"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
            />
            <span>
              I agree to the{" "}
              <a href="/terms" target="_blank" className="text-amber-400 hover:text-amber-300 hover:underline">
                Terms of Use
              </a>{" "}
              and{" "}
              <a href="/privacy" target="_blank" className="text-amber-400 hover:text-amber-300 hover:underline">
                Privacy Policy
              </a>
              .
            </span>
          </label>

          <GoogleSignInButton dark disabled={!agreed} />

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

            <div>
              <div className="relative">
                <LockIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/35" />
                <input
                  type={showPw ? "text" : "password"}
                  placeholder="Password"
                  value={pw}
                  onChange={(e) => setPw(e.target.value)}
                  className="w-full border border-white/10 bg-white/[0.03] text-white placeholder-white/35 rounded-xl pl-10 pr-10 py-2.5 text-sm focus:outline-none focus:border-amber-400/70 focus:bg-white/[0.06] transition-colors"
                  minLength={8}
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
              <p className="text-xs text-white/35 mt-1.5">At least 8 characters.</p>
            </div>

            {err && (
              <p className="rounded-md bg-red-500/10 border border-red-500/30 px-3 py-2 text-xs text-red-300">
                {err}
              </p>
            )}

            <Turnstile onVerify={setCaptchaToken} theme="dark" />

            <button
              type="submit"
              disabled={loading || !agreed || !captchaToken}
              className="mt-1 bg-gradient-to-r from-amber-400 to-amber-500 text-black font-semibold rounded-xl px-4 py-2.5 text-sm shadow-[0_8px_24px_-8px_rgba(251,191,36,0.5)] hover:from-amber-300 hover:to-amber-400 hover:shadow-[0_8px_28px_-6px_rgba(251,191,36,0.65)] transition-all disabled:opacity-40 disabled:shadow-none disabled:cursor-not-allowed"
            >
              {loading ? "Creating…" : "Create account"}
            </button>
          </form>
        </div>

        <p className="mt-5 text-sm text-white/45 text-center">
          Already have an account?{" "}
          <a href="/sign-in" className="text-amber-400 hover:text-amber-300 hover:underline">Sign in</a>
        </p>
      </div>

      <Toast message={successMsg} variant="success" onClose={() => setSuccessMsg(null)} />
    </main>
  );
}
