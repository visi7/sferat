"use client";

import { useEffect, useMemo, useState } from "react";
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

async function uploadToAgoraMedia(file: File): Promise<string> {
  const ext = (file.name.split(".").pop() || "bin").toLowerCase();
  const fileName = `${crypto.randomUUID()}.${ext}`;
  const { error } = await supa.storage.from("agora-media").upload(fileName, file, { upsert: false });
  if (error) throw error;
  const { data } = supa.storage.from("agora-media").getPublicUrl(fileName);
  return data.publicUrl;
}

export default function ModAgoraPage() {
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [isGlobalAdmin, setIsGlobalAdmin] = useState(false);
  const [isMarketingMod, setIsMarketingMod] = useState(false);
  const canManage = isGlobalAdmin || isMarketingMod;

  const [ads, setAds] = useState<SponsoredPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("all");

  const [form, setForm] = useState(emptyForm);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadStage, setUploadStage] = useState<string | null>(null);
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

  const previewImageObjectUrl = useMemo(
    () => (imageFile ? URL.createObjectURL(imageFile) : null),
    [imageFile]
  );
  const previewVideoObjectUrl = useMemo(
    () => (videoFile ? URL.createObjectURL(videoFile) : null),
    [videoFile]
  );
  useEffect(() => {
    return () => {
      if (previewImageObjectUrl) URL.revokeObjectURL(previewImageObjectUrl);
    };
  }, [previewImageObjectUrl]);
  useEffect(() => {
    return () => {
      if (previewVideoObjectUrl) URL.revokeObjectURL(previewVideoObjectUrl);
    };
  }, [previewVideoObjectUrl]);

  function resetMediaInputs() {
    setImageFile(null);
    setVideoFile(null);
  }

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
    resetMediaInputs();
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
    resetMediaInputs();
    setFormError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm);
    resetMediaInputs();
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

    setSaving(true);
    try {
      let image_url = form.image_url.trim() || null;
      let video_url = form.video_url.trim() || null;

      if (imageFile) {
        setUploadStage("Uploading image…");
        image_url = await uploadToAgoraMedia(imageFile);
      }
      if (videoFile) {
        setUploadStage("Uploading video…");
        video_url = await uploadToAgoraMedia(videoFile);
      }
      setUploadStage(null);

      const payload = {
        sponsor_name,
        title,
        body: form.body.trim() || null,
        image_url,
        video_url,
        cta_label: form.cta_label.trim() || null,
        cta_url: form.cta_url.trim() || null,
      };

      if (editingId) {
        const { error } = await supa.from("sponsored_posts").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supa.from("sponsored_posts").insert({ ...payload, is_active: true });
        if (error) throw error;
      }
      setForm(emptyForm);
      resetMediaInputs();
      setEditingId(null);
      await loadAds();
    } catch (err: any) {
      setFormError(err.message ?? "Something went wrong");
    } finally {
      setUploadStage(null);
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

  const previewVideoUrl = videoFile ? null : form.video_url.trim() || null;
  const previewEmbed = previewVideoUrl ? getEmbedUrl(previewVideoUrl) : null;

  const filteredAds = ads.filter((ad) => {
    if (filter === "active") return ad.is_active;
    if (filter === "inactive") return !ad.is_active;
    return true;
  });

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">🏛️ Manage Agora</h1>
        <a href="/agora" className="px-3 py-1 border rounded text-sm hover:bg-gray-50">View Agora</a>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
        <form onSubmit={submitForm} className="lg:col-span-3 bg-white border border-l-4 border-l-amber-400 rounded-xl p-5 space-y-3">
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="border rounded-md p-3 space-y-2">
              <label className="block text-xs font-medium text-gray-600">Image</label>
              <input
                className="w-full border rounded-md px-3 py-2 text-sm"
                placeholder="Paste an image URL…"
                value={form.image_url}
                onChange={(e) => setForm((f) => ({ ...f, image_url: e.target.value }))}
                disabled={!!imageFile}
              />
              <div className="text-xs text-gray-400 text-center">— or —</div>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
                className="w-full text-xs"
              />
              {imageFile && (
                <button
                  type="button"
                  onClick={() => setImageFile(null)}
                  className="text-xs text-red-600 hover:underline"
                >
                  Remove selected file
                </button>
              )}
            </div>

            <div className="border rounded-md p-3 space-y-2">
              <label className="block text-xs font-medium text-gray-600">Video</label>
              <input
                className="w-full border rounded-md px-3 py-2 text-sm"
                placeholder="Paste a YouTube/Vimeo/.mp4 URL…"
                value={form.video_url}
                onChange={(e) => setForm((f) => ({ ...f, video_url: e.target.value }))}
                disabled={!!videoFile}
              />
              <div className="text-xs text-gray-400 text-center">— or —</div>
              <input
                type="file"
                accept="video/*"
                onChange={(e) => setVideoFile(e.target.files?.[0] ?? null)}
                className="w-full text-xs"
              />
              {videoFile && (
                <button
                  type="button"
                  onClick={() => setVideoFile(null)}
                  className="text-xs text-red-600 hover:underline"
                >
                  Remove selected file
                </button>
              )}
            </div>
          </div>
          <p className="text-xs text-gray-400">
            If both image and video are set, the video is shown instead of the image.
          </p>

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
            {uploadStage ?? (saving ? "Saving…" : editingId ? "Save changes" : "Publish")}
          </button>
        </form>

        {/* Paraprijë e gjallë — saktësisht si do dukej te /agora */}
        <div className="lg:col-span-2 lg:sticky lg:top-6 space-y-1">
          <h3 className="text-xs font-semibold text-gray-500">Preview</h3>
          {!form.sponsor_name && !form.title ? (
            <div className="bg-white border rounded-xl p-4 text-sm text-gray-400">
              Start typing to see a preview here.
            </div>
          ) : (
            <article className="bg-white border rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2 text-xs">
                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-medium">
                  Sponsored
                </span>
                <span className="text-gray-500">{form.sponsor_name || "Sponsor name"}</span>
              </div>
              <h2 className="font-semibold text-lg">{form.title || "Title"}</h2>
              {form.body && <p className="text-sm text-gray-700 whitespace-pre-wrap break-words">{form.body}</p>}

              {previewVideoObjectUrl ? (
                <video controls className="w-full rounded-lg border mt-1" src={previewVideoObjectUrl} />
              ) : previewVideoUrl ? (
                previewEmbed ? (
                  <iframe src={previewEmbed} className="w-full aspect-video rounded-lg border mt-1" allowFullScreen />
                ) : (
                  <video controls className="w-full rounded-lg border mt-1" src={previewVideoUrl} />
                )
              ) : previewImageObjectUrl ? (
                <img src={previewImageObjectUrl} alt={form.title} className="rounded-lg mt-1 max-h-[300px] w-auto object-contain border" />
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
          )}
        </div>
      </div>

      <div className="bg-white border rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold">All sponsored posts</h2>
          <div className="flex gap-1 text-xs">
            {(["all", "active", "inactive"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-2 py-1 rounded-full border capitalize ${
                  filter === f ? "bg-black text-white border-black" : "hover:bg-gray-50"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
        {loading ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : filteredAds.length === 0 ? (
          <p className="text-sm text-gray-500">Nothing here.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredAds.map((ad) => (
              <div key={ad.id} className="flex items-start gap-3 border rounded-lg p-3">
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
