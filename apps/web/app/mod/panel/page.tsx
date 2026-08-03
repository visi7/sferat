'use client';

import { useEffect, useState } from 'react';
import { supa } from '@/lib/supabase';

type ReportGroup = {
  id: string;                 // ID sintetike për React: "post:<id>" | "comment:<id>"
  targetId: string;
  type: 'post' | 'comment';
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
  const [postsMap, setPostsMap] = useState<Record<string, any>>({});
  const [commentsMap, setCommentsMap] = useState<Record<string, any>>({});
  const [republicsMap, setRepublicsMap] = useState<Record<string, string>>({});
  const [myRoles, setMyRoles] = useState<{ role: string; republic_id: string | null }[]>([]);

  // Assistant-ët shohin raportet, por s'mund t'i zgjidhin (Accept/Reject) —
  // e njëjta rregull zbatohet edhe në RLS, kjo është vetëm për UI-në.
  function canResolve(republicId: string | null) {
    return myRoles.some(
      (r) =>
        ["admin", "director", "manager", "moderator"].includes(r.role) &&
        (r.republic_id === null || r.republic_id === republicId)
    );
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
          .select('post_id, comment_id, created_at, escalated_at, escalated_by')
          .eq('status', 'pending')
          .order('created_at', { ascending: true });

        if (error) throw error;

        // Grupojmë në kod: një grup për post_id, një për comment_id
        const groups = new Map<string, ReportGroup>();
        const escalatorIds = new Set<string>();
        for (const r of (data ?? []) as any[]) {
          const type: 'post' | 'comment' = r.post_id ? 'post' : 'comment';
          const targetId = r.post_id ?? r.comment_id;
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
          const type: 'post' | 'comment' = r.post_id ? 'post' : 'comment';
          const targetId = r.post_id ?? r.comment_id;
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
      const table = report.type === 'post' ? 'posts' : 'comments';
      const { error: targetErr } = await supa
        .from(table)
        .update({ status: 'removed' })
        .eq('id', report.targetId);

      if (targetErr) throw targetErr;

      const column = report.type === 'post' ? 'post_id' : 'comment_id';
      const { error: repErr } = await supa
        .from('reports')
        .update({ status: 'accepted', resolved_at: new Date().toISOString() })
        .eq(column, report.targetId)
        .eq('status', 'pending');

      if (repErr) throw repErr;

      setReports((prev) => prev.filter((r) => r.id !== report.id));
    } catch (e: any) {
      console.error('ACCEPT ERROR:', e);
      alert(e.message ?? 'Error accepting report');
    }
  };

  // REJECT: lë target-in, mbyll raportet si rejected
  const handleReject = async (report: ReportGroup) => {
    try {
      const column = report.type === 'post' ? 'post_id' : 'comment_id';
      const { error: repErr } = await supa
        .from('reports')
        .update({ status: 'rejected', resolved_at: new Date().toISOString() })
        .eq(column, report.targetId)
        .eq('status', 'pending');

      if (repErr) throw repErr;

      setReports((prev) => prev.filter((r) => r.id !== report.id));
    } catch (e: any) {
      console.error('REJECT ERROR:', e);
      alert(e.message ?? 'Error rejecting report');
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
      alert(e.message ?? 'Error escalating report');
    }
  };

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
              {r.republicId ? republicsMap[r.republicId] ?? r.republicId.slice(0, 8) : 'Unknown'}
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
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
