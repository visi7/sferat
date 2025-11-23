"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supa } from "@/lib/supabase";
import Shell from "@/components/shell";
import LeftNav from "@/components/LeftNav";
import ProfileHeader from "@/components/ProfileHeader";
import PostCard from "@/components/postCard";
import ProfileRight, { type ProfileInfo } from "@/components/ProfileRight";

type Profile = { id:string; username:string; display_name:string|null; bio:string|null; avatar_url:string|null };
type Post = { id:string; title:string; body:string; created_at:string; score:number; republic_id:string; author_id:string };
type Comment = {
  author: any; id:string; body:string; created_at:string; posts?: { id:string; title:string } 
};

export default function ProfilePage() {
  const params = useParams<{ username: string }>();
  const username = (params?.username ?? "").toString();

  const [me, setMe] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileInfo | null>(null);
  const [tab, setTab] = useState<"profile"|"posts"|"comments"|"activity">("profile");
  const [posts, setPosts] = useState<Post[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);

  useEffect(() => {
    if (!username) return;
    (async () => {
      const sess = (await supa.auth.getSession()).data.session;
      setMe(sess?.user.id ?? null);

      const { data: p } = await supa
        .from("profiles")
        .select("id, username, display_name, bio, avatar_url, created_at, employment, education, location, topics")
        .eq("username", username)
        .single();

      if (!p) { setProfile(null); return; }
      setProfile(p as any);

      const ps = await supa
        .from("posts")
        .select("id,title,body,created_at,score,republic_id,author_id")
        .eq("author_id", (p as any).id)
        .order("created_at", { ascending: false })
        .limit(20);
      setPosts(ps.data ?? []);

      const cs = await supa
        .from("comments")
        .select(`
  id, title, body, created_at, author_id, republic_id, score, image_url, post_type,
  profiles:profiles!posts_author_id_fkey ( id, username, avatar_url ),
  republics:republics!posts_republic_id_fkey ( id, title )
`)


        .eq("author_id", (p as any).id)
        .order("created_at", { ascending: false })
        .limit(20);
      setComments((cs.data as any) ?? []);
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

  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const fileName = `${me}-${Date.now()}.${ext}`;

  // 1) ngarko në bucket "avatars"
  const { error: upErr } = await supa.storage
    .from("avatars")
    .upload(fileName, file, { upsert: true });
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

  // opsionale: rifresko state-in lokal nëse e mban profilin në state
  // setProfile(p => p ? { ...p, avatar_url: publicUrl } : p);
}
const isMe = me === profile?.id;
return (
    <Shell
      left={<LeftNav />}
      right={profile ? <ProfileRight profile={profile} isMe={me === profile.id} /> : null}
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
            onSignOut={doSignOut}
          />

          {/* Tabs */}
          <div className="bg-white border rounded-xl p-2">
            <div className="flex items-center gap-2 border-b px-2">
              <Tab label="Profile"  active={tab==="profile"}  onClick={()=>setTab("profile")} />
              <Tab label="Posts"    active={tab==="posts"}    onClick={()=>setTab("posts")} />
              <Tab label="Comments" active={tab==="comments"} onClick={()=>setTab("comments")} />
              <Tab label="Activity" active={tab==="activity"} onClick={()=>setTab("activity")} />
            </div>

            <div className="p-4">
              {tab === "profile" && (
                // S’ka më "Write a description..." dhe link "Edit profile" këtu.
                // Nëse do form për emër/bio, mund ta mbash si më parë ose ta heqësh fare.
                profile.bio ? (
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{profile.bio}</p>
                ) : (
                  <p className="text-sm text-gray-500">No bio yet.</p>
                )
              )}

              {tab === "posts" && (
                posts.length === 0 ? <p>No posts yet.</p> :
                <div className="space-y-3">{posts.map(p => (
                  <PostCard key={p.id} {...p} onChanged={()=>{}} />
                ))}</div>
              )}

              {tab === "comments" && (
                comments.length === 0 ? <p>No comments yet.</p> :
                <div className="space-y-3">
                  {comments.map(c => (
                    <article key={c.id} className="bg-white border rounded-xl p-4">
                      <img
                        src={c.author?.avatar_url || "/default-avatar.png"}
                         className="w-6 h-6 rounded-full object-cover mr-2"
                          alt=""
                            />
                          <span className="text-xs text-gray-600">@{c.author?.username}</span>

                      <div className="text-xs text-gray-500">
                        {new Date(c.created_at).toLocaleString()} — on{" "}
                        <a className="underline" href={`/post/${c.posts?.id}`}>{c.posts?.title}</a>
                      </div>
                      <div className="mt-1 whitespace-pre-wrap">{c.body}</div>
                    </article>
                  ))}
                </div>
              )}

              {tab === "activity" && <p>Activity feed coming soon.</p>}
            </div>
          </div>
        </>
      )}
    </div>
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
