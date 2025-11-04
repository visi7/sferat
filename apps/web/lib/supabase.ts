// apps/web/lib/supabase.ts
import { createClient } from "@supabase/supabase-js";

export const supa = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
