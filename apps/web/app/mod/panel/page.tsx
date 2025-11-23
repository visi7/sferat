'use client';

import { useEffect, useState } from 'react';
import { supa } from '@/lib/supabase';

type ReportRow = {
  id: string;                 // ID sintetike për React
  target_id: string;
  type: 'post' | 'comment';
  created_at: string;
  report_count: number;
};

export default function ModPanel() {
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [postsMap, setPostsMap] = useState<Record<string, any>>({});
  const [commentsMap, setCommentsMap] = useState<Record<string, any>>({});

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setErr(null);

        const MIN_REPORTS = 3;

        // Lexojmë nga VIEW mod_reports
        const { data, error } = await supa
          .from('mod_reports')
          .select('target_id, type, report_count, first_reported_at')
          .gte('report_count', MIN_REPORTS)
          .order('first_reported_at', { ascending: false });

        if (error) throw error;

        const reportsData: ReportRow[] = (data ?? []).map((r: any) => ({
          id: `${r.type}:${r.target_id}`,
          target_id: r.target_id,
          type: r.type,
          created_at: r.first_reported_at,
          report_count: r.report_count,
        }));

        setReports(reportsData);

        // Mbledhim id-të për të lexuar postet/komentet
        const postIds = reportsData
          .filter((r) => r.type === 'post')
          .map((r) => r.target_id);

        const commentIds = reportsData
          .filter((r) => r.type === 'comment')
          .map((r) => r.target_id);

        // Postet
        if (postIds.length > 0) {
          const { data: postsData, error: postsError } = await supa
            .from('posts')
            .select('id, title, body')
            .in('id', postIds);

          if (postsError) throw postsError;

          const map: Record<string, any> = {};
          for (const p of postsData ?? []) {
            map[p.id] = p;
          }
          setPostsMap(map);
        }

        // Komentet
        if (commentIds.length > 0) {
          const { data: commentsData, error: commentsError } = await supa
            .from('comments')
            .select('id, body')
            .in('id', commentIds);

          if (commentsError) throw commentsError;

          const map: Record<string, any> = {};
          for (const c of commentsData ?? []) {
            map[c.id] = c;
          }
          setCommentsMap(map);
        }
      } catch (e: any) {
        console.error(e);
        setErr(e.message ?? 'Error');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ACCEPT: fsheh target-in dhe shënon të gjitha raportet si accepted
  const handleAccept = async (report: ReportRow) => {
    try {
      if (report.type === 'post') {
        const { error: postErr } = await supa
          .from('posts')
          .update({ hidden: true })
          .eq('id', report.target_id);

        if (postErr) throw postErr;
      } else {
        const { error: commentErr } = await supa
          .from('comments')
          .update({ hidden: true })
          .eq('id', report.target_id);

        if (commentErr) throw commentErr;
      }

      const { error: repErr } = await supa
        .from('reports')
        .update({
          status: 'accepted',
          resolved_at: new Date().toISOString(),
        })
        .eq('target_id', report.target_id)
        .eq('type', report.type)
        .eq('status', 'pending');

      if (repErr) throw repErr;

      setReports((prev) => prev.filter((r) => r.id !== report.id));
    } catch (e: any) {
      console.error('ACCEPT ERROR:', e);
      alert(e.message ?? 'Error accepting report');
    }
  };

  // REJECT: lë target-in, mbyll raportet si rejected
  const handleReject = async (report: ReportRow) => {
    try {
      const { error: repErr } = await supa
        .from('reports')
        .update({
          status: 'rejected',
          resolved_at: new Date().toISOString(),
        })
        .eq('target_id', report.target_id)
        .eq('type', report.type)
        .eq('status', 'pending');

      if (repErr) throw repErr;

      setReports((prev) => prev.filter((r) => r.id !== report.id));
    } catch (e: any) {
      console.error('REJECT ERROR:', e);
      alert(e.message ?? 'Error rejecting report');
    }
  };

  // UI
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
          <div
            key={r.id}
            className="border rounded p-3 flex flex-col gap-1 bg-white"
          >
            <div className="text-xs text-gray-500">
              {new Date(r.created_at).toLocaleString()}
            </div>

            <div>
              <span className="font-semibold">Reports:</span>{' '}
              {r.report_count}
            </div>

            <div>
              <span className="font-semibold">Type:</span> {r.type}
            </div>

            {r.type === 'post' && (
              <div>
                <span className="font-semibold">Post:</span>{' '}
                {postsMap[r.target_id]
                  ? postsMap[r.target_id].title ||
                    postsMap[r.target_id].body?.slice(0, 80)
                  : r.target_id}
              </div>
            )}

            {r.type === 'comment' && (
              <div>
                <span className="font-semibold">Comment:</span>{' '}
                {commentsMap[r.target_id]
                  ? commentsMap[r.target_id].body?.slice(0, 80)
                  : r.target_id}
              </div>
            )}

            <div className="mt-2 flex gap-2">
              <button
                onClick={() => handleAccept(r)}
                className="px-3 py-1 border rounded"
              >
                ✓ Accept
              </button>

              <button
                onClick={() => handleReject(r)}
                className="px-3 py-1 border rounded"
              >
                ✕ Reject
              </button>

              {r.type === 'post' && (
                <a
                  href={`/post/${r.target_id}`}
                  className="px-3 py-1 border rounded"
                >
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
