"use client";

import { useState } from "react";

type Props = {
  profile: any;
  isMe: boolean;
  onUpdate: (patch: any) => Promise<void>;
};

export default function ProfileTopicsCard({ profile, isMe, onUpdate }: Props) {
  const initial = Array.isArray(profile.topics)
    ? (profile.topics as string[])
    : [];

  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(initial.join(", "));

  const topics = initial;

  async function save() {
    // siguri: nëse nuk je ti vetë, mos bëj asgjë
    if (!isMe) return;

    const list = value
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    await onUpdate({ topics: list.length ? list : null });
    setEditing(false);
  }

  function cancel() {
    setValue(initial.join(", "));
    setEditing(false);
  }

  return (
    <section className="bg-white border rounded-xl p-4 space-y-3">
      <h2 className="text-sm font-semibold">Knows about</h2>

      {/* Pjesa e leximit – e shohin të gjithë */}
      {!editing ? (
        <>
          {topics.length === 0 ? (
            <p className="text-sm text-gray-500">
              You haven&apos;t added any topics yet.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2 text-xs">
              {topics.map((t: string) => (
                <span
                  key={t}
                  className="px-2 py-1 rounded-full border bg-gray-50"
                >
                  {t}
                </span>
              ))}
            </div>
          )}

          {/* Butoni për edit vetëm për autorin */}
          {isMe && (
            <button
              className="mt-2 text-xs px-3 py-1 rounded border hover:bg-gray-50"
              onClick={() => setEditing(true)}
            >
              {topics.length ? "Edit topics" : "Add topics"}
            </button>
          )}
        </>
      ) : isMe ? (
        // Forma e editimit – ekziston vetëm kur isMe === true
        <>
          <label className="block text-xs text-gray-500 mb-1">
            Topics (separate with commas)
          </label>
          <textarea
            className="w-full border rounded px-2 py-1 text-sm min-h-[60px]"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />

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
      ) : null}
    </section>
  );
}
