'use client';

import { useEffect, useState } from 'react';
import { supa } from '@/lib/supabase';
import ConfirmDialog from '@/components/ConfirmDialog';

const SUSPEND_DURATIONS = [
  { label: '24 hours', hours: 24 },
  { label: '7 days', hours: 24 * 7 },
  { label: '30 days', hours: 24 * 30 },
  { label: 'Permanently', hours: null as number | null },
];

type ReportGroup = {
  id: string;                 // ID sintetike për React: "post:<id>" | "comment:<id>" | "user:<id>"
  targetId: string;
  type: 'post' | 'comment' | 'user';
  firstReportedAt: string;
  reportCount: number;
  republicId: string | null;
  escalatedAt: string | null;
  escalatedByUsername: string | null;
};

const MIN_REPORTS = 3;

export default function ModPanel() {
  const [reports, setReports] = useState<ReportGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [postsMap, setPostsMap] = useState<Record<string, any>>({});
  const [commentsMap, setCommentsMap] = useState<Record<string, any>>({});
  const [usersMap, setUsersMap] = useState<Record<string, any>>({});
  const [republicsMap, setRepublicsMap] = useState<Record<string, string>>({});
  const [myRoles, setMyRoles] = useState<{ role: string; republic_id: string | null }[]>([]);

  const [pendingSuspend, setPendingSuspend] = useState<ReportGroup | null>(null);
  const [suspendReason, setSuspendReason] = useState('');
  const [suspendHours, setSuspendHours] = useState<number | null>(24 * 7);
  const [suspendBusy, setSuspendBusy] = useState(false);
  const [pendingUnsuspend, setPendingUnsuspend] = useState<ReportGroup | null>(null);

  // Assistant-ët shohin raportet, por s'mund t'i zgjidhin (Accept/Reject) —
  // e njëjta rregull zbatohet edhe në RLS, kjo është vetëm për UI-në.
  function canResolve(republicId: string | null) {
    return myRoles.some(
      (r) =>
        ["admin", "director", "manager", "moderator"].includes(r.role) &&
        (r.republic_id === null || r.republic_id === republicId)
    );
  }

  // Pezullimi i llogarisë është veprim më i rëndë se Accept/Reject i thjeshtë
  // — vetëm admin/director global, jo moderator/manager.
  function canSuspend() {
    return myRoles.some((r) => ["admin", "director"].includes(r.role) && r.republic_id === null);
  }

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setErr(null);

        const sess = (await supa.auth.getSession()).data.session;
        const uid = sess?.user?.id;
        let rolesData: { role: string; republic_id: string | null }[] = [];
        if (uid) {
          const { data } = await supa
            .from("user_roles")
            .select("role,republic_id")
            .eq("user_id", uid);
          rolesData = data ?? [];
          setMyRoles(rolesData ?? []);
        }

        const { data, error } = await supa
          .from('reports')
          .select('post_id, comment_id, reported_user_id, created_at, escalated_at, escalated_by')
          .eq('status', 'pending')
          .order('created_at', { ascending: true });

        if (error) throw error;

        // Grupojmë në kod: një grup për post_id, një për comment_id, një për reported_user_id
        const groups = new Map<string, ReportGroup>();
        const escalatorIds = new Set<string>();
        for (const r of (data ?? []) as any[]) {
          const type: 'post' | 'comment' | 'user' = r.post_id ? 'post' : r.comment_id ? 'comment' : 'user';
          const targetId = r.post_id ?? r.comment_id ?? r.reported_user_id;
          if (!targetId) continue;

          const key = `${type}:${targetId}`;
          const existing = groups.get(key);
          if (existing) {
            existing.reportCount += 1;
            if (r.escalated_at && !existing.escalatedAt) {
              existing.escalatedAt = r.escalated_at;
              if (r.escalated_by) escalatorIds.add(r.escalated_by);
            }
          } else {
            if (r.escalated_by) escalatorIds.add(r.escalated_by);
            groups.set(key, {
              id: key,
              targetId,
              type,
              firstReportedAt: r.created_at,
              reportCount: 1,
              republicId: null,
              escalatedAt: r.escalated_at ?? null,
              escalatedByUsername: null,
            });
          }
        }

        let escalatorMap: Record<string, string> = {};
        if (escalatorIds.size > 0) {
          const { data: escalators } = await supa
            .from('profiles')
            .select('id,username')
            .in('id', Array.from(escalatorIds));
          for (const p of escalators ?? []) escalatorMap[p.id] = p.username;
        }
        for (const r of (data ?? []) as any[]) {
          if (!r.escalated_by) continue;
          const type: 'post' | 'comment' | 'user' = r.post_id ? 'post' : r.comment_id ? 'comment' : 'user';
          const targetId = r.post_id ?? r.comment_id ?? r.reported_user_id;
          const key = `${type}:${targetId}`;
          const g = groups.get(key);
          if (g && !g.escalatedByUsername) g.escalatedByUsername = escalatorMap[r.escalated_by] ?? null;
        }

        let reportsData = Array.from(groups.values()).sort((a, b) => {
          if (!!a.escalatedAt !== !!b.escalatedAt) return a.escalatedAt ? -1 : 1;
          return b.reportCount - a.reportCount;
        });

        const postIds = reportsData.filter((r) => r.type === 'post').map((r) => r.targetId);
        const commentIds = reportsData.filter((r) => r.type === 'comment').map((r) => r.targetId);
        const userIds = reportsData.filter((r) => r.type === 'user').map((r) => r.targetId);

        if (userIds.length > 0) {
          const { data: usersData, error: usersError } = await supa
            .from('profiles')
            .select('id, username, display_name, suspended_at, suspended_until, suspension_reason')
            .in('id', userIds);

          if (usersError) throw usersError;

          const map: Record<string, any> = {};
          for (const u of usersData ?? []) map[u.id] = u;
          setUsersMap(map);
        }

        const postsById: Record<string, any> = {};

        if (postIds.length > 0) {
          const { data: postsData, error: postsError } = await supa
            .from('posts')
            .select('id, title, body, republic_id')
            .in('id', postIds);

          if (postsError) throw postsError;

          for (const p of postsData ?? []) postsById[p.id] = p;
          setPostsMap(postsById);
        }

        if (commentIds.length > 0) {
          const { data: commentsData, error: commentsError } = await supa
            .from('comments')
            .select('id, body, post_id')
            .in('id', commentIds);

          if (commentsError) throw commentsError;

          const map: Record<string, any> = {};
          for (const c of commentsData ?? []) map[c.id] = c;
          setCommentsMap(map);

          const commentPostIds = Array.from(new Set((commentsData ?? []).map((c) => c.post_id)));
          if (commentPostIds.length > 0) {
            const { data: commentPostsData, error: commentPostsError } = await supa
              .from('posts')
              .select('id, republic_id')
              .in('id', commentPostIds);

            if (commentPostsError) throw commentPostsError;

            for (const p of commentPostsData ?? []) postsById[p.id] = p;
          }

          reportsData = reportsData.map((g) =>
            g.type === 'comment'
              ? { ...g, republicId: postsById[map[g.targetId]?.post_id]?.republic_id ?? null }
              : g
          );
        }

        reportsData = reportsData.map((g) =>
          g.type === 'post' ? { ...g, republicId: postsById[g.targetId]?.republic_id ?? null } : g
        );

        // Resolvers (Moderator+) vetëm 3+ raportime, si më parë. Assistant-ët
        // (vetëm-shqyrtues) shohin çdo rast në fushën e tyre, pavarësisht
        // numrit — pikërisht që të mund ta përshkallëzojnë herët, jo pas
        // pragut. Çdo gjë e përshkallëzuar mbetet gjithmonë e dukshme.
        const myRolesLocal = rolesData ?? [];
        const canResolveLocal = (republicId: string | null) =>
          myRolesLocal.some(
            (r) => ['admin', 'director', 'manager', 'moderator'].includes(r.role) && (r.republic_id === null || r.republic_id === republicId)
          );
        const isReviewerLocal = (republicId: string | null) =>
          myRolesLocal.some(
            (r) => ['admin', 'director', 'manager', 'moderator', 'assistant'].includes(r.role) && (r.republic_id === null || r.republic_id === republicId)
          );
        reportsData = reportsData.filter((g) => {
          if (g.escalatedAt) return true;
          if (canResolveLocal(g.republicId)) return g.reportCount >= MIN_REPORTS;
          return isReviewerLocal(g.republicId);
        });

        setReports(reportsData);

        const republicIds = Array.from(new Set(reportsData.map((g) => g.republicId).filter(Boolean))) as string[];
        if (republicIds.length > 0) {
          const { data: repsData, error: repsError } = await supa
            .from('republics')
            .select('id, title')
            .in('id', republicIds);

          if (repsError) throw repsError;

          const repMap: Record<string, string> = {};
          for (const r of repsData ?? []) repMap[r.id] = r.title;
          setRepublicsMap(repMap);
        }
      } catch (e: any) {
        console.error(e);
        setErr(e.message ?? 'Error');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ACCEPT: heq target-in (status = 'removed') dhe mbyll të gjitha raportet si accepted
  const handleAccept = async (report: ReportGroup) => {
    try {
      if (report.type !== 'user') {
        const table = report.type === 'post' ? 'posts' : 'comments';
        const { error: targetErr } = await supa
          .from(table)
          .update({ status: 'removed' })
          .eq('id', report.targetId);

        if (targetErr) throw targetErr;
      }

      const column = report.type === 'post' ? 'post_id' : report.type === 'comment' ? 'comment_id' : 'reported_user_id';
      const { error: repErr } = await supa
        .from('reports')
        .update({ status: 'accepted', resolved_at: new Date().toISOString() })
        .eq(column, report.targetId)
        .eq('status', 'pending');

      if (repErr) throw repErr;

      setReports((prev) => prev.filter((r) => r.id !== report.id));
    } catch (e: any) {
      console.error('ACCEPT ERROR:', e);
      setActionError(e.message ?? 'Error accepting report');
    }
  };

  // REJECT: lë target-in, mbyll raportet si rejected
  const handleReject = async (report: ReportGroup) => {
    try {
      const column = report.type === 'post' ? 'post_id' : report.type === 'comment' ? 'comment_id' : 'reported_user_id';
      const { error: repErr } = await supa
        .from('reports')
        .update({ status: 'rejected', resolved_at: new Date().toISOString() })
        .eq(column, report.targetId)
        .eq('status', 'pending');

      if (repErr) throw repErr;

      setReports((prev) => prev.filter((r) => r.id !== report.id));
    } catch (e: any) {
      console.error('REJECT ERROR:', e);
      setActionError(e.message ?? 'Error rejecting report');
    }
  };

  // ESCALATE: Assistant s'mund të zgjidhë vetë raportin, por mund t'ia
  // sinjalizojë direkt menaxherit të vet — pa pritur pragun e 3 raportimeve.
  const handleEscalate = async (report: ReportGroup) => {
    try {
      const { error } = await supa.rpc('escalate_report', {
        p_type: report.type,
        p_target_id: report.targetId,
      });
      if (error) throw error;
      setReports((prev) =>
        prev.map((r) => (r.id === report.id ? { ...r, escalatedAt: new Date().toISOString() } : r))
      );
    } catch (e: any) {
      console.error('ESCALATE ERROR:', e);
      setActionError(e.message ?? 'Error escalating report');
    }
  };

  // SUSPEND: pezullim read-only (posts/comments/votes/follows), me arsye
  // e detyrueshme dhe kohëzgjatje — mbyll edhe raportin si "accepted".
  function openSuspend(report: ReportGroup) {
    setSuspendReason('');
    setSuspendHours(24 * 7);
    setPendingSuspend(report);
  }

  async function submitSuspend() {
    if (!pendingSuspend) return;
    const clean = suspendReason.trim();
    if (!clean) return;
    setSuspendBusy(true);
    try {
      const { error } = await supa.rpc('suspend_user', {
        p_user_id: pendingSuspend.targetId,
        p_reason: clean,
        p_duration_hours: suspendHours,
      });
      if (error) throw error;

      const { error: repErr } = await supa
        .from('reports')
        .update({ status: 'accepted', resolved_at: new Date().toISOString() })
        .eq('reported_user_id', pendingSuspend.targetId)
        .eq('status', 'pending');
      if (repErr) throw repErr;

      setReports((prev) => prev.filter((r) => r.id !== pendingSuspend.id));
      setPendingSuspend(null);
    } catch (e: any) {
      console.error('SUSPEND ERROR:', e);
      setActionError(e.message ?? 'Error suspending user');
    } finally {
      setSuspendBusy(false);
    }
  }

  async function confirmUnsuspend() {
    if (!pendingUnsuspend) return;
    try {
      const { error } = await supa.rpc('unsuspend_user', { p_user_id: pendingUnsuspend.targetId });
      if (error) throw error;
      setUsersMap((prev) => ({
        ...prev,
        [pendingUnsuspend.targetId]: {
          ...prev[pendingUnsuspend.targetId],
          suspended_at: null,
          suspended_until: null,
          suspension_reason: null,
        },
      }));
    } catch (e: any) {
      console.error('UNSUSPEND ERROR:', e);
      setActionError(e.message ?? 'Error lifting suspension');
    } finally {
      setPendingUnsuspend(null);
    }
  }

  if (loading) {
    return (
      <div className="p-4">
        <h1 className="text-xl font-bold mb-4">Moderator Panel</h1>
        <p>Loading reports...</p>
      </div>
    );
  }

  if (err) {
    return (
      <div className="p-4">
        <h1 className="text-xl font-bold mb-4">Moderator Panel</h1>
        <p className="text-red-600">Error: {err}</p>
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold">Moderator Panel</h1>
          <a href="/" className="px-3 py-1 border rounded text-sm">
            Home
          </a>
        </div>
        <p>No pending reports.</p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">Moderator Panel</h1>
        <a href="/" className="px-3 py-1 border rounded text-sm">
          Home
        </a>
      </div>

      <div className="space-y-3">
        {reports.map((r) => (
          <div key={r.id} className="border rounded p-3 flex flex-col gap-1 bg-white">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-gray-500">
                {new Date(r.firstReportedAt).toLocaleString()}
              </span>
              {r.escalatedAt && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">
                  🚩 Escalated{r.escalatedByUsername ? ` by @${r.escalatedByUsername}` : ''}
                </span>
              )}
            </div>

            <div>
              <span className="font-semibold">Reports:</span> {r.reportCount}
            </div>

            <div>
              <span className="font-semibold">Type:</span> {r.type}
            </div>

            <div>
              <span className="font-semibold">Republic:</span>{' '}
              {r.type === 'user'
                ? 'Global (account report)'
                : r.republicId
                ? republicsMap[r.republicId] ?? r.republicId.slice(0, 8)
                : 'Unknown'}
            </div>

            {r.type === 'post' && (
              <div>
                <span className="font-semibold">Post:</span>{' '}
                {postsMap[r.targetId]
                  ? postsMap[r.targetId].title || postsMap[r.targetId].body?.slice(0, 80)
                  : r.targetId}
              </div>
            )}

            {r.type === 'comment' && (
              <div>
                <span className="font-semibold">Comment:</span>{' '}
                {commentsMap[r.targetId] ? commentsMap[r.targetId].body?.slice(0, 80) : r.targetId}
              </div>
            )}

            {r.type === 'user' && (
              <div>
                <span className="font-semibold">User:</span>{' '}
                {usersMap[r.targetId]
                  ? `@${usersMap[r.targetId].username}${usersMap[r.targetId].display_name ? ` (${usersMap[r.targetId].display_name})` : ''}`
                  : r.targetId}
                {usersMap[r.targetId]?.suspended_at &&
                  (!usersMap[r.targetId].suspended_until ||
                    new Date(usersMap[r.targetId].suspended_until) > new Date()) && (
                    <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 font-medium">
                      ⛔ Suspended{usersMap[r.targetId].suspended_until
                        ? ` until ${new Date(usersMap[r.targetId].suspended_until).toLocaleDateString()}`
                        : ' permanently'}
                    </span>
                  )}
              </div>
            )}

            <div className="mt-2 flex gap-2 items-center">
              {canResolve(r.republicId) ? (
                <>
                  <button onClick={() => handleAccept(r)} className="px-3 py-1 border rounded">
                    ✓ Accept
                  </button>

                  <button onClick={() => handleReject(r)} className="px-3 py-1 border rounded">
                    ✕ Reject
                  </button>
                </>
              ) : r.escalatedAt ? (
                <span className="text-xs text-gray-500 italic">
                  Escalated — waiting on a Manager to resolve it.
                </span>
              ) : (
                <button
                  onClick={() => handleEscalate(r)}
                  className="px-3 py-1 border border-red-300 text-red-700 rounded hover:bg-red-50"
                >
                  🚩 Escalate to Manager
                </button>
              )}

              {r.type === 'post' && (
                <a href={`/post/${r.targetId}`} className="px-3 py-1 border rounded">
                  Open post
                </a>
              )}

              {r.type === 'user' && usersMap[r.targetId] && (
                <a href={`/profile/${usersMap[r.targetId].username}`} className="px-3 py-1 border rounded">
                  Open profile
                </a>
              )}

              {r.type === 'user' && canSuspend() && (
                usersMap[r.targetId]?.suspended_at &&
                (!usersMap[r.targetId].suspended_until || new Date(usersMap[r.targetId].suspended_until) > new Date()) ? (
                  <button
                    onClick={() => setPendingUnsuspend(r)}
                    className="px-3 py-1 border rounded text-gray-700 hover:bg-gray-50"
                  >
                    Lift suspension
                  </button>
                ) : (
                  <button
                    onClick={() => openSuspend(r)}
                    className="px-3 py-1 border border-orange-300 text-orange-700 rounded hover:bg-orange-50"
                  >
                    ⛔ Suspend
                  </button>
                )
              )}
            </div>
          </div>
        ))}
      </div>

      {actionError && (
        <div className="fixed bottom-4 right-4 bg-red-50 border border-red-200 text-red-800 text-sm rounded-lg px-4 py-3 shadow-lg z-40 max-w-sm">
          {actionError}
          <button onClick={() => setActionError(null)} className="ml-3 text-red-600 underline">Dismiss</button>
        </div>
      )}

      {pendingSuspend && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={() => !suspendBusy && setPendingSuspend(null)}
        >
          <div
            className="w-full max-w-sm bg-white rounded-xl border shadow p-5 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-semibold">
              Suspend @{usersMap[pendingSuspend.targetId]?.username ?? pendingSuspend.targetId}
            </h3>
            <p className="text-sm text-gray-600">
              They'll still be able to sign in and browse, but won't be able to post, comment, vote, or
              follow until the suspension is lifted.
            </p>

            <label className="block text-xs font-medium text-gray-600">Duration</label>
            <select
              className="w-full border rounded-md px-2 py-1.5 text-sm"
              value={suspendHours === null ? 'permanent' : String(suspendHours)}
              onChange={(e) =>
                setSuspendHours(e.target.value === 'permanent' ? null : parseInt(e.target.value, 10))
              }
            >
              {SUSPEND_DURATIONS.map((d) => (
                <option key={d.label} value={d.hours === null ? 'permanent' : String(d.hours)}>
                  {d.label}
                </option>
              ))}
            </select>

            <label className="block text-xs font-medium text-gray-600">Reason (required)</label>
            <textarea
              autoFocus
              className="w-full border rounded-md px-3 py-2 text-sm min-h-[80px]"
              value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value)}
              placeholder="Why is this account being suspended?"
            />

            <div className="flex justify-end gap-2 pt-1">
              <button
                className="h-9 px-4 rounded border text-sm"
                onClick={() => setPendingSuspend(null)}
                disabled={suspendBusy}
              >
                Cancel
              </button>
              <button
                className="h-9 px-4 rounded bg-orange-600 text-white text-sm disabled:opacity-60"
                onClick={submitSuspend}
                disabled={suspendBusy || !suspendReason.trim()}
              >
                {suspendBusy ? 'Suspending…' : 'Suspend'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!pendingUnsuspend}
        title={`Lift suspension for @${pendingUnsuspend ? usersMap[pendingUnsuspend.targetId]?.username ?? pendingUnsuspend.targetId : ''}?`}
        message="They'll immediately regain the ability to post, comment, vote, and follow."
        confirmLabel="Lift suspension"
        onConfirm={confirmUnsuspend}
        onCancel={() => setPendingUnsuspend(null)}
      />
    </div>
  );
}
