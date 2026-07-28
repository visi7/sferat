"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supa } from "@/lib/supabase";

// Editimi i profilit (emri, avatari, bio, credentials, topics) tani bëhet
// direkt te /profile/[username] — kjo faqe mbetet vetëm si ridrejtim, që
// linqet e vjetra të mos thyhen.
export default function EditProfileRedirect() {
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const sess = (await supa.auth.getSession()).data.session;
      const uid = sess?.user.id;
      if (!uid) {
        router.replace("/sign-in");
        return;
      }

      const { data } = await supa
        .from("profiles")
        .select("username")
        .eq("id", uid)
        .single();

      router.replace(data?.username ? `/profile/${data.username}` : "/");
    })();
  }, [router]);

  return <div className="max-w-3xl mx-auto p-5 text-sm text-gray-500">Redirecting…</div>;
}
