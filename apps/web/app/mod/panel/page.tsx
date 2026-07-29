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
};

const MIN_REPORTS = 3;

export default function ModPanel() {
  const [reports, setReports] = useState<ReportGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [postsMap, setPostsMap] = useState<Record<string, any>>({});
  const [commentsMap, setCommentsMap] = useState<Record<string, any>>({});
  const [republicsMap, setRepublicsMap] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setErr(null);

        const { data, error } = await supa
          .from('reports')
          .select('post_id, comment_id, created_at')
          .eq('status', 'pending')
          .order('created_at', { ascending: true });

        if (error) throw error;

        // Grupojmë në kod: një grup për post_id, një për comment_id
        const groups = new Map<string, ReportGroup>();
        for (const r of data ?? []) {
          const type: 'post' | 'comment' = r.post_id ? 'post' : 'comment';
          const targetId = r.post_id ?? r.comment_id;
          if (!targetId) continue;

          const key = `${type}:${targetId}`;
          const existing = groups.get(key);
          if (existing) {
            existing.reportCount += 1;
          } else {
            groups.set(key, {
              id: key,
              targetId,
              type,
              firstReportedAt: r.created_at,
              reportCount: 1,
              republicId: null,
            });
          }
        }

        let reportsData = Array.from(groups.values())
          .filter((g) => g.reportCount >= MIN_REPORTS)
          .sort((a, b) => b.reportCount - a.reportCount);

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
            <div className="text-xs text-gray-500">
              {new Date(r.firstReportedAt).toLocaleString()}
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

            <div className="mt-2 flex gap-2">
              <button onClick={() => handleAccept(r)} className="px-3 py-1 border rounded">
                ✓ Accept
              </button>

              <button onClick={() => handleReject(r)} className="px-3 py-1 border rounded">
                ✕ Reject
              </button>

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
