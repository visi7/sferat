"use client";

import { useState } from "react";
import { supa } from "@/lib/supabase";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);

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
      setErr(e.message ?? "Something went wrong");
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
          <button
            type="submit"
            disabled={loading}
            className="mt-2 bg-black text-white rounded px-4 py-2"
          >
            {loading ? "Sending…" : "Send reset link"}
          </button>
        </form>
      )}

      <p className="mt-4 text-sm">
        <a href="/sign-in" className="text-blue-600 underline">Back to sign in</a>
      </p>
    </main>
  );
}
