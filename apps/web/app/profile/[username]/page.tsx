"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supa } from "@/lib/supabase";
import { prepareImageFile } from "@/lib/imageUpload";
import Toast from "@/components/Toast";
import Shell from "@/components/shell";
import LeftNav from "@/components/LeftNav";
import ProfileHeader from "@/components/ProfileHeader";
import PostCard from "@/components/postCard";
import ProfileRight, { type ProfileInfo } from "@/components/ProfileRight";
import { InboxIcon, MessageCircleIcon, PencilIcon } from "@/components/Icons";
import { ListSkeleton } from "@/components/Skeleton";
import EmptyState from "@/components/EmptyState";
import Link from "next/link";

type Profile = { id:string; username:string; display_name:string|null; bio:string|null; avatar_url:string|null };
type Post = { id:string; title:string; body:string; created_at:string; score:number; republic_id:string; author_id:string };
type Comment = { id:string; post_id:string; body:string; created_at:string; score:number; postTitle:string };
type Stats = { postsCount:number; commentsCount:number; karma:number; convincedCount:number };

export default function ProfilePage() {
  const params = useParams<{ username: string }>();
  const username = (params?.username ?? "").toString();

  const [me, setMe] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileInfo | null>(null);
  const [tab, setTab] = useState<"profile"|"posts"|"comments"|"activity">("profile");
  const [posts, setPosts] = useState<Post[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [stats, setStats] = useState<Stats | undefined>(undefined);
  const [editingBio, setEditingBio] = useState(false);
  const [bioValue, setBioValue] = useState("");
  const [savingBio, setSavingBio] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!username) return;
    (async () => {
      const sess = (await supa.auth.getSession()).data.session;
      setMe(sess?.user.id ?? null);

      const { data: p } = await supa
        .from("profiles")
        .select("id, username, display_name, bio, avatar_url, created_at, employment, education, location, topics, credentials_private")
        .eq("username", username)
        .single();

      if (!p) { setProfile(null); setLoading(false); return; }
      setProfile(p as any);
      setBioValue((p as any).bio ?? "");

      const ps = await supa
        .from("posts")
        .select("id,title,body,created_at,score,republic_id,author_id")
        .eq("author_id", (p as any).id)
        .order("created_at", { ascending: false })
        .limit(20);
      setPosts(ps.data ?? []);

      const cs = await supa
        .from("comments")
        .select("id, post_id, body, created_at, score")
        .eq("author_id", (p as any).id)
        .order("created_at", { ascending: false })
        .limit(20);

      const commentRows = cs.data ?? [];
      const postIds = Array.from(new Set(commentRows.map((c) => c.post_id)));
      let postTitleMap: Record<string, string> = {};
      if (postIds.length) {
        const { data: relatedPosts } = await supa
          .from("posts")
          .select("id,title")
          .in("id", postIds);
        for (const rp of relatedPosts ?? []) postTitleMap[rp.id] = rp.title;
      }
      setComments(
        commentRows.map((c) => ({
          ...c,
          postTitle: postTitleMap[c.post_id] ?? "a post",
        }))
      );

      // Contribution stats: llogaritur nga të dhëna reale, jo të deklaruara
      const [allPosts, allComments] = await Promise.all([
        supa.from("posts").select("score").eq("author_id", (p as any).id).neq("status", "removed"),
        supa.from("comments").select("id,score").eq("author_id", (p as any).id).neq("status", "removed"),
      ]);
      const postsCount = allPosts.data?.length ?? 0;
      const commentsCount = allComments.data?.length ?? 0;
      const karma =
        (allPosts.data ?? []).reduce((s, r) => s + (r.score ?? 0), 0) +
        (allComments.data ?? []).reduce((s, r) => s + (r.score ?? 0), 0);

      const myCommentIds = (allComments.data ?? []).map((r) => r.id);
      let convincedCount = 0;
      if (myCommentIds.length) {
        const { count } = await supa
          .from("comment_convinces")
          .select("comment_id", { count: "exact", head: true })
          .in("comment_id", myCommentIds);
        convincedCount = count ?? 0;
      }

      setStats({ postsCount, commentsCount, karma, convincedCount });
      setLoading(false);
    })();
  }, [username]);

  function doSignOut(): void {
    throw new Error("Function not implemented.");
  }

  // ... imports dhe state si i ke tani

// këto i ke tashmë te file: uploadAvatar, saveBasics, doSignOut
// (ruaji siç i ke – thjesht do i kalojmë te ProfileHeader)
async function uploadAvatar(file: File) {
  // kontroll bazik
  if (!file) return;
  // nëse ke një state me id-në e përdoruesit, p.sh. me, përdore;
  // në të kundërt, merre nga session këtu:
  const sess = (await supa.auth.getSession()).data.session;
  const me = sess?.user.id;
  if (!me) throw new Error("Not signed in");

  const readyFile = await prepareImageFile(file);
  const ext = (readyFile.name.split(".").pop() || "jpg").toLowerCase();
  const fileName = `${me}-${Date.now()}.${ext}`;

  // 1) ngarko në bucket "avatars"
  const { error: upErr } = await supa.storage
    .from("avatars")
    .upload(fileName, readyFile, { upsert: true });
  if (upErr) throw upErr;

  // 2) mer URL publike
  const { data } = supa.storage.from("avatars").getPublicUrl(fileName);
  const publicUrl = data.publicUrl;

  // 3) përditëso profilin
  const { error: dbErr } = await supa
    .from("profiles")
    .update({ avatar_url: publicUrl })
    .eq("id", me);
  if (dbErr) throw dbErr;

  setProfile((p) => (p ? { ...p, avatar_url: publicUrl } : p));
}

async function updateDisplayName(name: string) {
  const sess = (await supa.auth.getSession()).data.session;
  const uid = sess?.user.id;
  if (!uid) throw new Error("Not signed in");

  const { error } = await supa
    .from("profiles")
    .update({ display_name: name })
    .eq("id", uid);
  if (error) throw error;

  setProfile((p) => (p ? { ...p, display_name: name } : p));
}

async function saveBio() {
  const sess = (await supa.auth.getSession()).data.session;
  const uid = sess?.user.id;
  if (!uid) return;

  setSavingBio(true);
  try {
    const clean = bioValue.trim();
    const { error } = await supa.from("profiles").update({ bio: clean || null }).eq("id", uid);
    if (error) throw error;
    setProfile((p) => (p ? { ...p, bio: clean || null } : p));
    setEditingBio(false);
  } catch (err: any) {
    setErrorMsg(err.message ?? "Saving failed");
  } finally {
    setSavingBio(false);
  }
}

const isMe = me === profile?.id;
return (
    <Shell
      left={<LeftNav />}
      right={profile ? <ProfileRight profile={profile} isMe={me === profile.id} stats={stats} viewerLoggedIn={!!me} /> : null}
      rightInDrawerOnMobile={false}
    >
    <div className="space-y-4">
      {!profile ? (
        <div className="bg-white border rounded-xl p-5">Profile not found.</div>
      ) : (
        <>
          <ProfileHeader
            profile={profile}
            isMe={me === profile.id}
            onUploadAvatar={uploadAvatar}
            onUpdateDisplayName={updateDisplayName}
            onSignOut={doSignOut}
            onShowActivity={() => setTab("activity")}
          />

          {/* Tabs */}
          <div className="bg-white border rounded-xl p-2">
            <div className="flex items-center gap-2 border-b px-2">
              <Tab label="Profile"  active={tab==="profile"}  onClick={()=>setTab("profile")} />
              <Tab label="Posts"    active={tab==="posts"}    onClick={()=>setTab("posts")} />
              <Tab label="Comments" active={tab==="comments"} onClick={()=>setTab("comments")} />
            </div>

            <div className="p-4">
              {tab === "profile" && (
                editingBio ? (
                  <div className="space-y-2">
                    <textarea
                      autoFocus
                      id="profile-bio"
                      name="bio"
                      aria-label="Bio"
                      className="w-full border rounded-md px-3 py-2 text-sm min-h-[100px]"
                      placeholder="Write something about yourself…"
                      value={bioValue}
                      onChange={(e) => setBioValue(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <button
                        className="px-3 py-1.5 text-xs rounded-md bg-black text-white disabled:opacity-60"
                        onClick={saveBio}
                        disabled={savingBio}
                      >
                        {savingBio ? "Saving…" : "Save"}
                      </button>
                      <button
                        className="px-3 py-1.5 text-xs rounded-md border text-gray-600"
                        onClick={() => {
                          setBioValue(profile.bio ?? "");
                          setEditingBio(false);
                        }}
                        disabled={savingBio}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    {profile.bio ? (
                      <p className="text-sm text-gray-700 whitespace-pre-wrap break-words">{profile.bio}</p>
                    ) : !loading ? (
                      <p className="text-sm text-gray-500">No bio yet.</p>
                    ) : null}
                    {isMe && (
                      <button
                        className="mt-2 text-xs px-3 py-1.5 rounded-md border hover:bg-gray-50"
                        onClick={() => setEditingBio(true)}
                      >
                        {profile.bio ? "Edit bio" : "Add bio"}
                      </button>
                    )}
                  </div>
                )
              )}

              {tab === "posts" && (
                loading ? <ListSkeleton count={4} /> :
                posts.length === 0 ? <EmptyState icon={InboxIcon} title="No posts yet" compact /> :
                <div className="space-y-3">{posts.map(p => (
                  <PostCard key={p.id} {...p} onChanged={()=>{}} />
                ))}</div>
              )}

              {tab === "comments" && (
                loading ? <ListSkeleton count={4} /> :
                comments.length === 0 ? <EmptyState icon={MessageCircleIcon} title="No comments yet" compact /> :
                <div className="space-y-3">
                  {comments.map(c => (
                    <article key={c.id} className="bg-white border rounded-xl p-4">
                      <img
                        src={profile.avatar_url || "/default-avatar.png"}
                         className="w-6 h-6 rounded-full object-cover mr-2"
                          alt=""
                            />
                          <span className="text-xs text-gray-600">@{profile.username}</span>

                      <div className="text-xs text-gray-500">
                        {new Date(c.created_at).toLocaleString()} — on{" "}
                        <Link className="underline" href={`/post/${c.post_id}`}>{c.postTitle}</Link>
                      </div>
                      <div className="mt-1 whitespace-pre-wrap break-words">{c.body}</div>
                    </article>
                  ))}
                </div>
              )}

              {tab === "activity" && (
                (() => {
                  const activity = [
                    ...posts.map((p) => ({ kind: "post" as const, at: p.created_at, post: p })),
                    ...comments.map((c) => ({ kind: "comment" as const, at: c.created_at, comment: c })),
                  ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

                  if (loading) return <ListSkeleton count={4} />;
                  if (activity.length === 0) return <EmptyState icon={InboxIcon} title="No activity yet" compact />;

                  return (
                    <div className="space-y-3">
                      {activity.map((item) =>
                        item.kind === "post" ? (
                          <div key={`p-${item.post.id}`} className="flex items-start gap-2 text-sm">
                            <PencilIcon className="w-3.5 h-3.5 text-gray-400 mt-0.5" />
                            <div>
                              <span className="text-gray-600">Posted</span>{" "}
                              <Link className="underline" href={`/post/${item.post.id}`}>
                                {item.post.title || item.post.body.slice(0, 60)}
                              </Link>
                              <div className="text-xs text-gray-500">
                                {new Date(item.at).toLocaleString()}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div key={`c-${item.comment.id}`} className="flex items-start gap-2 text-sm">
                            <MessageCircleIcon className="w-3.5 h-3.5 text-gray-400 mt-0.5" />
                            <div>
                              <span className="text-gray-600">Commented on</span>{" "}
                              <Link className="underline" href={`/post/${item.comment.post_id}`}>
                                {item.comment.postTitle}
                              </Link>
                              <div className="text-gray-700">{item.comment.body}</div>
                              <div className="text-xs text-gray-500">
                                {new Date(item.at).toLocaleString()}
                              </div>
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  );
                })()
              )}
            </div>
          </div>
        </>
      )}
    </div>
    <Toast message={errorMsg} onClose={() => setErrorMsg(null)} />
  </Shell>
);

}

function Tab({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-2 text-sm border-b-2 -mb-[1px] ${
        active ? "border-black font-medium" : "border-transparent text-gray-500 hover:text-black"
      }`}
    >
      {label}
    </button>
  );
}
