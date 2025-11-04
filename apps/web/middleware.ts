// apps/web/middleware.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

// 3 kërkesa / sek / IP për /api/*
const buckets = new Map<string, { n: number; t: number }>();
const WINDOW_MS = 1000;
const MAX_REQ = 3;

function getClientIp(req: NextRequest): string {
  // Rend prioritar: x-forwarded-for -> x-real-ip -> cf-connecting-ip -> fallback
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  const xri = req.headers.get("x-real-ip");
  if (xri) return xri.trim();
  const cf = req.headers.get("cf-connecting-ip");
  if (cf) return cf.trim();
  return "127.0.0.1";
}

export function middleware(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith("/api/")) {
    const ip = getClientIp(req);
    const now = Date.now();
    const b = buckets.get(ip) ?? { n: 0, t: now };
    if (now - b.t > WINDOW_MS) {
      b.n = 0;
      b.t = now;
    }
    b.n++;
    buckets.set(ip, b);
    if (b.n > MAX_REQ) {
      return NextResponse.json({ error: "rate_limited" }, { status: 429 });
    }
  }
  return NextResponse.next();
}

export const config = { matcher: ["/api/:path*"] };
