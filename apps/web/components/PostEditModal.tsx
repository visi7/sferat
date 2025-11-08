"use client";

import { useState } from "react";
import { supa } from "@/lib/supabase";

type Props = {
  open: boolean;
  post: { id: string; body: string; url?: string | null; image_url?: string | null };
  onClose: () => void;
  onSaved: () => void;
};

export default function PostEditModal({ open, post, onClose, onSaved }: Props) {
  const [body, setBody] = useState(post.body ?? "");
  const [link, setLink] = useState(post.url ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  async function handleSave() {
    setBusy(true);
    try {
      let newImageUrl: string | null | undefined = post.image_url ?? null;

      // nëse u zgjodh file i ri -> ngarko në bucket "images"
      if (file) {
        const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
        const fileName = `post-${post.id}-${Date.now()}.${ext}`;
        const up = await supa.storage.from("images").upload(fileName, file, { upsert: true });
        if (up.error) throw up.error;
        const pub = supa.storage.from("images").getPublicUrl(fileName);
        newImageUrl = pub.data.publicUrl;
      }

      const payload: any = {
        body: body.trim(),
        url: link.trim() ? link.trim() : null,
        image_url: newImageUrl,
      };

      const { error } = await supa.from("posts").update(payload).eq("id", post.id);
      if (error) throw error;

      onSaved(); // rifresko feed
    } catch (e: any) {
      alert(e.message || "Failed to save");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[9998] bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-lg bg-white rounded-xl border shadow p-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">Edit post</h3>
          <button className="h-8 px-3 rounded border" onClick={onClose}>✕</button>
        </div>

        <label className="block text-sm text-gray-600 mb-1">Text</label>
        <textarea
          className="w-full border rounded px-3 py-2 min-h-[120px]"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />

        <div className="mt-3">
          <label className="block text-sm text-gray-600 mb-1">Link (optional)</label>
          <input
            className="w-full border rounded px-3 py-2"
            placeholder="https://example.com"
            value={link}
            onChange={(e) => setLink(e.target.value)}
          />
        </div>

        <div className="mt-3">
          <label className="block text-sm text-gray-600 mb-1">Replace image (optional)</label>
          <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          {post.image_url && (
            <p className="text-xs text-gray-500 mt-1">Current image is kept unless you upload a new one.</p>
          )}
        </div>

        <div className="mt-4 flex items-center justify-end gap-2">
          <button className="h-9 px-4 rounded border" onClick={onClose} disabled={busy}>Cancel</button>
          <button
            className="h-9 px-4 rounded bg-black text-white disabled:opacity-60"
            onClick={handleSave}
            disabled={busy}
          >
            {busy ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
