"use client";
import { useState } from "react";
import { supa } from "@/lib/supabase";

export default function EmailSignIn() {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supa.auth.signInWithPassword({ email, password: pw });
    if (error) return alert(error.message);
    window.location.href = "/";
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2 max-w-md">
      <p className="mt-3 text-sm">
  Nuk ke llogari?{" "}
  <a href="/sign-up" className="text-blue-600 underline">
    Krijo një llogari
  </a>
</p>
      <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="email" required />
      <input type="password" value={pw} onChange={e=>setPw(e.target.value)} placeholder="password" required />
      <button type="submit">Sign in</button>
    </form>
  );
}

