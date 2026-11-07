"use client";
import { PencilIcon, TrashIcon } from "@/components/Icons";

type Props = {
  onEdit: () => void;
  onDelete: () => void;
};
export default function CommentMenu({ onEdit, onDelete }: Props) {
  return (
    <div className="absolute right-0 mt-1 bg-white border rounded shadow z-10 text-sm">
      <button className="flex items-center gap-1.5 w-full text-left px-3 py-2 hover:bg-gray-50" onClick={onEdit}>
        <PencilIcon className="w-3.5 h-3.5" /> Edit
      </button>
      <button className="flex items-center gap-1.5 w-full text-left px-3 py-2 text-red-600 hover:bg-red-50" onClick={onDelete}>
        <TrashIcon className="w-3.5 h-3.5" /> Delete
      </button>
    </div>
  );
}
