"use client";

type Props = {
  message: string | null;
  variant?: "error" | "success";
  onClose: () => void;
};

// Zëvendëson alert() nativ me një njoftim të stilizuar, jo bllokues —
// përdoret në gjithë app-in për mesazhe gabimi/suksesi (jo konfirmime
// veprimesh destruktive, ato përdorin ConfirmDialog).
export default function Toast({ message, variant = "error", onClose }: Props) {
  if (!message) return null;
  const styles =
    variant === "error"
      ? "bg-red-50 border-red-200 text-red-800"
      : "bg-green-50 border-green-200 text-green-800";
  return (
    <div
      className={`fixed bottom-4 right-4 z-[9999] max-w-sm border rounded-lg px-4 py-3 shadow-lg text-sm ${styles}`}
    >
      {message}
      <button onClick={onClose} className="ml-3 underline opacity-70 hover:opacity-100">
        Dismiss
      </button>
    </div>
  );
}
