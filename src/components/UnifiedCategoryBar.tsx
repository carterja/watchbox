"use client";

import { memo } from "react";
import {
  LayoutGrid,
  Circle,
  Play,
  CheckCircle,
  RotateCcw,
  Heart,
  UsersRound,
  User,
} from "lucide-react";
import type { MediaStatus, Viewer } from "@/types/media";
import { Tooltip } from "./Tooltip";

export type StatusFilterValue = MediaStatus | "all";

const STATUS_OPTIONS: { value: MediaStatus; label: string; Icon: typeof Circle }[] = [
  { value: "yet_to_start", label: "Unwatched", Icon: Circle },
  { value: "in_progress", label: "In progress", Icon: Play },
  { value: "finished", label: "Finished", Icon: CheckCircle },
  { value: "rewatch", label: "Rewatch", Icon: RotateCcw },
];

const VIEWER_OPTIONS: { value: Viewer; label: string; Icon: typeof Heart }[] = [
  { value: "wife", label: "Wife", Icon: Heart },
  { value: "both", label: "Both", Icon: UsersRound },
  { value: "me", label: "Me", Icon: User },
];

type Props = {
  statusFilter: StatusFilterValue;
  onStatusChange: (status: StatusFilterValue) => void;
  viewerFilter: Viewer | null;
  onViewerChange: (viewer: Viewer | null) => void;
  className?: string;
};

function UnifiedCategoryBarComponent({
  statusFilter,
  onStatusChange,
  viewerFilter,
  onViewerChange,
  className = "",
}: Props) {
  const isAll = statusFilter === "all";

  const handleAllClick = () => {
    onStatusChange("all");
  };

  const handleStatusClick = (value: MediaStatus) => {
    onStatusChange(value);
  };

  const handleViewerClick = (value: Viewer) => {
    onViewerChange(viewerFilter === value ? null : value);
  };

  const buttonBase =
    "inline-flex items-center justify-center rounded-lg aspect-square size-9 md:size-10 border transition cursor-pointer shrink-0";

  return (
    <div
      className={`flex items-center justify-between gap-2 rounded-lg border border-shelf-border bg-shelf-card p-0.5 w-full min-w-0 ${className}`}
      role="group"
      aria-label="Filter by status and viewer"
    >
      {/* Left: All + spacer */}
      <div className="flex items-center gap-0.5 md:gap-1 shrink-0">
        <Tooltip content="All" placement="bottom">
          <button
            type="button"
            onClick={handleAllClick}
            className={`${buttonBase} ${
              isAll
                ? "bg-shelf-accent text-white border-shelf-accent"
                : "bg-shelf-card/50 text-shelf-muted hover:text-white hover:bg-shelf-card border-shelf-border"
            }`}
            aria-pressed={isAll}
            aria-label="Show all"
          >
            <LayoutGrid size={18} className="md:w-5 md:h-5" />
          </button>
        </Tooltip>
        <div className="w-2 md:w-3 shrink-0" aria-hidden="true" />
      </div>

      {/* Center: Status icons */}
      <div className="flex items-center justify-center gap-0.5 md:gap-1 flex-1 min-w-0">
        {STATUS_OPTIONS.map(({ value, label, Icon }) => {
          const isActive = statusFilter === value;
          return (
            <Tooltip key={value} content={label} placement="bottom">
              <button
                type="button"
                onClick={() => handleStatusClick(value)}
                className={`${buttonBase} ${
                  isActive
                    ? "bg-shelf-accent text-white border-shelf-accent"
                    : "bg-shelf-card/50 text-shelf-muted hover:text-white hover:bg-shelf-card border-shelf-border"
                }`}
                aria-pressed={isActive}
                aria-label={label}
              >
                <Icon size={18} className="md:w-5 md:h-5" strokeWidth={2} />
              </button>
            </Tooltip>
          );
        })}
      </div>

      {/* Right: spacer + Viewer icons */}
      <div className="flex items-center gap-0.5 md:gap-1 shrink-0">
        <div className="w-2 md:w-3 shrink-0" aria-hidden="true" />
        {VIEWER_OPTIONS.map(({ value, label, Icon }) => {
          const isActive = viewerFilter === value;
          let colorClass = "";
          if (value === "wife") {
            colorClass = isActive
              ? "bg-red-500/20 border-red-500/50 text-red-300"
              : "border-red-500/30 text-red-400/60";
          } else if (value === "both") {
            colorClass = isActive
              ? "bg-purple-500/20 border-purple-500/50 text-purple-300"
              : "border-purple-500/30 text-purple-400/60";
          } else {
            colorClass = isActive
              ? "bg-sky-500/20 border-sky-500/50 text-sky-300"
              : "border-sky-500/30 text-sky-400/60";
          }
          return (
            <Tooltip key={value} content={label} placement="bottom">
              <button
                type="button"
                onClick={() => handleViewerClick(value)}
                className={`${buttonBase} ${
                  isActive ? colorClass : `bg-shelf-card/50 border-shelf-border hover:bg-shelf-card ${colorClass}`
                }`}
                aria-pressed={isActive}
                aria-label={label}
              >
                <Icon size={18} className="md:w-5 md:h-5 shrink-0" strokeWidth={2} />
              </button>
            </Tooltip>
          );
        })}
      </div>
    </div>
  );
}

export const UnifiedCategoryBar = memo(UnifiedCategoryBarComponent);
