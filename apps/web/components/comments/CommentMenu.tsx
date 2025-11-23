"use client";
type Props = {
  onEdit: () => void;
  onDelete: () => void;
};
export default function CommentMenu({ onEdit, onDelete }: Props) {
  return (
    <div className="absolute right-0 mt-1 bg-white border rounded shadow z-10 text-sm">
      <button className="block w-full text-left px-3 py-2 hover:bg-gray-50" onClick={onEdit}>
        ✎ Edit
      </button>
      <button className="block w-full text-left px-3 py-2 text-red-600 hover:bg-red-50" onClick={onDelete}>
        🗑 Delete
      </button>
    </div>
  );
}
