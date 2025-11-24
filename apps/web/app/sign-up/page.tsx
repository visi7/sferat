"use client";

import { useState } from "react";
import { supa } from "@/lib/supabase";

export default function SignUpPage() {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const { data, error } = await supa.auth.signUp({
      email,
      password: pw,
      // nëse do të përdorësh verifikim me email/callback:
      // options: {
      //   emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
      // },
    });

    setLoading(false);

    if (error) {
      alert(error.message);
      return;
    }

    // Nëse verifikimi me email është OFF, shpesh kemi session direkt:
    if (data?.session) {
      window.location.href = "/";
    } else {
      // Nëse ke verifikim me email ON
      alert("Llogaria u krijua. Kontrollo email-in për konfirmim.");
    }
  }

  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="text-xl font-bold mb-4">Sign up</h1>

      <form onSubmit={submit} className="flex flex-col gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="email"
          required
          className="border px-3 py-2 rounded"
        />
        <input
          type="password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          placeholder="password"
          required
          className="border px-3 py-2 rounded"
        />

        <button
          type="submit"
          disabled={loading}
          className="border px-3 py-2 rounded bg-black text-white disabled:opacity-60"
        >
          {loading ? "Duke krijuar..." : "Create account"}
        </button>
      </form>

      <p className="mt-3 text-sm">
        Ke llogari?{" "}
        <a href="/sign-in" className="text-blue-600 underline">
          Sign in
        </a>
      </p>
    </main>
  );
}
