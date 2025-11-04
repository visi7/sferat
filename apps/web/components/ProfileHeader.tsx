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
  onUploadAvatar?: (file: File) => void;
  onSignOut?: () => void;
};

export default function ProfileHeader({ profile, isMe, onUploadAvatar }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [selFile, setSelFile] = useState<File | null>(null);

  return (
    <header className="bg-white border rounded-xl p-4 md:p-5 flex items-center justify-between">
      {/* Left: avatar + emri */}
      <div className="flex items-center gap-4">
        {/* Avatar i rrumbullakët */}
        <div className="relative w-16 h-16 rounded-full overflow-hidden border bg-white">
          <img
            src={profile.avatar_url || "/default-avatar.png"}
            alt="avatar"
            className="w-full h-full object-cover"
          />
        </div>

        {/* Emri dhe username + kontrolli i avatarit (vetëm kur je ti) */}
        <div className="flex flex-col">
          <div className="text-base md:text-lg font-semibold leading-tight">
            {profile.display_name || profile.username}
          </div>
          <div className="text-gray-500 text-sm">@{profile.username}</div>

          {isMe && (
            <>
              {/* file picker i fshehur */}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => setSelFile(e.target.files?.[0] ?? null)}
              />

              <div className="mt-2 flex items-center gap-2">
                <button
                  type="button"
                  className="px-2 py-1 text-xs border rounded hover:bg-gray-50"
                  onClick={() => fileRef.current?.click()}
                >
                  Change
                </button>

                {selFile && (
                  <button
                    type="button"
                    className="px-2 py-1 text-xs border rounded hover:bg-gray-50"
                    onClick={async () => {
                      if (!selFile || !onUploadAvatar) return;
                      await onUploadAvatar(selFile);
                      setSelFile(null);
                    }}
                  >
                    Upload
                  </button>
                )}
              </div>
            </>
          )}
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
