"use client";

import { memo } from "react";
import { Tv2, Heart, UsersRound, User } from "lucide-react";
import { StreamingIcon } from "./StreamingIcon";
import { Tooltip } from "./Tooltip";

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
        <div className="flex flex-nowrap overflow-x-auto items-center gap-1.5 md:gap-2 md:flex-wrap md:overflow-visible pb-1 md:pb-0">
          <Tooltip content="All services" placement="bottom">
            <button
              type="button"
              onClick={() => onStreamingServiceChange(null)}
              className={`inline-flex items-center justify-center rounded-lg aspect-square size-9 md:size-10 border transition cursor-pointer overflow-hidden ${
                streamingService === null
                  ? "text-black shadow-lg"
                  : "bg-shelf-card/50 text-white/90 hover:bg-shelf-card border-shelf-border"
              }`}
              style={
                streamingService === null
                  ? { backgroundColor: "#00d0ff9c", borderColor: "transparent" }
                  : undefined
              }
            >
              <Tv2 size={16} className="md:w-[18px] md:h-[18px]" />
            </button>
          </Tooltip>
          {availableServices.map((service) => (
            <Tooltip key={service} content={service} placement="bottom">
              <button
                type="button"
                onClick={() => onStreamingServiceChange(service)}
                className={`inline-flex items-center justify-center rounded-lg aspect-square size-9 md:size-10 border transition cursor-pointer overflow-hidden ${
                  streamingService === service
                    ? "text-black shadow-lg"
                    : "bg-shelf-card/50 text-white/90 hover:bg-shelf-card border-shelf-border"
                }`}
                style={
                  streamingService === service
                    ? { backgroundColor: "#00d0ff9c", borderColor: "transparent" }
                    : undefined
                }
              >
                <StreamingIcon service={service} className="w-full h-full" />
              </button>
            </Tooltip>
          ))}
        </div>
      )}

      {/* Divider - hidden on mobile */}
      {availableServices.length > 0 && (
        <div className="hidden md:block h-6 w-px bg-shelf-border" />
      )}

      {/* Viewer Pills - single row on mobile, wrap on desktop */}
      <div className="flex flex-nowrap overflow-x-auto items-center gap-1.5 md:gap-2 md:flex-wrap md:overflow-visible pb-1 md:pb-0">
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
            <Tooltip key={value} content={label} placement="bottom">
              <button
                type="button"
                onClick={() => onViewerChange(isActive ? null : value)}
                className={`inline-flex items-center justify-center rounded-full p-2 md:p-2.5 transition border aspect-square size-9 md:size-10 shrink-0 cursor-pointer ${
                  isActive ? colorClass : `bg-shelf-card/50 border-shelf-border hover:bg-shelf-card ${colorClass}`
                }`}
              >
                <Icon size={18} className="md:w-5 md:h-5 shrink-0" strokeWidth={2} />
                <span className="sr-only">{label}</span>
              </button>
            </Tooltip>
          );
        })}
      </div>
    </div>
  );
}

export const FilterBar = memo(FilterBarComponent);
