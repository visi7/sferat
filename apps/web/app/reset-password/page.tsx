"use client";

import { useEffect, useState } from "react";
import { supa } from "@/lib/supabase";

export default function ResetPasswordPage() {
  const [ready, setReady] = useState(false);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    // Supabase e krijon një sesion të përkohshëm "recovery" nga linku i email-it
    // (nga fragmenti #access_token= i URL-së) — thjesht presim ta vendosë klienti.
    const { data: sub } = supa.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });

    supa.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

    if (pw.length < 8) {
      setErr("Password must be at least 8 characters.");
      return;
    }
    if (pw !== pw2) {
      setErr("Passwords don't match.");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supa.auth.updateUser({ password: pw });
      if (error) throw error;
      setDone(true);
    } catch (e: any) {
      setErr(e.message ?? "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  if (done) {
    return (
      <main className="mx-auto max-w-sm p-6">
        <h1 className="text-xl font-semibold mb-4">Password updated</h1>
        <p className="text-sm text-gray-600 mb-4">You can now sign in with your new password.</p>
        <a href="/sign-in" className="text-blue-600 underline text-sm">Go to sign in</a>
      </main>
    );
  }

  if (!ready) {
    return (
      <main className="mx-auto max-w-sm p-6">
        <h1 className="text-xl font-semibold mb-4">Reset password</h1>
        <p className="text-sm text-gray-600">
          Open this page from the reset link in your email. If you didn't request one,{" "}
          <a href="/forgot-password" className="text-blue-600 underline">request a new link</a>.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-sm p-6">
      <h1 className="text-xl font-semibold mb-4">Set a new password</h1>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <input
          type="password"
          placeholder="New password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          className="border rounded px-3 py-2"
          required
        />
        <input
          type="password"
          placeholder="Confirm new password"
          value={pw2}
          onChange={(e) => setPw2(e.target.value)}
          className="border rounded px-3 py-2"
          required
        />
        {err && <p className="text-red-600 text-xs">{err}</p>}
        <button
          type="submit"
          disabled={saving}
          className="mt-2 bg-black text-white rounded px-4 py-2"
        >
          {saving ? "Saving…" : "Update password"}
        </button>
      </form>
    </main>
  );
}
