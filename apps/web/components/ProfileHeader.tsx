"use client";
import { useEffect, useRef, useState } from "react";
import { supa } from "@/lib/supabase";
import SignInPrompt from "@/components/SignInPrompt";

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
  onShowActivity?: () => void;
};

export default function ProfileHeader({
  profile,
  isMe,
  onUploadAvatar,
  onUpdateDisplayName,
  onShowActivity,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(profile.display_name || profile.username);
  const [savingName, setSavingName] = useState(false);

  const [myId, setMyId] = useState<string | null>(null);
  const [blocked, setBlocked] = useState(false);
  const [blockBusy, setBlockBusy] = useState(false);
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);

  const [isFollowing, setIsFollowing] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);
  const [signInMsg, setSignInMsg] = useState<string | null>(null);

  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportBusy, setReportBusy] = useState(false);
  const [reportSent, setReportSent] = useState(false);

  useEffect(() => {
    if (isMe) return;
    (async () => {
      const sess = (await supa.auth.getSession()).data.session;
      const uid = sess?.user?.id ?? null;
      setMyId(uid);
      if (!uid) return;

      const { data } = await supa
        .from("blocked_users")
        .select("id")
        .eq("blocker_id", uid)
        .eq("blocked_id", profile.id)
        .maybeSingle();
      setBlocked(!!data);

      const { data: follow } = await supa
        .from("follows_users")
        .select("follower_id")
        .eq("follower_id", uid)
        .eq("followed_user_id", profile.id)
        .maybeSingle();
      setIsFollowing(!!follow);
    })();
  }, [isMe, profile.id]);

  async function toggleFollow() {
    if (!myId) return setSignInMsg("Sign in to follow people.");
    setFollowBusy(true);
    try {
      if (isFollowing) {
        const { error } = await supa
          .from("follows_users")
          .delete()
          .eq("follower_id", myId)
          .eq("followed_user_id", profile.id);
        if (error) throw error;
        setIsFollowing(false);
      } else {
        const { error } = await supa
          .from("follows_users")
          .upsert(
            { follower_id: myId, followed_user_id: profile.id },
            { onConflict: "follower_id,followed_user_id" }
          );
        if (error) throw error;
        setIsFollowing(true);
      }
    } catch (e: any) {
      alert(e.message ?? "Something went wrong");
    } finally {
      setFollowBusy(false);
    }
  }

  function onBlockClick() {
    setMenuOpen(false);
    if (!myId) return alert("You must be logged in.");
    if (blocked) {
      toggleBlock();
    } else {
      setShowBlockConfirm(true);
    }
  }

  function onReportClick() {
    setMenuOpen(false);
    if (!myId) return setSignInMsg("Sign in to report this user.");
    setReportReason("");
    setReportSent(false);
    setShowReport(true);
  }

  async function submitReport() {
    if (!myId) return;
    const clean = reportReason.trim();
    if (!clean) return;
    setReportBusy(true);
    try {
      const { error } = await supa.from("reports").insert({
        reported_user_id: profile.id,
        reporter_id: myId,
        reason: clean,
      });
      if (error) throw error;
      setReportSent(true);
    } catch (e: any) {
      alert(e.message ?? "Something went wrong");
    } finally {
      setReportBusy(false);
    }
  }

  function profileUrl() {
    return `${window.location.origin}/profile/${profile.username}`;
  }

  async function handleShare() {
    setMenuOpen(false);
    const url = profileUrl();
    if (navigator.share) {
      try {
        await navigator.share({ title: `@${profile.username} on SFERAT`, url });
      } catch {
        // felmuar/anuluar nga vetë përdoruesi — nuk ka nevojë për mesazh gabimi
      }
    } else {
      await handleCopyLink();
    }
  }

  async function handleCopyLink() {
    await navigator.clipboard.writeText(profileUrl());
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function toggleBlock() {
    if (!myId) return;
    setShowBlockConfirm(false);
    setBlockBusy(true);
    try {
      if (blocked) {
        const { error } = await supa
          .from("blocked_users")
          .delete()
          .eq("blocker_id", myId)
          .eq("blocked_id", profile.id);
        if (error) throw error;
        setBlocked(false);
      } else {
        const { error } = await supa
          .from("blocked_users")
          .insert({ blocker_id: myId, blocked_id: profile.id });
        if (error) throw error;
        setBlocked(true);
      }
    } catch (e: any) {
      alert(e.message ?? "Something went wrong");
    } finally {
      setBlockBusy(false);
    }
  }

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

      <div className="flex items-center gap-2 relative">
        {!isMe && (
          <button
            type="button"
            onClick={toggleFollow}
            disabled={followBusy}
            className={`h-9 px-3 rounded text-sm disabled:opacity-60 ${
              isFollowing ? "border hover:bg-gray-50" : "bg-black text-white hover:bg-gray-800"
            }`}
          >
            {followBusy ? "…" : isFollowing ? "Following" : "Follow"}
          </button>
        )}

        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          className="h-9 w-9 rounded border hover:bg-gray-50 flex items-center justify-center text-gray-600"
          title="More options"
          aria-label="More options"
        >
          ⋮
        </button>

        {menuOpen && (
          <>
            <div className="fixed inset-0 z-[9997]" onClick={() => setMenuOpen(false)} />
            <div className="absolute right-0 top-11 z-[9998] w-52 bg-white border rounded-lg shadow-lg py-1 text-sm overflow-hidden">
              <button
                type="button"
                onClick={handleShare}
                className="w-full text-left px-3 py-2 hover:bg-gray-50"
              >
                Share profile
              </button>
              <button
                type="button"
                onClick={handleCopyLink}
                className="w-full text-left px-3 py-2 hover:bg-gray-50"
              >
                {copied ? "Copied!" : "Copy profile link"}
              </button>
              {onShowActivity && (
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onShowActivity();
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-gray-50"
                >
                  Activity
                </button>
              )}
              {isMe && (
                <a
                  href="/settings"
                  onClick={() => setMenuOpen(false)}
                  className="block w-full text-left px-3 py-2 hover:bg-gray-50"
                >
                  Account settings
                </a>
              )}
              {!isMe && (
                <>
                  <div className="border-t my-1" />
                  <button
                    type="button"
                    onClick={onReportClick}
                    className="w-full text-left px-3 py-2 hover:bg-gray-50 text-gray-700"
                  >
                    Report user
                  </button>
                  {myId && (
                    <button
                      type="button"
                      onClick={onBlockClick}
                      disabled={blockBusy}
                      className="w-full text-left px-3 py-2 hover:bg-gray-50 text-red-600 disabled:opacity-60"
                    >
                      {blockBusy ? "…" : blocked ? "Unblock" : "Block"}
                    </button>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </div>

      {showBlockConfirm && (
        <div
          className="fixed inset-0 z-[9998] bg-black/50 flex items-center justify-center p-4"
          onClick={() => setShowBlockConfirm(false)}
        >
          <div
            className="w-full max-w-sm bg-white rounded-xl border shadow p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-semibold">Block @{profile.username}?</h3>
            <p className="text-sm text-gray-600">
              You won't see their posts or comments anymore. They won't be notified, and they can still see
              and interact with your content as before — blocking only affects what you see.
            </p>
            <div className="flex justify-end gap-2">
              <button
                className="h-9 px-4 rounded border text-sm"
                onClick={() => setShowBlockConfirm(false)}
              >
                Cancel
              </button>
              <button
                className="h-9 px-4 rounded bg-gray-900 text-white text-sm disabled:opacity-60"
                onClick={toggleBlock}
                disabled={blockBusy}
              >
                {blockBusy ? "Blocking…" : "Block"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showReport && (
        <div
          className="fixed inset-0 z-[9998] bg-black/50 flex items-center justify-center p-4"
          onClick={() => setShowReport(false)}
        >
          <div
            className="w-full max-w-sm bg-white rounded-xl border shadow p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            {reportSent ? (
              <>
                <h3 className="text-base font-semibold">Report sent</h3>
                <p className="text-sm text-gray-600">
                  Thanks — our moderation team will review @{profile.username}'s account.
                </p>
                <div className="flex justify-end">
                  <button
                    className="h-9 px-4 rounded bg-gray-900 text-white text-sm"
                    onClick={() => setShowReport(false)}
                  >
                    Close
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 className="text-base font-semibold">Report @{profile.username}</h3>
                <p className="text-sm text-gray-600">
                  Tell us what's wrong. Reports are reviewed by SFERAT moderators.
                </p>
                <textarea
                  autoFocus
                  className="w-full border rounded-md px-3 py-2 text-sm min-h-[90px]"
                  placeholder="Reason for report (harassment, spam, impersonation, etc.)"
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                />
                <div className="flex justify-end gap-2">
                  <button
                    className="h-9 px-4 rounded border text-sm"
                    onClick={() => setShowReport(false)}
                  >
                    Cancel
                  </button>
                  <button
                    className="h-9 px-4 rounded bg-red-600 text-white text-sm disabled:opacity-60"
                    onClick={submitReport}
                    disabled={reportBusy || !reportReason.trim()}
                  >
                    {reportBusy ? "Sending…" : "Send report"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <SignInPrompt open={!!signInMsg} message={signInMsg ?? undefined} onClose={() => setSignInMsg(null)} />
    </header>
  );
}
