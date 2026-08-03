"use client";

import { useEffect, useState } from "react";
import { supa } from "@/lib/supabase";

type RoleName = "admin" | "director" | "manager" | "moderator" | "assistant" | "marketing";

type Role = {
  id: string;
  user_id: string;
  role: RoleName;
  republic_id: string | null;
  username?: string;
  republic_title?: string | null;
};

const ROLE_LABELS: Record<RoleName, string> = {
  assistant: "Assistant (view-only)",
  moderator: "Moderator",
  manager: "Manager",
  director: "Director",
  admin: "Admin",
  marketing: "Marketing Moderator (Agora only)",
};

const ROLE_BADGE: Record<RoleName, string> = {
  assistant: "bg-gray-100 text-gray-600",
  moderator: "bg-blue-100 text-blue-700",
  manager: "bg-indigo-100 text-indigo-700",
  director: "bg-teal-100 text-teal-700",
  admin: "bg-gray-900 text-white",
  marketing: "bg-amber-100 text-amber-700",
};

// Renditje hierarkie për listën "Current roles" — më i larti lart.
const ROLE_RANK: Record<RoleName, number> = {
  admin: 0,
  director: 1,
  manager: 2,
  moderator: 3,
  marketing: 4,
  assistant: 5,
};

type Republic = { id: string; title: string };

type ManagerScope = { republicId: string | null } | null;

export default function ModRolesPage() {
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [isGlobalAdmin, setIsGlobalAdmin] = useState(false);
  const [isDirector, setIsDirector] = useState(false);
  const [managerScope, setManagerScope] = useState<ManagerScope>(null);

  const [roles, setRoles] = useState<Role[]>([]);
  const [republics, setRepublics] = useState<Republic[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // form
  const [username, setUsername] = useState("");
  const [role, setRole] = useState<RoleName>("moderator");
  const [republicId, setRepublicId] = useState<string>(""); // "" = global
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formNotice, setFormNotice] = useState<string | null>(null);

  // Vetëm Admini global sheh gjithçka (Admin/Director/Marketing përfshirë);
  // Director sheh vetëm rreshtat Assistant/Moderator/Manager — mjaftueshëm
  // për t'i menaxhuar, jo panoramën e plotë. Manager i thjeshtë s'sheh listë
  // fare — zbatuar direkt në databazë (RLS), jo vetëm këtu.
  const canSeeList = isGlobalAdmin || isDirector;
  const canManage = isGlobalAdmin || isDirector || !!managerScope;

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

      if (adminRow) {
        setIsGlobalAdmin(true);
        setCheckingAuth(false);
        return;
      }

      const { data: directorRow } = await supa
        .from("user_roles")
        .select("id")
        .eq("user_id", uid)
        .eq("role", "director")
        .is("republic_id", null)
        .maybeSingle();

      if (directorRow) {
        setIsDirector(true);
        setRole("moderator");
      } else {
        const { data: managerRow } = await supa
          .from("user_roles")
          .select("republic_id")
          .eq("user_id", uid)
          .eq("role", "manager")
          .order("republic_id", { ascending: true, nullsFirst: true })
          .limit(1)
          .maybeSingle();
        if (managerRow) {
          setManagerScope({ republicId: managerRow.republic_id });
          setRole("assistant");
          setRepublicId(managerRow.republic_id ?? "");
        }
      }
      setCheckingAuth(false);
    })();
  }, []);

  async function loadRoles() {
    setLoading(true);
    const { data: rolesData } = await supa
      .from("user_roles")
      .select("id,user_id,role,republic_id")
      .order("created_at", { ascending: false });

    const list = rolesData ?? [];
    const userIds = Array.from(new Set(list.map((r) => r.user_id)));
    const repIds = Array.from(new Set(list.map((r) => r.republic_id).filter(Boolean))) as string[];

    const [{ data: profs }, { data: reps }] = await Promise.all([
      userIds.length
        ? supa.from("profiles").select("id,username").in("id", userIds)
        : Promise.resolve({ data: [] as any[] }),
      repIds.length
        ? supa.from("republics").select("id,title").in("id", repIds)
        : Promise.resolve({ data: [] as any[] }),
    ]);

    const profMap: Record<string, string> = {};
    for (const p of profs ?? []) profMap[p.id] = p.username;
    const repMap: Record<string, string> = {};
    for (const r of reps ?? []) repMap[r.id] = r.title;

    setRoles(
      (list as Role[])
        .map((r) => ({
          ...r,
          username: profMap[r.user_id] ?? r.user_id.slice(0, 8),
          republic_title: r.republic_id ? repMap[r.republic_id] ?? r.republic_id.slice(0, 8) : null,
        }))
        .sort((a, b) => ROLE_RANK[a.role] - ROLE_RANK[b.role])
    );
    setLoading(false);
  }

  useEffect(() => {
    if (!canManage) return;
    if (canSeeList) loadRoles();
    else setLoading(false);
    (async () => {
      const { data } = await supa.from("republics").select("id,title").order("title");
      setRepublics(data ?? []);
    })();
  }, [canManage, canSeeList]);

  async function assignRole(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setFormNotice(null);

    const clean = username.trim().toLowerCase();
    if (!clean) return;

    // Manager (thjeshtë) mund të japë vetëm "assistant"; Director mund të
    // japë assistant/moderator/manager; vetëm Admini global mund të japë
    // çdo rol (përfshi admin/director/marketing) — zbatuar edhe në RLS,
    // kjo është vetëm që forma të mos dërgojë diçka që serveri do refuzonte.
    const effectiveRole: RoleName = isGlobalAdmin || isDirector ? role : "assistant";
    const effectiveRepublicId = isGlobalAdmin
      ? effectiveRole === "marketing" || effectiveRole === "director"
        ? null
        : republicId || null
      : isDirector
      ? republicId || null
      : managerScope?.republicId ?? (republicId || null);

    setSaving(true);
    try {
      const { data: prof, error: profErr } = await supa
        .from("profiles")
        .select("id")
        .eq("username", clean)
        .maybeSingle();

      if (profErr) throw profErr;
      if (!prof) {
        setFormError(`No user found with username "${clean}".`);
        return;
      }

      const { error } = await supa.from("user_roles").insert({
        user_id: prof.id,
        role: effectiveRole,
        republic_id: effectiveRepublicId,
      });
      if (error) throw error;

      setUsername("");
      if (isGlobalAdmin) setRepublicId("");
      if (canSeeList) {
        await loadRoles();
      } else {
        setFormNotice(`Role assigned to @${clean}.`);
      }
    } catch (err: any) {
      setFormError(err.message ?? "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  function canRemove(r: Role) {
    if (isGlobalAdmin) return true;
    if (isDirector) return ["assistant", "moderator", "manager"].includes(r.role);
    if (!managerScope || r.role !== "assistant") return false;
    return managerScope.republicId === null || managerScope.republicId === r.republic_id;
  }

  async function removeRole(r: Role) {
    if (!confirm(`Remove ${ROLE_LABELS[r.role]} from @${r.username}?`)) return;
    const { error } = await supa.from("user_roles").delete().eq("id", r.id);
    if (error) return alert(error.message);
    setRoles((prev) => prev.filter((x) => x.id !== r.id));
  }

  if (checkingAuth) {
    return <div className="p-6 text-sm text-gray-500">Loading…</div>;
  }

  if (!canManage) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-bold mb-2">Moderator Roles</h1>
        <p className="text-gray-600 text-sm">You must be an admin, director, or manager to view this page.</p>
      </div>
    );
  }

  const visibleRoles = roles.filter((r) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return r.username?.toLowerCase().includes(q) || ROLE_LABELS[r.role].toLowerCase().includes(q);
  });

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">🛡️ Moderator Roles</h1>
        <a href="/" className="px-3 py-1 border rounded text-sm hover:bg-gray-50">Home</a>
      </div>

      <form onSubmit={assignRole} className="bg-white border border-l-4 border-l-teal-400 rounded-xl p-5 space-y-3">
        <h2 className="text-sm font-semibold">Assign a role</h2>
        {!isGlobalAdmin && isDirector && (
          <p className="text-xs text-gray-500">
            As a Director, you can grant/remove <strong>Assistant</strong>, <strong>Moderator</strong>, and{" "}
            <strong>Manager</strong> — globally or within any Republic.
          </p>
        )}
        {!isGlobalAdmin && !isDirector && (
          <p className="text-xs text-gray-500">
            As a Manager, you can grant/remove <strong>Assistant</strong> access
            {managerScope?.republicId
              ? " within your own Republic only."
              : " in any Republic (or globally)."}
          </p>
        )}

        <div>
          <label className="block text-xs text-gray-500 mb-1">Username</label>
          <input
            className="w-full border rounded-md px-3 py-2 text-sm"
            placeholder="e.g. test"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-xs text-gray-500 mb-1">Role</label>
            {isGlobalAdmin ? (
              <select
                className="w-full border rounded-md px-3 py-2 text-sm"
                value={role}
                onChange={(e) => setRole(e.target.value as RoleName)}
              >
                <option value="assistant">{ROLE_LABELS.assistant}</option>
                <option value="moderator">{ROLE_LABELS.moderator}</option>
                <option value="manager">{ROLE_LABELS.manager}</option>
                <option value="director">{ROLE_LABELS.director}</option>
                <option value="admin">{ROLE_LABELS.admin}</option>
                <option value="marketing">{ROLE_LABELS.marketing}</option>
              </select>
            ) : isDirector ? (
              <select
                className="w-full border rounded-md px-3 py-2 text-sm"
                value={role}
                onChange={(e) => setRole(e.target.value as RoleName)}
              >
                <option value="assistant">{ROLE_LABELS.assistant}</option>
                <option value="moderator">{ROLE_LABELS.moderator}</option>
                <option value="manager">{ROLE_LABELS.manager}</option>
              </select>
            ) : (
              <div className="w-full border rounded-md px-3 py-2 text-sm bg-gray-50 text-gray-600">
                {ROLE_LABELS.assistant}
              </div>
            )}
          </div>
          <div className="flex-1">
            <label className="block text-xs text-gray-500 mb-1">Scope</label>
            {isGlobalAdmin && (role === "marketing" || role === "director") ? (
              <div className="w-full border rounded-md px-3 py-2 text-sm bg-gray-50 text-gray-600">
                Global (no Republic)
              </div>
            ) : isGlobalAdmin || isDirector || !managerScope?.republicId ? (
              <select
                className="w-full border rounded-md px-3 py-2 text-sm"
                value={republicId}
                onChange={(e) => setRepublicId(e.target.value)}
              >
                <option value="">Global (all Republics)</option>
                {republics.map((r) => (
                  <option key={r.id} value={r.id}>{r.title}</option>
                ))}
              </select>
            ) : (
              <div className="w-full border rounded-md px-3 py-2 text-sm bg-gray-50 text-gray-600">
                {republics.find((r) => r.id === managerScope.republicId)?.title ?? "Your Republic"}
              </div>
            )}
          </div>
        </div>

        {formError && <p className="text-red-600 text-xs">{formError}</p>}
        {formNotice && <p className="text-green-700 text-xs">{formNotice}</p>}

        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 bg-black text-white rounded-md text-sm disabled:opacity-60"
        >
          {saving ? "Saving…" : "Assign role"}
        </button>
      </form>

      {canSeeList ? (
        <div className="bg-white border rounded-xl p-4">
          <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
            <h2 className="text-sm font-semibold">Current roles</h2>
            <input
              type="text"
              placeholder="Search username or role…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border rounded-md px-2 py-1 text-xs w-48"
            />
          </div>
          {loading ? (
            <p className="text-sm text-gray-500">Loading…</p>
          ) : visibleRoles.length === 0 ? (
            <p className="text-sm text-gray-500">Nothing here.</p>
          ) : (
            <div className="space-y-2">
              {visibleRoles.map((r) => (
                <div key={r.id} className="flex items-center justify-between gap-2 text-sm border-b pb-2 last:border-b-0">
                  <div className="flex items-center gap-2 min-w-0 flex-wrap">
                    <span className="font-medium">@{r.username}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_BADGE[r.role]}`}>
                      {ROLE_LABELS[r.role]}
                    </span>
                    <span className="text-xs text-gray-500">{r.republic_title ?? "Global"}</span>
                  </div>
                  {canRemove(r) && (
                    <button
                      onClick={() => removeRole(r)}
                      className="shrink-0 text-xs px-2 py-1 border border-red-200 text-red-700 rounded hover:bg-red-50"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <p className="text-xs text-gray-400 text-center">
          The full role list is only visible to Admins and Directors.
        </p>
      )}
    </div>
  );
}
