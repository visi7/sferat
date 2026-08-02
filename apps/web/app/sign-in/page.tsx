"use client";
import { useState } from "react";
import { supa } from "@/lib/supabase";
import Turnstile from "@/components/Turnstile";
import GoogleSignInButton from "@/components/GoogleSignInButton";

export default function EmailSignIn() {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [loading, setLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);

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
      return alert(error.message);
    }
    window.location.href = "/";
  }

  return (
    <main className="mx-auto max-w-sm p-6">
      <h1 className="text-xl font-semibold mb-4">Sign in</h1>

      <GoogleSignInButton />

      <div className="flex items-center gap-3 my-4">
        <div className="flex-1 border-t" />
        <span className="text-xs text-gray-400">or</span>
        <div className="flex-1 border-t" />
      </div>

      <form onSubmit={submit} className="flex flex-col gap-3">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="border rounded px-3 py-2"
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          className="border rounded px-3 py-2"
          required
        />
        <Turnstile onVerify={setCaptchaToken} />

        <button
          type="submit"
          disabled={loading || !captchaToken}
          className="mt-2 bg-black text-white rounded px-4 py-2 disabled:opacity-50"
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>

      <p className="mt-4 text-sm">
        Don't have an account?{" "}
        <a href="/sign-up" className="text-blue-600 underline">Create one</a>
        {" · "}
        <a href="/forgot-password" className="text-blue-600 underline">Forgot password?</a>
      </p>
    </main>
  );
}
