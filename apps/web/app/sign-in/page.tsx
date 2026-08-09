"use client";
import { useEffect, useState } from "react";
import { supa } from "@/lib/supabase";
import Turnstile from "@/components/Turnstile";
import GoogleSignInButton from "@/components/GoogleSignInButton";
import Toast from "@/components/Toast";

export default function EmailSignIn() {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [loading, setLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // Kartë e re "premium": errësirë + xham i turbullt + animacion i butë
  // hyrjeje, i propozuar nga videoja që ndave — inspirim, jo kopjim, e
  // adaptuar në identitetin e SFERAT-it (🏛️, ari në vend të bardhë/zi).
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
      {/* Sfond: dy "blob" të errët me ngjyra, të animuar butësisht */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-amber-500/20 blur-3xl animate-blob-pulse" />
        <div
          className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-indigo-500/20 blur-3xl animate-blob-pulse"
          style={{ animationDelay: "3s" }}
        />
      </div>

      <div
        className={`relative w-full max-w-sm rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl p-6 transition-all duration-700 ${
          mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        }`}
      >
        <div className="text-center mb-6">
          <div className="text-3xl mb-1">🏛️</div>
          <h1 className="text-xl font-semibold text-white">Welcome back</h1>
          <p className="text-sm text-white/50 mt-1">Sign in to SFERAT</p>
        </div>

        <GoogleSignInButton dark />

        <div className="flex items-center gap-3 my-4">
          <div className="flex-1 border-t border-white/10" />
          <span className="text-xs text-white/40">or</span>
          <div className="flex-1 border-t border-white/10" />
        </div>

        <form onSubmit={submit} className="flex flex-col gap-3">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="border border-white/10 bg-white/5 text-white placeholder-white/40 rounded-lg px-3 py-2 focus:outline-none focus:border-amber-400/60 transition-colors"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            className="border border-white/10 bg-white/5 text-white placeholder-white/40 rounded-lg px-3 py-2 focus:outline-none focus:border-amber-400/60 transition-colors"
            required
          />
          <Turnstile onVerify={setCaptchaToken} theme="dark" />

          <button
            type="submit"
            disabled={loading || !captchaToken}
            className="mt-2 bg-gradient-to-r from-amber-400 to-amber-500 text-black font-semibold rounded-lg px-4 py-2 hover:from-amber-300 hover:to-amber-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="mt-4 text-sm text-white/60 text-center">
          Don't have an account?{" "}
          <a href="/sign-up" className="text-amber-400 hover:underline">Create one</a>
          {" · "}
          <a href="/forgot-password" className="text-amber-400 hover:underline">Forgot password?</a>
        </p>
      </div>

      <Toast message={errorMsg} onClose={() => setErrorMsg(null)} />
    </main>
  );
}
