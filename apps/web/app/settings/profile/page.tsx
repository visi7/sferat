"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supa } from "@/lib/supabase";

export default function EditProfilePage() {
  const router = useRouter();

  const [meId, setMeId] = useState<string | null>(null);
  const [username, setUsername] = useState<string>("");
  const [displayName, setDisplayName] = useState<string>("");
  const [bio, setBio] = useState<string>("");

  // avatar
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const sess = (await supa.auth.getSession()).data.session;
      const uid = sess?.user.id ?? null;
      setMeId(uid);
      if (!uid) return;

      const { data } = await supa
        .from("profiles")
        .select("username, display_name, bio, avatar_url")
        .eq("id", uid)
        .single();

      if (data) {
        setUsername(data.username);
        setDisplayName(data.display_name ?? "");
        setBio(data.bio ?? "");
        setAvatarUrl(data.avatar_url ?? "");
      }
    })();
  }, []);

  async function uploadAvatarIfNeeded(): Promise<string | null> {
    if (!meId || !avatarFile) return null; // s’ka skedar të ri për tu ngarkuar

    const ext = (avatarFile.name.split(".").pop() || "jpg").toLowerCase();
    const fileName = `${meId}-${Date.now()}.${ext}`;

    // ngarko në bucket "avatars"
    const { error: upErr } = await supa.storage
      .from("avatars")
      .upload(fileName, avatarFile, { upsert: true });
    if (upErr) throw upErr;

    // merr URL publike
    const { data } = supa.storage.from("avatars").getPublicUrl(fileName);
    return data.publicUrl;
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!meId) return;

    try {
      setSaving(true);

      // nëse është zgjedhur foto e re, ngarkoje dhe mer URL-në
      const newAvatar = await uploadAvatarIfNeeded();

      const update: any = { display_name: displayName, bio };
      if (newAvatar) {
        update.avatar_url = newAvatar;
        setAvatarUrl(newAvatar);
      }

      const { error } = await supa
        .from("profiles")
        .update(update)
        .eq("id", meId);

      if (error) throw error;

      router.push(`/profile/${username}`);
    } catch (err: any) {
      alert(err.message || "Saving failed");
    } finally {
      setSaving(false);
    }
  }

  async function onSignOut() {
    await supa.auth.signOut();
    router.push("/");
  }

  return (
    <div className="max-w-3xl mx-auto p-5">
      {/* TOP BAR: Home · Profile · Sign out */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold">Edit Profile</h1>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/" className="underline">Home</Link>
          {username && (
            <Link href={`/profile/${username}`} className="underline">Profile</Link>
          )}
          <button onClick={onSignOut} className="underline">Sign out</button>
        </nav>
      </div>

      <form onSubmit={onSave} className="bg-white border rounded-xl p-5 space-y-4">
        {/* Avatar */}
        <div className="flex items-center gap-4">
          <img
            src={avatarUrl || "/avatar-placeholder.png"}
            alt="avatar"
            className="w-16 h-16 rounded-full object-cover border"
          />
          <div>
            <label className="block text-sm text-gray-600 mb-1">Avatar</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setAvatarFile(e.target.files?.[0] ?? null)}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm text-gray-600 mb-1">Username</label>
          <input className="w-full border rounded px-3 py-2 bg-gray-50" value={username} disabled />
        </div>

        <div>
          <label className="block text-sm text-gray-600 mb-1">Display name</label>
          <input
            className="w-full border rounded px-3 py-2"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm text-gray-600 mb-1">Bio</label>
          <textarea
            className="w-full border rounded px-3 py-2 min-h-[120px]"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
          />
        </div>

        <div>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-black text-white rounded disabled:opacity-50"
          >
            {saving ? "Saving..." : "Ruaj"}
          </button>
        </div>
      </form>
    </div>
  );
}
