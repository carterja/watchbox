"use client";

import { memo } from "react";
import { Tv2 } from "lucide-react";
import { StreamingIcon } from "./StreamingIcon";
import { Tooltip } from "./Tooltip";

type FilterBarProps = {
  streamingService: string | null;
  onStreamingServiceChange: (service: string | null) => void;
  availableServices: string[];
};

function FilterBarComponent({
  streamingService,
  onStreamingServiceChange,
  availableServices,
}: FilterBarProps) {
  if (availableServices.length === 0) return null;

  return (
    <div className="flex flex-nowrap overflow-x-auto items-center gap-1.5 md:gap-2 md:flex-wrap md:overflow-visible">
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
  );
}

export const FilterBar = memo(FilterBarComponent);
