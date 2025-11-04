"use client";
import { supa } from "@/lib/supabase";

export async function vote(postId: string, value: 1 | -1) {
  const session = (await supa.auth.getSession()).data.session;
  if (!session) throw new Error("Jo i loguar");
  const userId = session.user.id;
  const { error } = await supa.from("votes").upsert(
    { user_id: userId, post_id: postId, value },
    { onConflict: "user_id,post_id" }
  );
  if (error) throw error;
}

export async function comment(postId: string, body: string) {
  const session = (await supa.auth.getSession()).data.session;
  if (!session) throw new Error("Jo i loguar");
  const userId = session.user.id;
  const { error } = await supa.from("comments").insert({ post_id: postId, body, author_id: userId });
  if (error) throw error;
}

export async function followUser(targetUserId: string) {
  const session = (await supa.auth.getSession()).data.session;
  if (!session) throw new Error("Jo i loguar");
  const userId = session.user.id;
  if (userId === targetUserId) throw new Error("S'mund të ndjekësh veten.");
  const { error } = await supa.from("follows_users").upsert(
    { follower_id: userId, followed_user_id: targetUserId },
    { onConflict: "follower_id,followed_user_id" }
  );
  if (error) throw error;
}

export async function unfollowUser(targetUserId: string) {
  const session = (await supa.auth.getSession()).data.session;
  if (!session) throw new Error("Jo i loguar");
  const userId = session.user.id;
  const { error } = await supa.from("follows_users")
    .delete()
    .eq("follower_id", userId)
    .eq("followed_user_id", targetUserId);
  if (error) throw error;
}

export async function savePost(postId: string) {
  const session = (await supa.auth.getSession()).data.session;
  if (!session) throw new Error("Jo i loguar");
  const userId = session.user.id;
  const { error } = await supa.from("bookmarks").upsert(
    { user_id: userId, post_id: postId },
    { onConflict: "user_id,post_id" }
  );
  if (error) throw error;
}

export async function unsavePost(postId: string) {
  const session = (await supa.auth.getSession()).data.session;
  if (!session) throw new Error("Jo i loguar");
  const userId = session.user.id;
  const { error } = await supa.from("bookmarks")
    .delete()
    .eq("user_id", userId)
    .eq("post_id", postId);
  if (error) throw error;
}
export async function reportPost(postId: string, reason: string) {
  const sess = (await supa.auth.getSession()).data.session;
  if (!sess) throw new Error("Duhet login.");
  const { error } = await supa.from("reports").insert({
    post_id: postId,
    reporter_id: sess.user.id,
    reason,
  });
  if (error) throw error;
}
