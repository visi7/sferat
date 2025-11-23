"use client";
import React from "react";

type Props = {
  inSavedList: boolean;
  saved: boolean;
  onToggleSave: () => void;
  onRemoveFromSaved?: () => void;
  onShare?: () => void;             // ➜ SHTUAR
  onDelete?: () => Promise<void>;
  onReport?: () => Promise<void>;
  children?: React.ReactNode;
};

export default function PostKebab({
  inSavedList,
  saved,
  onToggleSave,
  onRemoveFromSaved,
  onShare,
  onDelete,
  onReport,
  children,
}: Props) {
  return ( 
  <div className="w-48 bg-white/90 hover:bg-white border rounded-lg shadow-md overflow-hidden text-sm backdrop-blur-sm">
      {/* Save / Unsave / Remove from saved */}
      {inSavedList ? (
        <button
          className="w-full text-left px-3 py-2 hover:bg-gray-50"
          onClick={onRemoveFromSaved}
        >
          Remove from saved
        </button>
      ) : (
        <button
          className="w-full text-left px-3 py-2 hover:bg-gray-50"
          onClick={onToggleSave}
        >
          {saved ? "Unsave" : "Save"}
        </button>
      )}

      {/* Share – vetëm nëse është dhënë onShare */}
      {onShare && (
        <button
          className="w-full text-left px-3 py-2 hover:bg-gray-50"
          onClick={onShare}
        >
          Share
        </button>
      )}

      {/* Delete – vetëm nëse është dhënë onDelete (pra vetëm autori) */}
      {onDelete && (
        <button
          className="w-full text-left px-3 py-2 text-red-600 hover:bg-red-50"
          onClick={onDelete}
        >
          Delete post
        </button>
      )}

      {onReport && (
        <button
          className="w-full text-left px-3 py-2 hover:bg-gray-50"
          onClick={onReport}
        >
          Report
        </button>
      )}

      {children}
    </div>
  );
}
