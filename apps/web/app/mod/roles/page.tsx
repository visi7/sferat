"use client";

import { useEffect, useState } from "react";
import { supa } from "@/lib/supabase";

type RoleName = "admin" | "manager" | "moderator" | "assistant";

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
  admin: "Admin",
};

type Republic = { id: string; title: string };

type ManagerScope = { republicId: string | null } | null;

export default function ModRolesPage() {
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [isGlobalAdmin, setIsGlobalAdmin] = useState(false);
  const [managerScope, setManagerScope] = useState<ManagerScope>(null);

  const [roles, setRoles] = useState<Role[]>([]);
  const [republics, setRepublics] = useState<Republic[]>([]);
  const [loading, setLoading] = useState(true);

  // form
  const [username, setUsername] = useState("");
  const [role, setRole] = useState<RoleName>("moderator");
  const [republicId, setRepublicId] = useState<string>(""); // "" = global
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const canManage = isGlobalAdmin || !!managerScope;

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
      list.map((r) => ({
        ...r,
        username: profMap[r.user_id] ?? r.user_id.slice(0, 8),
        republic_title: r.republic_id ? repMap[r.republic_id] ?? r.republic_id.slice(0, 8) : null,
      }))
    );
    setLoading(false);
  }

  useEffect(() => {
    if (!canManage) return;
    loadRoles();
    (async () => {
      const { data } = await supa.from("republics").select("id,title").order("title");
      setRepublics(data ?? []);
    })();
  }, [canManage]);

  async function assignRole(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    const clean = username.trim().toLowerCase();
    if (!clean) return;

    // Managers (non-global-admin) can only ever grant "assistant", within
    // their own scope — enforced here too, not just in RLS, so the form
    // can't silently submit something the server will reject anyway.
    const effectiveRole: RoleName = isGlobalAdmin ? role : "assistant";
    const effectiveRepublicId = isGlobalAdmin
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
      await loadRoles();
    } catch (err: any) {
      setFormError(err.message ?? "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  function canRemove(r: Role) {
    if (isGlobalAdmin) return true;
    if (!managerScope || r.role !== "assistant") return false;
    return managerScope.republicId === null || managerScope.republicId === r.republic_id;
  }

  async function removeRole(id: string) {
    const { error } = await supa.from("user_roles").delete().eq("id", id);
    if (error) return alert(error.message);
    setRoles((prev) => prev.filter((r) => r.id !== id));
  }

  if (checkingAuth) {
    return <div className="p-6 text-sm text-gray-500">Loading…</div>;
  }

  if (!canManage) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-bold mb-2">Moderator Roles</h1>
        <p className="text-gray-600 text-sm">You must be an admin or manager to view this page.</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Moderator Roles</h1>
        <a href="/" className="px-3 py-1 border rounded text-sm">Home</a>
      </div>

      <form onSubmit={assignRole} className="bg-white border rounded-xl p-4 space-y-3">
        <h2 className="text-sm font-semibold">Assign a role</h2>
        {!isGlobalAdmin && (
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
                <option value="admin">{ROLE_LABELS.admin}</option>
              </select>
            ) : (
              <div className="w-full border rounded-md px-3 py-2 text-sm bg-gray-50 text-gray-600">
                {ROLE_LABELS.assistant}
              </div>
            )}
          </div>
          <div className="flex-1">
            <label className="block text-xs text-gray-500 mb-1">Scope</label>
            {isGlobalAdmin || !managerScope?.republicId ? (
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

        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 bg-black text-white rounded-md text-sm disabled:opacity-60"
        >
          {saving ? "Saving…" : "Assign role"}
        </button>
      </form>

      <div className="bg-white border rounded-xl p-4">
        <h2 className="text-sm font-semibold mb-3">Current roles</h2>
        {loading ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : roles.length === 0 ? (
          <p className="text-sm text-gray-500">No roles assigned yet.</p>
        ) : (
          <div className="space-y-2">
            {roles.map((r) => (
              <div key={r.id} className="flex items-center justify-between text-sm border-b pb-2 last:border-b-0">
                <div>
                  <span className="font-medium">@{r.username}</span>{" "}
                  <span className="text-gray-500">
                    — {ROLE_LABELS[r.role] ?? r.role} {r.republic_title ? `· ${r.republic_title}` : "· Global"}
                  </span>
                </div>
                {canRemove(r) && (
                  <button
                    onClick={() => removeRole(r.id)}
                    className="text-xs px-2 py-1 border rounded hover:bg-gray-50"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
