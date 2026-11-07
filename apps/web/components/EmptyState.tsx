// Gjendje bosh miqësore (ikonë e zbehtë + mesazh) — zëvendëson placeholder-at
// e thata ("—", "No posts.", "Nothing here.") kudo nëpër platformë.

import type { ComponentType } from "react";

type Props = {
  icon?: ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  compact?: boolean;
  className?: string;
};

export default function EmptyState({ icon: Icon, title, description, compact, className = "" }: Props) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center ${compact ? "py-6" : "py-12"} px-4 ${className}`}
    >
      {Icon && (
        <div
          className={`${
            compact ? "w-8 h-8 mb-2" : "w-11 h-11 mb-3"
          } rounded-full bg-gray-100 flex items-center justify-center`}
        >
          <Icon className={compact ? "w-4 h-4 text-gray-400" : "w-5 h-5 text-gray-400"} />
        </div>
      )}
      <p className={`font-medium text-gray-700 ${compact ? "text-xs" : "text-sm"}`}>{title}</p>
      {description && <p className="text-xs text-gray-500 mt-1 max-w-xs">{description}</p>}
    </div>
  );
}
