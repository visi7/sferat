"use client";

import { useState } from "react";

type Props = {
  profile: any;
  isMe: boolean;
  onUpdate: (patch: any) => Promise<void>;
};

export default function ProfileCredentialsCard({ profile, isMe, onUpdate }: Props) {


  const [editing, setEditing] = useState(false);
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
    await onUpdate({ employment, education, location });
    setEditing(false);
  }

  function cancel() {
    setEmployment(profile.employment ?? "");
    setEducation(profile.education ?? "");
    setLocation(profile.location ?? "");
    setEditing(false);
  }

  return (
    <section className="bg-white border rounded-xl p-4 space-y-3">
      <h2 className="text-sm font-semibold">Credentials &amp; Highlights</h2>

      {!editing || !isMe ? (
  <>
    {/* MODE SHIKO */}
    <div className="space-y-1 text-sm">
      <div>📷 {employment || <span className="text-gray-400">Add employment</span>}</div>
      <div>🎓 {education || <span className="text-gray-400">Add education</span>}</div>
      <div>📍 {location || <span className="text-gray-400">Add location</span>}</div>
    </div>

    {joined && (
      <p className="text-xs text-gray-500 mt-2">Joined {joined}</p>
    )}

    {isMe && (
      <button
        className="mt-2 text-xs px-3 py-1 rounded border hover:bg-gray-50"
        onClick={() => setEditing(true)}
      >
        Edit credentials
      </button>
    )}
  </>
) : (
  <>
    {/* MODE EDITIMI — VETËM AUTORI */}
    <div className="space-y-2 text-sm">
      <div>
        <label className="block text-xs text-gray-500 mb-1">Employment</label>
        <input
          className="w-full border rounded px-2 py-1 text-sm"
          value={employment}
          onChange={(e) => setEmployment(e.target.value)}
        />
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">Education</label>
        <input
          className="w-full border rounded px-2 py-1 text-sm"
          value={education}
          onChange={(e) => setEducation(e.target.value)}
        />
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">Location</label>
        <input
          className="w-full border rounded px-2 py-1 text-sm"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />
      </div>
    </div>

    <div className="mt-3 flex gap-2">
      <button
        className="px-3 py-1 text-xs rounded bg-black text-white"
        onClick={save}
      >
        Save
      </button>
      <button
        className="px-3 py-1 text-xs rounded border text-gray-600"
        onClick={cancel}
      >
        Cancel
      </button>
    </div>
  </>
)}

    </section>
  );
}
