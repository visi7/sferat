"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supa } from "@/lib/supabase";

export default function SettingsPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [uid, setUid] = useState<string | null>(null);

  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [republics, setRepublics] = useState<{ id: string; title: string }[]>([]);
  const [defaultRepublicId, setDefaultRepublicId] = useState<string>("");
  const [savingFeed, setSavingFeed] = useState(false);
  const [feedMsg, setFeedMsg] = useState<string | null>(null);

  const [newEmail, setNewEmail] = useState("");
  const [savingEmail, setSavingEmail] = useState(false);
  const [emailMsg, setEmailMsg] = useState<string | null>(null);
  const [emailErr, setEmailErr] = useState<string | null>(null);

  const [showDelete, setShowDelete] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteErr, setDeleteErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const sess = (await supa.auth.getSession()).data.session;
      if (!sess) {
        router.replace("/sign-in");
        return;
      }
      setEmail(sess.user.email ?? null);
      setUid(sess.user.id);

      const { data } = await supa
        .from("profiles")
        .select("username,default_republic_id")
        .eq("id", sess.user.id)
        .maybeSingle();
      setUsername(data?.username ?? null);
      setDefaultRepublicId(data?.default_republic_id ?? "");

      const { data: reps } = await supa.from("republics").select("id,title").eq("is_active", true).order("title");
      setRepublics(reps ?? []);

      setChecking(false);
    })();
  }, [router]);

  async function saveDefaultFeed(e: React.FormEvent) {
    e.preventDefault();
    if (!uid) return;
    setFeedMsg(null);
    setSavingFeed(true);
    try {
      const { error } = await supa
        .from("profiles")
        .update({ default_republic_id: defaultRepublicId || null })
        .eq("id", uid);
      if (error) throw error;
      setFeedMsg("Saved.");
    } catch (e: any) {
      setFeedMsg(e.message ?? "Something went wrong");
    } finally {
      setSavingFeed(false);
    }
  }

  async function changeEmail(e: React.FormEvent) {
    e.preventDefault();
    setEmailErr(null);
    setEmailMsg(null);

    const clean = newEmail.trim();
    if (!clean || !clean.includes("@")) {
      setEmailErr("Enter a valid email address.");
      return;
    }

    setSavingEmail(true);
    try {
      const { error } = await supa.auth.updateUser({ email: clean });
      if (error) throw error;
      setEmailMsg(`Confirmation link sent to ${clean}. Your email won't change until you click it.`);
      setNewEmail("");
    } catch (e: any) {
      setEmailErr(e.message ?? "Something went wrong");
    } finally {
      setSavingEmail(false);
    }
  }

  async function deleteAccount() {
    if (!uid || deleteConfirmText !== "DELETE") return;
    setDeleteErr(null);
    setDeleting(true);
    try {
      // 1) Scrub our own profile — self-service, keeps posts/comments
      // intact (shown as "Private user") instead of cascade-deleting them.
      const { error: profErr } = await supa
        .from("profiles")
        .update({
          username: `private_user_${uid.slice(0, 8)}`,
          display_name: "Private user",
          bio: null,
          avatar_url: "/deleted-avatar.svg",
          employment: null,
          education: null,
          location: null,
          topics: null,
          deleted_at: new Date().toISOString(),
        })
        .eq("id", uid);
      if (profErr) throw profErr;

      // 2) Ban the auth account server-side so it can never sign in again.
      const token = (await supa.auth.getSession()).data.session?.access_token;
      const res = await fetch("/api/delete-account", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Could not fully delete the account. Contact support.");
      }

      await supa.auth.signOut();
      window.location.href = "/";
    } catch (e: any) {
      setDeleteErr(e.message ?? "Something went wrong");
    } finally {
      setDeleting(false);
    }
  }

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
        <h2 className="text-sm font-semibold">Change email</h2>
        <form onSubmit={changeEmail} className="space-y-3">
          <input
            type="email"
            placeholder="New email address"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            className="w-full border rounded-md px-3 py-2 text-sm"
            required
          />
          {emailErr && <p className="text-red-600 text-xs">{emailErr}</p>}
          {emailMsg && <p className="text-green-600 text-xs">{emailMsg}</p>}
          <button
            type="submit"
            disabled={savingEmail}
            className="px-4 py-2 bg-black text-white rounded-md text-sm disabled:opacity-60"
          >
            {savingEmail ? "Sending…" : "Update email"}
          </button>
        </form>
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

      <section className="bg-white border rounded-xl p-4 space-y-3">
        <h2 className="text-sm font-semibold">Default feed</h2>
        <p className="text-xs text-gray-500">
          Choose a Republic to see by default when you open SFERAT, instead of all Republics mixed together.
        </p>
        <form onSubmit={saveDefaultFeed} className="flex items-center gap-2">
          <select
            className="border rounded-md px-3 py-2 text-sm flex-1"
            value={defaultRepublicId}
            onChange={(e) => setDefaultRepublicId(e.target.value)}
          >
            <option value="">All Republics (mixed)</option>
            {republics.map((r) => (
              <option key={r.id} value={r.id}>{r.title}</option>
            ))}
          </select>
          <button
            type="submit"
            disabled={savingFeed}
            className="px-4 py-2 bg-black text-white rounded-md text-sm disabled:opacity-60"
          >
            {savingFeed ? "Saving…" : "Save"}
          </button>
        </form>
        {feedMsg && <p className="text-xs text-gray-600">{feedMsg}</p>}
      </section>

      <section className="bg-white border border-red-200 rounded-xl p-4 space-y-3">
        <h2 className="text-sm font-semibold text-red-700">Delete account</h2>
        <p className="text-xs text-gray-600">
          Your posts and comments stay up (so other people's conversations aren't broken) but are shown as
          "Private user" instead of your name — your profile, bio, and personal info are wiped. You won't be able
          to sign back in with this account. This can't be undone.
        </p>

        {!showDelete ? (
          <button
            onClick={() => setShowDelete(true)}
            className="px-4 py-2 border border-red-300 text-red-700 rounded-md text-sm hover:bg-red-50"
          >
            Delete my account
          </button>
        ) : (
          <div className="space-y-2">
            <label className="block text-xs text-gray-600">
              Type <strong>DELETE</strong> to confirm:
            </label>
            <input
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              className="w-full border rounded-md px-3 py-2 text-sm"
            />
            {deleteErr && <p className="text-red-600 text-xs">{deleteErr}</p>}
            <div className="flex gap-2">
              <button
                onClick={deleteAccount}
                disabled={deleteConfirmText !== "DELETE" || deleting}
                className="px-4 py-2 bg-red-600 text-white rounded-md text-sm disabled:opacity-50"
              >
                {deleting ? "Deleting…" : "Permanently delete"}
              </button>
              <button
                onClick={() => {
                  setShowDelete(false);
                  setDeleteConfirmText("");
                  setDeleteErr(null);
                }}
                className="px-4 py-2 border rounded-md text-sm hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Hapësirë për opsione të tjera në të ardhmen (njoftime, privatësi, etj.) */}
    </div>
  );
}
