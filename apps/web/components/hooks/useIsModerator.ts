// apps/web/components/hooks/useIsModerator.ts
"use client";

import { useEffect, useState } from "react";
import { supa } from "@/lib/supabase";

export function useIsModerator() {
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
      const { data, error } = await supa
        .from("user_roles")
        .select("role")
        .eq("user_id", uid)
        .is("republic_id", null) // moderator global
        .maybeSingle();

      if (!alive) return;
      if (error) {
        setIsMod(false);
        return;
      }
      setIsMod(data?.role === "moderator");
    })();
    return () => { alive = false; };
  }, []);

  return isMod; // null | true | false
}
