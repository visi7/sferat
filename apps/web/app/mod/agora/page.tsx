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

export default function ModAgoraPage() {
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [isGlobalAdmin, setIsGlobalAdmin] = useState(false);
  const [isMarketingMod, setIsMarketingMod] = useState(false);
  const canManage = isGlobalAdmin || isMarketingMod;

  const [ads, setAds] = useState<SponsoredPost[]>([]);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState(emptyForm);
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

  async function createAd(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    const sponsor_name = form.sponsor_name.trim();
    const title = form.title.trim();
    if (!sponsor_name || !title) {
      setFormError("Sponsor name and title are required.");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supa.from("sponsored_posts").insert({
        sponsor_name,
        title,
        body: form.body.trim() || null,
        image_url: form.image_url.trim() || null,
        video_url: form.video_url.trim() || null,
        cta_label: form.cta_label.trim() || null,
        cta_url: form.cta_url.trim() || null,
        is_active: true,
      });
      if (error) throw error;
      setForm(emptyForm);
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

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Manage Agora</h1>
        <a href="/agora" className="px-3 py-1 border rounded text-sm">View Agora</a>
      </div>

      <form onSubmit={createAd} className="bg-white border rounded-xl p-4 space-y-3">
        <h2 className="text-sm font-semibold">New sponsored post</h2>

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
          {saving ? "Saving…" : "Publish"}
        </button>
      </form>

      <div className="bg-white border rounded-xl p-4">
        <h2 className="text-sm font-semibold mb-3">All sponsored posts</h2>
        {loading ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : ads.length === 0 ? (
          <p className="text-sm text-gray-500">Nothing yet.</p>
        ) : (
          <div className="space-y-2">
            {ads.map((ad) => (
              <div key={ad.id} className="flex items-center justify-between text-sm border-b pb-2 last:border-b-0">
                <div className="min-w-0">
                  <span className="font-medium">{ad.title}</span>{" "}
                  <span className="text-gray-500">— {ad.sponsor_name}</span>{" "}
                  {!ad.is_active && <span className="text-xs text-gray-400">(inactive)</span>}
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => toggleActive(ad)}
                    className="text-xs px-2 py-1 border rounded hover:bg-gray-50"
                  >
                    {ad.is_active ? "Deactivate" : "Activate"}
                  </button>
                  <button
                    onClick={() => deleteAd(ad.id)}
                    className="text-xs px-2 py-1 border rounded hover:bg-gray-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
