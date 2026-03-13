"use client";

import { memo } from "react";
import type { MediaStatus } from "@/types/media";
import { Tooltip } from "./Tooltip";

const OPTIONS: { value: MediaStatus; label: string }[] = [
  { value: "yet_to_start", label: "Unwatched" },
  { value: "in_progress", label: "In progress" },
  { value: "finished", label: "Finished" },
  { value: "rewatch", label: "Rewatch" },
];

type Props = {
  value: MediaStatus;
  onChange: (status: MediaStatus) => void;
};

function StatusToggleComponent({ value, onChange }: Props) {
  return (
    <div className="flex rounded-lg border border-shelf-border bg-shelf-card p-0.5 w-fit overflow-x-auto">
      {OPTIONS.map((opt) => (
        <Tooltip key={opt.value} content={opt.label} placement="bottom">
          <button
            type="button"
            onClick={() => onChange(opt.value)}
            className={`flex-1 md:flex-none whitespace-nowrap rounded-md px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm font-medium transition cursor-pointer ${
              value === opt.value
                ? "bg-shelf-accent text-white"
                : "text-shelf-muted hover:text-white hover:bg-shelf-card"
            }`}
          >
            {opt.label}
          </button>
        </Tooltip>
      ))}
    </div>
  );
}

export const StatusToggle = memo(StatusToggleComponent);
