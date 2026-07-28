"use client";
import { useRef, useState } from "react";
import Link from "next/link";

type Props = {
  profile: {
    id: string;
    username: string;
    display_name: string | null;
    bio: string | null;
    avatar_url: string | null;
  };
  isMe?: boolean;
  onUploadAvatar?: (file: File) => void | Promise<void>;
  onUpdateDisplayName?: (name: string) => void | Promise<void>;
  onSignOut?: () => void;
};

export default function ProfileHeader({
  profile,
  isMe,
  onUploadAvatar,
  onUpdateDisplayName,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(profile.display_name || profile.username);
  const [savingName, setSavingName] = useState(false);

  async function handleFileSelected(file: File | null) {
    if (!file || !onUploadAvatar) return;
    setUploading(true);
    try {
      await onUploadAvatar(file);
    } finally {
      setUploading(false);
    }
  }

  async function saveName() {
    const clean = nameValue.trim();
    if (!clean || !onUpdateDisplayName) {
      setEditingName(false);
      return;
    }
    setSavingName(true);
    try {
      await onUpdateDisplayName(clean);
      setEditingName(false);
    } finally {
      setSavingName(false);
    }
  }

  return (
    <header className="bg-white border rounded-xl p-4 md:p-5 flex items-center justify-between">
      {/* Left: avatar + emri */}
      <div className="flex items-center gap-4">
        {/* Avatar i rrumbullakët, klikohet direkt për ta ndryshuar */}
        <div className="relative w-16 h-16 shrink-0">
          <div className="w-16 h-16 rounded-full overflow-hidden border bg-white">
            <img
              src={profile.avatar_url || "/default-avatar.png"}
              alt="avatar"
              className="w-full h-full object-cover"
            />
          </div>

          {isMe && (
            <>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFileSelected(e.target.files?.[0] ?? null)}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full border bg-white text-[11px] flex items-center justify-center hover:bg-gray-50 disabled:opacity-60"
                title="Change avatar"
                aria-label="Change avatar"
              >
                {uploading ? "…" : "✎"}
              </button>
            </>
          )}
        </div>

        {/* Emri dhe username */}
        <div className="flex flex-col">
          {editingName ? (
            <div className="flex items-center gap-2">
              <input
                autoFocus
                className="border rounded-md px-2 py-1 text-sm"
                value={nameValue}
                onChange={(e) => setNameValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveName();
                  if (e.key === "Escape") {
                    setNameValue(profile.display_name || profile.username);
                    setEditingName(false);
                  }
                }}
              />
              <button
                type="button"
                className="text-xs px-2 py-1 rounded bg-black text-white disabled:opacity-60"
                onClick={saveName}
                disabled={savingName}
              >
                {savingName ? "…" : "Save"}
              </button>
              <button
                type="button"
                className="text-xs px-2 py-1 rounded border"
                onClick={() => {
                  setNameValue(profile.display_name || profile.username);
                  setEditingName(false);
                }}
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="text-base md:text-lg font-semibold leading-tight">
                {profile.display_name || profile.username}
              </div>
              {isMe && (
                <button
                  type="button"
                  className="text-xs text-gray-400 hover:text-gray-700"
                  onClick={() => setEditingName(true)}
                  title="Edit name"
                  aria-label="Edit name"
                >
                  ✎
                </button>
              )}
            </div>
          )}
          <div className="text-gray-500 text-sm">@{profile.username}</div>
        </div>
      </div>

      {/* Right: Edit i vogël, i pastër (vetëm për veten) */}
      {isMe && (
        <div className="flex items-center gap-3">
          <Link
            href="/settings/profile"
            className="px-3 py-1.5 text-sm border rounded hover:bg-gray-50"
          >
            Edit profile
          </Link>
        </div>
      )}
    </header>
  );
}
