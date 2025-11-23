// apps/web/app/mod/reports/page.tsx

import { supa } from '@/lib/supabase';

export default async function ModeratorPage() {
  
  // MARRIM RAPORTET - VËRE: NUK KA post_id KËTU
  const { data: reports, error } = await supa
    .from('reports')
    .select('id, target_id, type, reason, status, created_at, reporter_id')
    .order('created_at', { ascending: false });

  if (error) {
    return (
      <div className="p-4">
        <h1 className="text-xl font-bold mb-4">Moderator Panel</h1>
        <p className="text-red-600">Error loading reports: {error.message}</p>
      </div>
    );
  }

  if (!reports || reports.length === 0) {
    return (
      <div className="p-4">
        <h1 className="text-xl font-bold mb-4">Moderator Panel</h1>
        <p>No pending reports.</p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">Moderator Panel</h1>

      <div className="space-y-3">
        {reports.map((r: any) => (
          <div
            key={r.id}
            className="border rounded p-3 flex flex-col gap-1"
          >
            <div>
              <span className="font-semibold">Type:</span>{' '}
              {r.type}
            </div>
            <div>
              <span className="font-semibold">Target ID:</span>{' '}
              {r.target_id}
            </div>
            <div>
              <span className="font-semibold">Status:</span>{' '}
              {r.status}
            </div>
            <div>
              <span className="font-semibold">Reason:</span>{' '}
              {r.reason}
            </div>
            <div className="text-xs text-gray-500">
              Report ID: {r.id}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
