"use client";
import { supa } from "@/lib/supabase";

export async function followRepublic(republicId: string) {
  const session = (await supa.auth.getSession()).data.session;
  if (!session) throw new Error("Jo i loguar");
  const userId = session.user.id;
  const { error } = await supa.from("follows_republics").upsert(
    { follower_id: userId, republic_id: republicId },
    { onConflict: "follower_id,republic_id" }
  );
  if (error) throw error;
}

export async function unfollowRepublic(republicId: string) {
  const session = (await supa.auth.getSession()).data.session;
  if (!session) throw new Error("Jo i loguar");
  const userId = session.user.id;
  const { error } = await supa.from("follows_republics")
    .delete()
    .eq("follower_id", userId)
    .eq("republic_id", republicId);
  if (error) throw error;
}
