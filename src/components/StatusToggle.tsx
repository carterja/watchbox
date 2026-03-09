"use client";

import { memo } from "react";
import type { MediaStatus } from "@/types/media";

const OPTIONS: { value: MediaStatus; label: string }[] = [
  { value: "yet_to_start", label: "Yet to start" },
  { value: "in_progress", label: "In progress" },
  { value: "finished", label: "Finished" },
];

type Props = {
  value: MediaStatus;
  onChange: (status: MediaStatus) => void;
};

function StatusToggleComponent({ value, onChange }: Props) {
  return (
    <div className="flex rounded-lg border border-shelf-border bg-shelf-card p-0.5 w-fit">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`rounded-md px-4 py-2 text-sm font-medium transition ${
            value === opt.value
              ? "bg-shelf-accent text-white"
              : "text-shelf-muted hover:text-white hover:bg-shelf-card"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export const StatusToggle = memo(StatusToggleComponent);
