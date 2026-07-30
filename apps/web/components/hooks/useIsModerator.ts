// apps/web/components/hooks/useIsModerator.ts
"use client";

import { useEffect, useState } from "react";
import { supa } from "@/lib/supabase";

/**
 * A global admin/moderator (republic_id = null) counts everywhere.
 * A per-Republic moderator only counts for that specific Republic.
 * Pass no argument to check for a global role only.
 */
export function useIsModerator(republicId?: string) {
  const [isMod, setIsMod] = useState<boolean | null>(null); // null = duke verifikuar

  useEffect(() => {
    let alive = true;
    (async () => {
      const sess = (await supa.auth.getSession()).data.session;
      const uid = sess?.user.id;
      if (!uid) {
        if (alive) setIsMod(false);
        return;
      }

      let query = supa
        .from("user_roles")
        .select("role, republic_id")
        .eq("user_id", uid)
        .in("role", ["admin", "manager", "moderator", "assistant"]);

      query = republicId
        ? query.or(`republic_id.is.null,republic_id.eq.${republicId}`)
        : query.is("republic_id", null);

      const { data, error } = await query.limit(1);

      if (!alive) return;
      if (error) {
        setIsMod(false);
        return;
      }
      setIsMod((data?.length ?? 0) > 0);
    })();
    return () => { alive = false; };
  }, [republicId]);

  return isMod; // null | true | false
}
