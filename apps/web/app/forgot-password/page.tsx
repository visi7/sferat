"use client";

import { useEffect, useState } from "react";
import { supa } from "@/lib/supabase";

// Supabase e kthen këtë limit si tekst i papërpunuar, p.sh. "For security
// purposes, you can only request this after 49 seconds." — e nxjerrim numrin
// e sekondave prej andej dhe e shfaqim me stilin tonë, jo tekstin e tyre.
function parseCooldownSeconds(message: string): number | null {
  const m = message.match(/after (\d+) seconds?/i);
  return m ? parseInt(m[1], 10) : null;
}

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const { error } = await supa.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setSent(true);
    } catch (e: any) {
      const seconds = parseCooldownSeconds(e.message ?? "");
      if (seconds) {
        setCooldown(seconds);
      } else {
        setErr(e.message ?? "Something went wrong");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-sm p-6">
      <h1 className="text-xl font-semibold mb-4">Reset password</h1>

      {sent ? (
        <p className="text-sm text-gray-600">
          If an account exists for <strong>{email}</strong>, a reset link has been sent. Check your inbox.
        </p>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-3">
          <p className="text-sm text-gray-600">
            Enter your email and we'll send you a link to reset your password.
          </p>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="border rounded px-3 py-2"
            required
          />
          {err && <p className="text-red-600 text-xs">{err}</p>}
          {cooldown > 0 && (
            <p className="flex items-center gap-2 rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
              <span>
                You already requested a link recently. You can request another one in{" "}
                <strong>{cooldown}s</strong>.
              </span>
            </p>
          )}
          <button
            type="submit"
            disabled={loading || cooldown > 0}
            className="mt-2 bg-black text-white rounded px-4 py-2 disabled:opacity-50"
          >
            {loading ? "Sending…" : cooldown > 0 ? `Wait ${cooldown}s` : "Send reset link"}
          </button>
        </form>
      )}

      <p className="mt-4 text-sm">
        <a href="/sign-in" className="text-blue-600 underline">Back to sign in</a>
      </p>
    </main>
  );
}
