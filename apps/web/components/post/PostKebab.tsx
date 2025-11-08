"use client";
import React from "react";

type Props = {
  inSavedList: boolean;         // kur jemi te /saved
  saved: boolean;               // a është i ruajtur ky post nga unë
  onToggleSave: () => void;     // thërret toggleSave()
  onRemoveFromSaved?: () => void; // përdoret vetëm në /saved
  onDelete?: () => Promise<void>;
  onReport?: () => Promise<void>;
  children?: React.ReactNode;   // p.sh. butoni "Edit post" nga PostCard
};

export default function PostKebab({
  inSavedList,
  saved,
  onToggleSave,
  onRemoveFromSaved,
  onDelete,
  onReport,
  children,
}: Props) {
  return (
    <div className="w-48 bg-white border rounded-lg shadow-md overflow-hidden">
      {/* Save / Unsave / Remove from saved */}
      {inSavedList ? (
        <button
          className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
          onClick={onRemoveFromSaved}
        >
          🗑️ Remove from saved
        </button>
      ) : (
        <button
          className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
          onClick={onToggleSave}
        >
          {saved ? "★ Unsave" : "☆ Save"}
        </button>
      )}

      {/* Divider */}
      <div className="h-px bg-gray-100" />

      {/* Edit (kalon si child nga PostCard kur autori është vetë) */}
      {children}

      {/* Delete */}
      {onDelete && (
        <button
          className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
          onClick={onDelete}
        >
          ✖ Delete post
        </button>
      )}

      {/* Report */}
      {onReport && (
        <button
          className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
          onClick={onReport}
        >
          🚩 Report
        </button>
      )}
    </div>
  );
}
