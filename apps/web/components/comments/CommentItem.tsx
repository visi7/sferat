"use client";
import { useState, useEffect, useRef } from "react";
import type { CommentRow } from "@/types/content";
import CommentMenu from "./CommentMenu";

type Props = {
  c: CommentRow;
  me: string | null;
  myVote: -1 | 0 | 1;
  score: number;
  onVote: (id: string, wanted: 1 | -1) => void;

  // TANI: onReport merr edhe arsyen
  onReport: (id: string, reason: string) => Promise<void> | void;

  onDelete: (id: string) => Promise<void> | void;
  onUpdate: (id: string, newBody: string) => Promise<void> | void;

  // këto i ke në props, i lë po ashtu (edhe pse nuk po i përdorim këtu)
  menuFor: string | null;
  setMenuFor: (id: string | null) => void;
};

export default function CommentItem({
  c,
  me,
  myVote,
  score,
  onVote,
  onReport,
  onDelete,
  onUpdate,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(c.body);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // gjendja për report-in
  const [showReport, setShowReport] = useState(false);
  const [reportText, setReportText] = useState("");

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [menuOpen]);

  return (
    <li className="bg-gray-50 border rounded-md p-2">
      {/* Header */}
      <div
        className="flex items-center gap-2 text-xs text-gray-500 mb-1 relative"
        ref={menuRef}
      >
        <img
          src={c.profiles?.avatar_url || "/default-avatar.png"}
          className="w-5 h-5 rounded-full object-cover"
          alt=""
        />
        <span>{c.profiles?.username ?? "user"}</span>
        <span>· {new Date(c.created_at).toLocaleString()}</span>

        {/* Kebab – vetëm për autorin e komentit */}
        {me === c.author_id && (
          <button
            className="ml-auto text-xs"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="More"
          >
            ⋮
          </button>
        )}
        {menuOpen && me === c.author_id && (
          <CommentMenu
            onEdit={() => {
              setEditing(true);
              setMenuOpen(false);
            }}
            onDelete={async () => {
              await onDelete(c.id);
              setMenuOpen(false);
            }}
          />
        )}
      </div>

      {/* Body ose Edit */}
      {editing ? (
        <div className="mt-1 space-x-2">
          <input
            className="border rounded h-8 px-2 text-sm w-full max-w-[520px]"
            value={val}
            onChange={(e) => setVal(e.target.value)}
          />
          <button
            className="px-3 py-1 border rounded text-sm"
            onClick={async () => {
              const v = val.trim();
              if (!v) return;
              await onUpdate(c.id, v);
              setEditing(false);
            }}
          >
            Save
          </button>
          <button
            className="px-3 py-1 border rounded text-sm"
            onClick={() => {
              setVal(c.body);
              setEditing(false);
            }}
          >
            Cancel
          </button>
        </div>
      ) : (
        <div className="text-sm whitespace-pre-wrap">{c.body}</div>
      )}

      {/* Toolbar i komentit */}
      <div className="mt-2 flex items-center gap-2 text-[11px]">
        <button
          className={`h-7 px-2 rounded-full border bg-white hover:bg-gray-50 ${
            myVote === 1 ? "border-black" : ""
          }`}
          onClick={() => onVote(c.id, 1)}
          aria-pressed={myVote === 1}
        >
          ▲ Upvote
        </button>
        <button
          className={`h-7 px-2 rounded-full border bg-white hover:bg-gray-50 ${
            myVote === -1 ? "border-black" : ""
          }`}
          onClick={() => onVote(c.id, -1)}
          aria-pressed={myVote === -1}
        >
          ▼ Downvote
        </button>
        <span className="text-gray-500">Score: {score}</span>

        <span className="mx-2 text-gray-300">·</span>

        {/* Report – hap kutinë poshtë */}
        <button
          className="h-7 px-2 rounded-full border bg-white hover:bg-gray-50"
          onClick={() => setShowReport((v) => !v)}
        >
          🚩 Report
        </button>
      </div>

      {/* Kuti report-i poshtë komentit */}
      {showReport && (
        <div className="mt-2 p-2 border rounded bg-white/80 text-[11px] space-y-2">
          <div className="text-gray-600">
            Reason for report (spam, abuse, etc.)
          </div>
          <textarea
            className="w-full border rounded px-2 py-1 text-xs min-h-[60px]"
            value={reportText}
            onChange={(e) => setReportText(e.target.value)}
          />
          <div className="flex gap-2">
            <button
              type="button"
              className="px-3 py-1 rounded bg-black text-white"
              onClick={async () => {
                const clean = reportText.trim();
                if (!clean) return;
                await onReport(c.id, clean);
                setReportText("");
                setShowReport(false);
              }}
            >
              Send report
            </button>
            <button
              type="button"
              className="px-3 py-1 rounded border text-gray-600"
              onClick={() => {
                setReportText("");
                setShowReport(false);
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </li>
  );
}
