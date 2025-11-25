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
    try {
      const { error } = await supa.auth.signUp({
        email,
        password: pw,
        // nëse do redirect pas konfirmimit:
        // options: { emailRedirectTo: `${window.location.origin}` },
      });

      if (error) {
        alert(error.message);
        return;
      }

      alert("Llogaria u krijua. Kontrollo email-in për konfirmim.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-sm p-6">
      <h1 className="text-xl font-semibold mb-4">Create account</h1>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="border rounded px-3 py-2"
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          className="border rounded px-3 py-2"
          required
        />
        <button
          type="submit"
          disabled={loading}
          className="mt-2 bg-black text-white rounded px-4 py-2"
        >
          {loading ? "Creating..." : "Create account"}
        </button>
      </form>
    </main>
  );
}
