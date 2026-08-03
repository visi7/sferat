"use client";

import { useEffect, useState } from "react";
import { supa } from "@/lib/supabase";
import ConfirmDialog from "@/components/ConfirmDialog";

type Republic = { id: string; title: string };

type Arena = {
  id: string;
  sponsor_name: string;
  title: string;
  description: string | null;
  prize_description: string | null;
  post_id: string;
  ends_at: string;
  status: "open" | "awarded";
  winner_comment_id: string | null;
  created_at: string;
};

type LeaderboardRow = {
  id: string;
  body: string;
  author_id: string;
  username: string;
  convinced: number;
};

const ARENA_DURATION_PRESETS: { label: string; days: number }[] = [
  { label: "+3 days", days: 3 },
  { label: "+1 week", days: 7 },
  { label: "+2 weeks", days: 14 },
  { label: "+1 month", days: 30 },
];

function toDateInputValue(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function daysUntil(iso: string): number {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
}

const emptyForm = {
  sponsor_name: "",
  title: "",
  description: "",
  prize_description: "",
  republic_id: "",
};

export default function ArenaManager() {
  const [republics, setRepublics] = useState<Republic[]>([]);
  const [arenas, setArenas] = useState<Arena[]>([]);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState(emptyForm);
  const [endsAtInput, setEndsAtInput] = useState(toDateInputValue(7));
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [leaderboards, setLeaderboards] = useState<Record<string, LeaderboardRow[]>>({});
  const [loadingBoard, setLoadingBoard] = useState<string | null>(null);
  const [pendingAward, setPendingAward] = useState<{ arena: Arena; commentId: string } | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supa.from("republics").select("id,title").eq("is_active", true).order("title");
      setRepublics(data ?? []);
    })();
    loadArenas();
  }, []);

  async function loadArenas() {
    setLoading(true);
    const { data } = await supa
      .from("debate_arenas")
      .select("id,sponsor_name,title,description,prize_description,post_id,ends_at,status,winner_comment_id,created_at")
      .order("created_at", { ascending: false });
    setArenas((data as Arena[]) ?? []);
    setLoading(false);
  }

  async function submitForm(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    const sponsor_name = form.sponsor_name.trim();
    const title = form.title.trim();
    if (!sponsor_name || !title || !form.republic_id) {
      setFormError("Sponsor name, topic, and Republic are required.");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supa.rpc("create_debate_arena", {
        p_sponsor_name: sponsor_name,
        p_title: title,
        p_description: form.description.trim() || null,
        p_prize_description: form.prize_description.trim() || null,
        p_republic_id: form.republic_id,
        p_ends_at: new Date(`${endsAtInput}T23:59:59`).toISOString(),
      });
      if (error) throw error;
      setForm(emptyForm);
      setEndsAtInput(toDateInputValue(7));
      await loadArenas();
    } catch (err: any) {
      setFormError(err.message ?? "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  async function toggleLeaderboard(arena: Arena) {
    if (expandedId === arena.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(arena.id);
    if (leaderboards[arena.id]) return;

    setLoadingBoard(arena.id);
    const { data: comments } = await supa
      .from("comments")
      .select("id,body,author_id,created_at")
      .eq("post_id", arena.post_id)
      .order("created_at", { ascending: true });
    const list = comments ?? [];
    const ids = list.map((c) => c.id);

    const counts: Record<string, number> = {};
    if (ids.length) {
      const { data: cc } = await supa.from("comment_convinces").select("comment_id").in("comment_id", ids);
      for (const row of cc ?? []) counts[row.comment_id] = (counts[row.comment_id] ?? 0) + 1;
    }

    const authorIds = Array.from(new Set(list.map((c) => c.author_id)));
    const profileMap: Record<string, string> = {};
    if (authorIds.length) {
      const { data: profs } = await supa.from("profiles").select("id,username").in("id", authorIds);
      for (const p of profs ?? []) profileMap[p.id] = p.username;
    }

    const ranked: LeaderboardRow[] = list
      .map((c) => ({
        id: c.id,
        body: c.body,
        author_id: c.author_id,
        username: profileMap[c.author_id] ?? "user",
        convinced: counts[c.id] ?? 0,
      }))
      .sort((a, b) => b.convinced - a.convinced);

    setLeaderboards((prev) => ({ ...prev, [arena.id]: ranked }));
    setLoadingBoard(null);
  }

  async function confirmAward() {
    if (!pendingAward) return;
    setActionError(null);
    const { error } = await supa.rpc("award_debate_arena", {
      p_arena_id: pendingAward.arena.id,
      p_comment_id: pendingAward.commentId,
    });
    setPendingAward(null);
    if (error) return setActionError(error.message);
    await loadArenas();
  }

  return (
    <div className="space-y-6">
      <form onSubmit={submitForm} className="bg-white border border-l-4 border-l-amber-400 rounded-xl p-5 space-y-3">
        <h2 className="text-sm font-semibold">New debate arena</h2>
        <p className="text-xs text-gray-500">
          Creates a real post in the chosen Republic — people debate exactly like on any other post
          (comments, votes, "Convinced me"). At the deadline, pick the winning argument below.
        </p>

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
            <label className="block text-xs text-gray-500 mb-1">Republic</label>
            <select
              className="w-full border rounded-md px-3 py-2 text-sm"
              value={form.republic_id}
              onChange={(e) => setForm((f) => ({ ...f, republic_id: e.target.value }))}
            >
              <option value="">Select a Republic</option>
              {republics.map((r) => (
                <option key={r.id} value={r.id}>{r.title}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">Debate topic</label>
          <input
            className="w-full border rounded-md px-3 py-2 text-sm"
            placeholder="e.g. Should social media verify real identities?"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          />
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">Context / rules (optional)</label>
          <textarea
            className="w-full border rounded-md px-3 py-2 text-sm min-h-[70px]"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">Prize</label>
          <input
            className="w-full border rounded-md px-3 py-2 text-sm"
            placeholder="e.g. $100 gift card"
            value={form.prize_description}
            onChange={(e) => setForm((f) => ({ ...f, prize_description: e.target.value }))}
          />
        </div>

        <div className="border rounded-md p-3 space-y-2">
          <label className="block text-xs font-medium text-gray-600">Debate ends</label>
          <div className="flex flex-wrap gap-1.5">
            {ARENA_DURATION_PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => setEndsAtInput(toDateInputValue(p.days))}
                className="text-xs px-2 py-1 border rounded-full hover:bg-gray-50"
              >
                {p.label}
              </button>
            ))}
          </div>
          <input
            type="date"
            className="border rounded-md px-3 py-2 text-sm"
            value={endsAtInput}
            onChange={(e) => setEndsAtInput(e.target.value)}
          />
        </div>

        {formError && <p className="text-red-600 text-xs">{formError}</p>}

        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 bg-black text-white rounded-md text-sm disabled:opacity-60"
        >
          {saving ? "Creating…" : "Launch arena"}
        </button>
      </form>

      <div className="bg-white border rounded-xl p-4">
        <h2 className="text-sm font-semibold mb-3">All debate arenas</h2>
        {loading ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : arenas.length === 0 ? (
          <p className="text-sm text-gray-500">No arenas yet.</p>
        ) : (
          <div className="space-y-3">
            {arenas.map((arena) => {
              const d = daysUntil(arena.ends_at);
              const ended = d < 0;
              return (
                <div key={arena.id} className="border rounded-lg p-3">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{arena.title}</span>
                        {arena.status === "awarded" ? (
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-blue-100 text-blue-700">
                            🏆 Awarded
                          </span>
                        ) : ended ? (
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-amber-100 text-amber-700">
                            Voting closed — pick a winner
                          </span>
                        ) : (
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-green-100 text-green-700">
                            Open · ends in {d}d
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500">
                        {arena.sponsor_name}
                        {arena.prize_description ? ` · Prize: ${arena.prize_description}` : ""}
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <a
                        href={`/post/${arena.post_id}`}
                        target="_blank"
                        className="text-xs px-2 py-1 border rounded hover:bg-gray-50"
                      >
                        View debate
                      </a>
                      <button
                        onClick={() => toggleLeaderboard(arena)}
                        className="text-xs px-2 py-1 border rounded hover:bg-gray-50"
                      >
                        {expandedId === arena.id ? "Hide leaderboard" : "Leaderboard"}
                      </button>
                    </div>
                  </div>

                  {expandedId === arena.id && (
                    <div className="mt-3 border-t pt-3 space-y-2">
                      {loadingBoard === arena.id ? (
                        <p className="text-xs text-gray-500">Loading leaderboard…</p>
                      ) : (leaderboards[arena.id]?.length ?? 0) === 0 ? (
                        <p className="text-xs text-gray-500">No comments yet.</p>
                      ) : (
                        leaderboards[arena.id].map((row, i) => (
                          <div
                            key={row.id}
                            className={`flex items-start justify-between gap-2 text-xs p-2 rounded ${
                              arena.winner_comment_id === row.id ? "bg-amber-50 border border-amber-200" : "bg-gray-50"
                            }`}
                          >
                            <div className="min-w-0">
                              <div className="text-gray-500">
                                #{i + 1} · @{row.username} · 💡 {row.convinced} Convinced me
                                {arena.winner_comment_id === row.id && " · 🏆 Winner"}
                              </div>
                              <div className="text-gray-800 truncate">{row.body}</div>
                            </div>
                            {arena.status === "open" && (
                              <button
                                onClick={() => setPendingAward({ arena, commentId: row.id })}
                                className="shrink-0 text-xs px-2 py-1 border border-amber-300 text-amber-700 rounded hover:bg-amber-50"
                              >
                                Award
                              </button>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {actionError && (
        <div className="fixed bottom-4 right-4 bg-red-50 border border-red-200 text-red-800 text-sm rounded-lg px-4 py-3 shadow-lg z-40 max-w-sm">
          {actionError}
          <button onClick={() => setActionError(null)} className="ml-3 text-red-600 underline">Dismiss</button>
        </div>
      )}

      <ConfirmDialog
        open={!!pendingAward}
        title="Award winning argument"
        message="This comment becomes the announced winner and its author gets notified. This can't be undone."
        confirmLabel="Award"
        onConfirm={confirmAward}
        onCancel={() => setPendingAward(null)}
      />
    </div>
  );
}
