"use client";

import { useState } from "react";

type Props = {
  profile: any;
  isMe: boolean;
  onUpdate: (patch: any) => Promise<void>;
};

export default function ProfileCredentialsCard({ profile, isMe, onUpdate }: Props) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [employment, setEmployment] = useState<string>(profile.employment ?? "");
  const [education, setEducation] = useState<string>(profile.education ?? "");
  const [location, setLocation] = useState<string>(profile.location ?? "");

  const joined =
    profile.created_at
      ? new Date(profile.created_at).toLocaleString("en-US", {
          month: "long",
          year: "numeric",
        })
      : null;

  async function save() {
    setSaving(true);
    try {
      await onUpdate({ employment, education, location });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  function cancel() {
    setEmployment(profile.employment ?? "");
    setEducation(profile.education ?? "");
    setLocation(profile.location ?? "");
    setEditing(false);
  }

  const hiddenFromViewer = !isMe && profile.credentials_private;

  return (
    <section className="bg-white border rounded-xl p-4 space-y-3">
      <h2 className="text-sm font-semibold">Credentials &amp; Highlights</h2>

      {hiddenFromViewer ? (
        <p className="text-sm text-gray-400 italic">This information is private.</p>
      ) : !editing || !isMe ? (
        <>
          {/* MODE SHIKO */}
          <div className="space-y-1.5 text-sm">
            <div className="flex items-center gap-2">
              <span className="w-4 text-center">💼</span>
              {employment || <span className="text-gray-400">Add employment</span>}
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 text-center">🎓</span>
              {education || <span className="text-gray-400">Add education</span>}
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 text-center">📍</span>
              {location || <span className="text-gray-400">Add location</span>}
            </div>
          </div>

          {joined && <p className="text-xs text-gray-500 mt-2">Joined {joined}</p>}

          {isMe && (
            <button
              className="mt-2 text-xs px-3 py-1.5 rounded-md border hover:bg-gray-50"
              onClick={() => setEditing(true)}
            >
              Edit credentials
            </button>
          )}
        </>
      ) : (
        <>
          {/* MODE EDITIMI — VETËM AUTORI */}
          <div className="space-y-3 text-sm">
            <div>
              <label className="block text-xs text-gray-500 mb-1">💼 Employment</label>
              <input
                className="w-full border rounded-md px-3 py-2 text-sm"
                placeholder="e.g. Software Engineer at Acme"
                value={employment}
                onChange={(e) => setEmployment(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">🎓 Education</label>
              <input
                className="w-full border rounded-md px-3 py-2 text-sm"
                placeholder="e.g. BSc Computer Science"
                value={education}
                onChange={(e) => setEducation(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">📍 Location</label>
              <input
                className="w-full border rounded-md px-3 py-2 text-sm"
                placeholder="e.g. Tirana, Albania"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
          </div>

          <div className="mt-3 flex gap-2">
            <button
              className="px-3 py-1.5 text-xs rounded-md bg-black text-white disabled:opacity-60"
              onClick={save}
              disabled={saving}
            >
              {saving ? "Saving…" : "Save"}
            </button>
            <button
              className="px-3 py-1.5 text-xs rounded-md border text-gray-600"
              onClick={cancel}
              disabled={saving}
            >
              Cancel
            </button>
          </div>
        </>
      )}
    </section>
  );
}
