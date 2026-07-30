import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// Bans the calling user's auth account (server-side only — needs the
// service_role key, which must never reach the browser). We ban instead
// of deleting the auth.users row because profiles/posts/comments cascade
// off it; deleting would silently wipe every post/comment the user ever
// made. The client anonymizes its own profiles row first (self-service,
// covered by the existing profiles_update_self RLS policy) — this route
// only handles the part a normal client can never do: preventing the
// account from signing in again.
export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.replace("Bearer ", "").trim();
  if (!token) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey);

  // Derive the user id from the token itself — never trust a client-supplied id.
  const { data: userData, error: userErr } = await admin.auth.getUser(token);
  if (userErr || !userData?.user) {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  }

  const { error: banErr } = await admin.auth.admin.updateUserById(userData.user.id, {
    ban_duration: "876000h", // ~100 years, effectively permanent
  });
  if (banErr) {
    return NextResponse.json({ error: banErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
