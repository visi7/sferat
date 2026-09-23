"use client";

type Props = {
  className?: string;
  variant?: "subtle" | "vivid";
};

// Sfond me sfera drite të turbullta (glow), lëvizin ngadalë — përdor
// animacionin ekzistues "blob-pulse" (tailwind.config.js), të njëjtin si
// te /sign-in dhe /sign-up. `pointer-events-none` + `absolute inset-0`, që
// të mos ndërhyjë me përmbajtjen apo klikimet mbi të. "subtle" (parazgjedhje)
// mjafton për faqe të bardha ku shumë tekst/kartë duhet të mbetet lehtë e
// lexueshme; "vivid" për faqe me temë të errët (si /sign-in).
export default function GlowBackground({ className = "", variant = "subtle" }: Props) {
  const opacity = variant === "vivid" ? "opacity-25" : "opacity-[0.08]";
  return (
    <div className={`pointer-events-none fixed inset-0 overflow-hidden -z-10 ${className}`} aria-hidden="true">
      <div className={`absolute -top-32 -left-32 w-96 h-96 rounded-full bg-amber-400 blur-3xl animate-blob-pulse ${opacity}`} />
      <div
        className={`absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-indigo-400 blur-3xl animate-blob-pulse ${opacity}`}
        style={{ animationDelay: "3s" }}
      />
    </div>
  );
}
