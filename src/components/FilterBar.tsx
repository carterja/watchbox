"use client";

import { memo } from "react";
import { Tv2, Heart, UsersRound, User } from "lucide-react";
import { StreamingIcon } from "./StreamingIcon";

type FilterBarProps = {
  streamingService: string | null;
  onStreamingServiceChange: (service: string | null) => void;
  viewer: string | null;
  onViewerChange: (viewer: string | null) => void;
  availableServices: string[];
};

const VIEWER_OPTIONS: { value: "wife" | "both" | "me"; label: string; Icon: typeof Heart }[] = [
  { value: "wife", label: "Wife", Icon: Heart },
  { value: "both", label: "Both", Icon: UsersRound },
  { value: "me", label: "Me", Icon: User },
];

function FilterBarComponent({
  streamingService,
  onStreamingServiceChange,
  viewer,
  onViewerChange,
  availableServices,
}: FilterBarProps) {
  return (
    <div className="flex flex-col md:flex-row md:flex-wrap md:items-center gap-3 md:gap-4">
      {/* Streaming Service Pills - icons only */}
      {availableServices.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 md:gap-2">
          <button
            type="button"
            onClick={() => onStreamingServiceChange(null)}
            title="All services"
            className={`inline-flex items-center justify-center rounded-full p-2 md:p-2.5 transition cursor-pointer ${
              streamingService === null
                ? "bg-shelf-accent text-white"
                : "bg-shelf-border/60 text-white/90 hover:bg-shelf-border hover:text-white border border-shelf-border"
            }`}
          >
            <Tv2 size={16} className="md:w-[18px] md:h-[18px]" />
          </button>
          {availableServices.map((service) => (
            <button
              key={service}
              type="button"
              onClick={() => onStreamingServiceChange(service)}
              title={service}
              className={`inline-flex items-center justify-center rounded-full p-2 md:p-2.5 transition cursor-pointer ${
                streamingService === service
                  ? "bg-shelf-accent text-white"
                  : "bg-shelf-border/60 text-white/90 hover:bg-shelf-border hover:text-white border border-shelf-border"
              }`}
            >
              <StreamingIcon service={service} className="w-4 h-4 md:w-5 md:h-5" />
            </button>
          ))}
        </div>
      )}

      {/* Divider - hidden on mobile */}
      {availableServices.length > 0 && (
        <div className="hidden md:block h-6 w-px bg-shelf-border" />
      )}

      {/* Viewer Pills */}
      <div className="flex flex-wrap items-center gap-1.5 md:gap-2">
        {VIEWER_OPTIONS.map(({ value, label, Icon }) => {
          const isActive = viewer === value;
          let colorClass = "";
          if (value === "wife") {
            colorClass = isActive ? "bg-red-500/20 border-red-500/50 text-red-300" : "border-red-500/30 text-red-400/60";
          } else if (value === "both") {
            colorClass = isActive ? "bg-purple-500/20 border-purple-500/50 text-purple-300" : "border-purple-500/30 text-purple-400/60";
          } else {
            colorClass = isActive ? "bg-sky-500/20 border-sky-500/50 text-sky-300" : "border-sky-500/30 text-sky-400/60";
          }
          return (
            <button
              key={value}
              type="button"
              onClick={() => onViewerChange(isActive ? null : value)}
              title={label}
              className={`inline-flex items-center justify-center rounded-full p-2 md:p-2.5 transition border aspect-square size-9 md:size-10 shrink-0 cursor-pointer ${
                isActive ? colorClass : `bg-shelf-card/50 border-shelf-border hover:bg-shelf-card ${colorClass}`
              }`}
            >
              <Icon size={18} className="md:w-5 md:h-5 shrink-0" strokeWidth={2} />
              <span className="sr-only">{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export const FilterBar = memo(FilterBarComponent);
