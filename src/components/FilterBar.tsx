"use client";

import { memo } from "react";
import { Tv2 } from "lucide-react";
import { StreamingIcon } from "./StreamingIcon";

type FilterBarProps = {
  streamingService: string | null;
  onStreamingServiceChange: (service: string | null) => void;
  viewer: string | null;
  onViewerChange: (viewer: string | null) => void;
  availableServices: string[];
};

const VIEWER_OPTIONS = [
  { value: null, label: "All" },
  { value: "wife", label: "Wife" },
  { value: "both", label: "Both" },
  { value: "me", label: "Me" },
] as const;

function FilterBarComponent({
  streamingService,
  onStreamingServiceChange,
  viewer,
  onViewerChange,
  availableServices,
}: FilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-4">
      {/* Streaming Service Pills */}
      {availableServices.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onStreamingServiceChange(null)}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition ${
              streamingService === null
                ? "bg-shelf-accent text-white"
                : "bg-shelf-card text-shelf-muted hover:bg-shelf-border hover:text-white border border-shelf-border"
            }`}
          >
            <Tv2 size={14} />
            All Services
          </button>
          {availableServices.map((service) => (
            <button
              key={service}
              type="button"
              onClick={() => onStreamingServiceChange(service)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition ${
                streamingService === service
                  ? "bg-shelf-accent text-white"
                  : "bg-shelf-card text-shelf-muted hover:bg-shelf-border hover:text-white border border-shelf-border"
              }`}
            >
              <StreamingIcon service={service} className="w-4 h-4" />
              {service}
            </button>
          ))}
        </div>
      )}

      {/* Divider */}
      {availableServices.length > 0 && (
        <div className="h-6 w-px bg-shelf-border" />
      )}

      {/* Viewer Pills */}
      <div className="flex flex-wrap items-center gap-2">
        {VIEWER_OPTIONS.map(({ value, label }) => {
          const isActive = viewer === value;
          let colorClass = "";
          let icon = <span className="text-sm">✨</span>;
          
          if (value === "wife") {
            colorClass = isActive ? "bg-red-500/20 border-red-500/50 text-red-300" : "border-red-500/30 text-red-400/60";
            icon = <span className="text-sm">❤️</span>;
          } else if (value === "both") {
            colorClass = isActive ? "bg-purple-500/20 border-purple-500/50 text-purple-300" : "border-purple-500/30 text-purple-400/60";
            icon = <span className="text-sm">💜</span>;
          } else if (value === "me") {
            colorClass = isActive ? "bg-sky-500/20 border-sky-500/50 text-sky-300" : "border-sky-500/30 text-sky-400/60";
            icon = <span className="text-sm">⭐</span>;
          } else {
            colorClass = isActive ? "bg-shelf-accent text-white" : "text-shelf-muted hover:text-white";
          }
          
          return (
            <button
              key={label}
              type="button"
              onClick={() => onViewerChange(value)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition border ${
                value === null
                  ? isActive
                    ? "bg-shelf-accent text-white border-shelf-accent"
                    : "bg-shelf-card border-shelf-border hover:bg-shelf-border hover:text-white"
                  : isActive
                  ? colorClass
                  : `bg-shelf-card/50 border-shelf-border hover:bg-shelf-card ${colorClass}`
              }`}
            >
              {icon}
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export const FilterBar = memo(FilterBarComponent);
