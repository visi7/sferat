"use client";

import { useEffect, useState } from "react";
import { supa } from "@/lib/supabase";
import Shell from "@/components/shell";
import LeftNav from "@/components/LeftNav";
import RightAside from "@/components/RightAside";

type ReportRow = {
  id: string;
  created_at: string;
  reason: string | null;
  status: string | null;
  post_id: string | null;
};

export default function ModPanel() {
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [err, setErr] = useState<string | null>(null);

  // Guard + load
  useEffect(() => {
    (async () => {
      try {
        const s = (await supa.auth.getSession()).data.session;
        const uid = s?.user?.id;
        if (!uid) { setAllowed(false); setLoading(false); return; }

        const { data: roles } = await supa
          .from("user_roles")
          .select("role")
          .eq("user_id", uid)
          .in("role", ["admin","moderator"])
          .limit(1);

        const ok = !!roles && roles.length > 0;
        setAllowed(ok);
        if (!ok) { setLoading(false); return; }

        // ngarko raportet e hapura
        const { data, error } = await supa
          .from("reports")
          .select("id,created_at,reason,status,post_id")
          .order("created_at", { ascending: false })
          .limit(100);

        if (error) throw error;
        setReports(data ?? []);
      } catch (e: any) {
        setErr(e.message ?? "Error");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function approve(id: string) {
    const { error } = await supa.rpc("approve_report", { p_report_id: id });
    if (error) return alert(error.message);
    setReports(r => r.map(x => x.id === id ? { ...x, status: "accepted" } : x));
  }
  async function reject(id: string) {
    const { error } = await supa.rpc("reject_report", { p_report_id: id });
    if (error) return alert(error.message);
    setReports(r => r.map(x => x.id === id ? { ...x, status: "rejected" } : x));
  }

  return (
    <Shell left={<LeftNav />} right={<RightAside />}>
      <h2 className="text-xl font-semibold mb-4">Moderator Panel</h2>

      {loading && <p>Loading…</p>}
      {!loading && !allowed && <p className="text-red-600">403 — Only moderators can view this page.</p>}
      {err && <p className="text-red-600">Error: {err}</p>}

      {allowed && !loading && (
        <div className="space-y-3">
          {reports.length === 0 ? (
            <p className="text-gray-600">No pending reports.</p>
          ) : reports.map(r => (
            <div key={r.id} className="border rounded-lg p-3 bg-white">
              <div className="text-xs text-gray-500">
                {new Date(r.created_at).toLocaleString()}
              </div>
              <div className="mt-1">
                <div><span className="font-medium">Post:</span> {r.post_id}</div>
                <div><span className="font-medium">Reason:</span> {r.reason ?? "-"}</div>
                <div><span className="font-medium">Status:</span> {r.status ?? "pending"}</div>
              </div>
              <div className="mt-2 flex gap-2">
                <button className="px-3 py-1 rounded border hover:bg-gray-50" onClick={() => approve(r.id)}>✓ Accept</button>
                <button className="px-3 py-1 rounded border hover:bg-gray-50" onClick={() => reject(r.id)}>✗ Reject</button>
                <a className="px-3 py-1 rounded border hover:bg-gray-50" href={`/post/${r.post_id}`} target="_blank">Open post</a>
              </div>
            </div>
          ))}
        </div>
      )}
    </Shell>
  );
}
