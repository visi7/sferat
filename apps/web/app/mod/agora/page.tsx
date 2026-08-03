"use client";

import { useEffect, useState } from "react";
import { supa } from "@/lib/supabase";

type SponsoredPost = {
  id: string;
  sponsor_name: string;
  title: string;
  body: string | null;
  image_url: string | null;
  video_url: string | null;
  cta_label: string | null;
  cta_url: string | null;
  is_active: boolean;
  created_at: string;
};

const emptyForm = {
  sponsor_name: "",
  title: "",
  body: "",
  image_url: "",
  video_url: "",
  cta_label: "",
  cta_url: "",
};

// Njësoj si te /agora — YouTube/Vimeo -> embed, çdo gjë tjetër -> <video> direkt.
function getEmbedUrl(url: string): string | null {
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{11})/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  const vimeo = url.match(/vimeo\.com\/(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  return null;
}

export default function ModAgoraPage() {
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [isGlobalAdmin, setIsGlobalAdmin] = useState(false);
  const [isMarketingMod, setIsMarketingMod] = useState(false);
  const canManage = isGlobalAdmin || isMarketingMod;

  const [ads, setAds] = useState<SponsoredPost[]>([]);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const s = (await supa.auth.getSession()).data.session;
      const uid = s?.user?.id;
      if (!uid) {
        setCheckingAuth(false);
        return;
      }
      const { data: adminRow } = await supa
        .from("user_roles")
        .select("id")
        .eq("user_id", uid)
        .eq("role", "admin")
        .is("republic_id", null)
        .maybeSingle();
      setIsGlobalAdmin(!!adminRow);

      const { data: marketingRow } = await supa
        .from("user_roles")
        .select("id")
        .eq("user_id", uid)
        .eq("role", "marketing")
        .maybeSingle();
      setIsMarketingMod(!!marketingRow);

      setCheckingAuth(false);
    })();
  }, []);

  async function loadAds() {
    setLoading(true);
    const { data } = await supa
      .from("sponsored_posts")
      .select("id,sponsor_name,title,body,image_url,video_url,cta_label,cta_url,is_active,created_at")
      .order("created_at", { ascending: false });
    setAds(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    if (canManage) loadAds();
  }, [canManage]);

  function startEdit(ad: SponsoredPost) {
    setEditingId(ad.id);
    setForm({
      sponsor_name: ad.sponsor_name,
      title: ad.title,
      body: ad.body ?? "",
      image_url: ad.image_url ?? "",
      video_url: ad.video_url ?? "",
      cta_label: ad.cta_label ?? "",
      cta_url: ad.cta_url ?? "",
    });
    setFormError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function duplicateAd(ad: SponsoredPost) {
    setEditingId(null);
    setForm({
      sponsor_name: ad.sponsor_name,
      title: `${ad.title} (copy)`,
      body: ad.body ?? "",
      image_url: ad.image_url ?? "",
      video_url: ad.video_url ?? "",
      cta_label: ad.cta_label ?? "",
      cta_url: ad.cta_url ?? "",
    });
    setFormError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm);
    setFormError(null);
  }

  async function submitForm(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    const sponsor_name = form.sponsor_name.trim();
    const title = form.title.trim();
    if (!sponsor_name || !title) {
      setFormError("Sponsor name and title are required.");
      return;
    }

    const payload = {
      sponsor_name,
      title,
      body: form.body.trim() || null,
      image_url: form.image_url.trim() || null,
      video_url: form.video_url.trim() || null,
      cta_label: form.cta_label.trim() || null,
      cta_url: form.cta_url.trim() || null,
    };

    setSaving(true);
    try {
      if (editingId) {
        const { error } = await supa.from("sponsored_posts").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supa.from("sponsored_posts").insert({ ...payload, is_active: true });
        if (error) throw error;
      }
      setForm(emptyForm);
      setEditingId(null);
      await loadAds();
    } catch (err: any) {
      setFormError(err.message ?? "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(ad: SponsoredPost) {
    const { error } = await supa
      .from("sponsored_posts")
      .update({ is_active: !ad.is_active })
      .eq("id", ad.id);
    if (error) return alert(error.message);
    setAds((prev) => prev.map((a) => (a.id === ad.id ? { ...a, is_active: !a.is_active } : a)));
  }

  async function deleteAd(id: string) {
    if (!confirm("Delete this sponsored post? This can't be undone.")) return;
    const { error } = await supa.from("sponsored_posts").delete().eq("id", id);
    if (error) return alert(error.message);
    setAds((prev) => prev.filter((a) => a.id !== id));
    if (editingId === id) cancelEdit();
  }

  if (checkingAuth) {
    return <div className="p-6 text-sm text-gray-500">Loading…</div>;
  }

  if (!canManage) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-bold mb-2">Manage Agora</h1>
        <p className="text-gray-600 text-sm">You must be a global admin or a Marketing Moderator to view this page.</p>
      </div>
    );
  }

  const previewEmbed = form.video_url.trim() ? getEmbedUrl(form.video_url.trim()) : null;

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">🏛️ Manage Agora</h1>
        <a href="/agora" className="px-3 py-1 border rounded text-sm hover:bg-gray-50">View Agora</a>
      </div>

      <form onSubmit={submitForm} className="bg-white border border-l-4 border-l-amber-400 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">
            {editingId ? "Edit sponsored post" : "New sponsored post"}
          </h2>
          {editingId && (
            <button
              type="button"
              onClick={cancelEdit}
              className="text-xs px-2 py-1 border rounded hover:bg-gray-50"
            >
              Cancel edit
            </button>
          )}
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-xs text-gray-500 mb-1">Sponsor name</label>
            <input
              className="w-full border rounded-md px-3 py-2 text-sm"
              value={form.sponsor_name}
              onChange={(e) => setForm((f) => ({ ...f, sponsor_name: e.target.value }))}
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs text-gray-500 mb-1">Title</label>
            <input
              className="w-full border rounded-md px-3 py-2 text-sm"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">Body</label>
          <textarea
            className="w-full border rounded-md px-3 py-2 text-sm min-h-[80px]"
            value={form.body}
            onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
          />
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">Image URL (optional)</label>
          <input
            className="w-full border rounded-md px-3 py-2 text-sm"
            placeholder="https://…"
            value={form.image_url}
            onChange={(e) => setForm((f) => ({ ...f, image_url: e.target.value }))}
          />
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">Video URL (optional)</label>
          <input
            className="w-full border rounded-md px-3 py-2 text-sm"
            placeholder="https://… (direct .mp4 link, or a YouTube/Vimeo link)"
            value={form.video_url}
            onChange={(e) => setForm((f) => ({ ...f, video_url: e.target.value }))}
          />
          <p className="text-xs text-gray-400 mt-1">
            Use one field or the other, not both — if a video is set, it's shown instead of the image.
          </p>
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-xs text-gray-500 mb-1">Button label (optional)</label>
            <input
              className="w-full border rounded-md px-3 py-2 text-sm"
              placeholder="e.g. Learn more"
              value={form.cta_label}
              onChange={(e) => setForm((f) => ({ ...f, cta_label: e.target.value }))}
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs text-gray-500 mb-1">Button link (optional)</label>
            <input
              className="w-full border rounded-md px-3 py-2 text-sm"
              placeholder="https://…"
              value={form.cta_url}
              onChange={(e) => setForm((f) => ({ ...f, cta_url: e.target.value }))}
            />
          </div>
        </div>

        {formError && <p className="text-red-600 text-xs">{formError}</p>}

        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 bg-black text-white rounded-md text-sm disabled:opacity-60"
        >
          {saving ? "Saving…" : editingId ? "Save changes" : "Publish"}
        </button>
      </form>

      {/* Paraprijë e gjallë — saktësisht si do dukej te /agora */}
      {(form.sponsor_name || form.title) && (
        <div className="space-y-1">
          <h3 className="text-xs font-semibold text-gray-500">Preview</h3>
          <article className="bg-white border rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-xs">
              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-medium">
                Sponsored
              </span>
              <span className="text-gray-500">{form.sponsor_name || "Sponsor name"}</span>
            </div>
            <h2 className="font-semibold text-lg">{form.title || "Title"}</h2>
            {form.body && <p className="text-sm text-gray-700 whitespace-pre-wrap break-words">{form.body}</p>}
            {form.video_url ? (
              previewEmbed ? (
                <iframe src={previewEmbed} className="w-full aspect-video rounded-lg border mt-1" allowFullScreen />
              ) : (
                <video controls className="w-full rounded-lg border mt-1" src={form.video_url} />
              )
            ) : (
              form.image_url && (
                <img
                  src={form.image_url}
                  alt={form.title}
                  className="rounded-lg mt-1 max-h-[300px] w-auto object-contain border"
                />
              )
            )}
            {form.cta_label && (
              <span className="inline-block mt-1 px-4 py-2 rounded-md bg-black text-white text-sm">
                {form.cta_label}
              </span>
            )}
          </article>
        </div>
      )}

      <div className="bg-white border rounded-xl p-4">
        <h2 className="text-sm font-semibold mb-3">All sponsored posts</h2>
        {loading ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : ads.length === 0 ? (
          <p className="text-sm text-gray-500">Nothing yet.</p>
        ) : (
          <div className="space-y-3">
            {ads.map((ad) => (
              <div key={ad.id} className="flex items-start gap-3 border-b pb-3 last:border-b-0">
                {ad.video_url ? (
                  <div className="w-14 h-14 shrink-0 rounded-md border bg-gray-50 flex items-center justify-center text-xl">
                    🎬
                  </div>
                ) : ad.image_url ? (
                  <img src={ad.image_url} alt="" className="w-14 h-14 shrink-0 rounded-md border object-cover" />
                ) : (
                  <div className="w-14 h-14 shrink-0 rounded-md border bg-gray-50 flex items-center justify-center text-xl">
                    📢
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{ad.title}</span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        ad.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {ad.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">{ad.sponsor_name}</div>

                  <div className="flex flex-wrap gap-2 mt-2">
                    <button
                      onClick={() => startEdit(ad)}
                      className="text-xs px-2 py-1 border border-blue-200 text-blue-700 rounded hover:bg-blue-50"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => duplicateAd(ad)}
                      className="text-xs px-2 py-1 border rounded text-gray-700 hover:bg-gray-50"
                    >
                      Duplicate
                    </button>
                    <button
                      onClick={() => toggleActive(ad)}
                      className={`text-xs px-2 py-1 border rounded hover:bg-amber-50 ${
                        ad.is_active ? "border-amber-200 text-amber-700" : "border-green-200 text-green-700"
                      }`}
                    >
                      {ad.is_active ? "Deactivate" : "Activate"}
                    </button>
                    <button
                      onClick={() => deleteAd(ad.id)}
                      className="text-xs px-2 py-1 border border-red-200 text-red-700 rounded hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
