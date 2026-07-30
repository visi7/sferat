"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supa } from "@/lib/supabase";

export default function SettingsPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);

  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const sess = (await supa.auth.getSession()).data.session;
      if (!sess) {
        router.replace("/sign-in");
        return;
      }
      setEmail(sess.user.email ?? null);

      const { data } = await supa
        .from("profiles")
        .select("username")
        .eq("id", sess.user.id)
        .maybeSingle();
      setUsername(data?.username ?? null);

      setChecking(false);
    })();
  }, [router]);

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setMsg(null);

    if (pw.length < 6) {
      setErr("Password must be at least 6 characters.");
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
      setMsg("Password updated.");
      setPw("");
      setPw2("");
    } catch (e: any) {
      setErr(e.message ?? "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  if (checking) {
    return <div className="max-w-2xl mx-auto p-6 text-sm text-gray-500">Loading…</div>;
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Settings</h1>
        <a href="/" className="px-3 py-1 border rounded text-sm">Home</a>
      </div>

      <section className="bg-white border rounded-xl p-4 space-y-1">
        <h2 className="text-sm font-semibold">Account</h2>
        <p className="text-sm text-gray-600">Email: {email}</p>
        {username && (
          <p className="text-sm text-gray-600">
            Profile: <a href={`/profile/${username}`} className="text-blue-600 underline">@{username}</a>
          </p>
        )}
      </section>

      <section className="bg-white border rounded-xl p-4 space-y-3">
        <h2 className="text-sm font-semibold">Change password</h2>
        <form onSubmit={changePassword} className="space-y-3">
          <input
            type="password"
            placeholder="New password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            className="w-full border rounded-md px-3 py-2 text-sm"
            required
          />
          <input
            type="password"
            placeholder="Confirm new password"
            value={pw2}
            onChange={(e) => setPw2(e.target.value)}
            className="w-full border rounded-md px-3 py-2 text-sm"
            required
          />
          {err && <p className="text-red-600 text-xs">{err}</p>}
          {msg && <p className="text-green-600 text-xs">{msg}</p>}
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-black text-white rounded-md text-sm disabled:opacity-60"
          >
            {saving ? "Saving…" : "Update password"}
          </button>
        </form>
      </section>

      {/* Hapësirë për opsione të tjera në të ardhmen (njoftime, privatësi, etj.) */}
    </div>
  );
}
