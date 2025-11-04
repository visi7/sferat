// apps/web/app/health/route.ts
export const runtime = "edge";
export async function GET() {
  return new Response(JSON.stringify({ ok: true, ts: Date.now() }), { status: 200 });
}
