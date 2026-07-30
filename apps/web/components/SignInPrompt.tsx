"use client";

type Props = {
  open: boolean;
  onClose: () => void;
  message?: string;
};

export default function SignInPrompt({ open, onClose, message }: Props) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-white rounded-xl border shadow-lg p-6 text-center space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-3xl">🏛️</div>
        <h3 className="text-lg font-semibold">Join the conversation</h3>
        <p className="text-sm text-gray-600">
          {message ?? "Sign in to take part — vote, comment, and follow what matters to you."}
        </p>
        <div className="flex gap-2 justify-center pt-1">
          <a
            href="/sign-up"
            className="px-4 py-2 bg-black text-white rounded-md text-sm hover:bg-gray-800"
          >
            Create account
          </a>
          <a
            href="/sign-in"
            className="px-4 py-2 border rounded-md text-sm hover:bg-gray-50"
          >
            Sign in
          </a>
        </div>
        <button
          onClick={onClose}
          className="text-xs text-gray-400 hover:text-gray-600 pt-1"
        >
          Not now
        </button>
      </div>
    </div>
  );
}
