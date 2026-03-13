"use client";

import { memo } from "react";

type LoadingSkeletonProps = {
  count?: number;
  type?: "grid" | "list";
  /** Optional grid class when type="grid" (e.g. from display mode) so skeleton matches final layout */
  gridClassName?: string;
};

function LoadingSkeletonComponent({ count = 14, type = "grid", gridClassName }: LoadingSkeletonProps) {
  if (type === "grid") {
    const gridClass = gridClassName ?? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-3 md:gap-4";
    return (
      <div className={gridClass}>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="aspect-[2/3] rounded-xl bg-shelf-border" />
            <div className="h-4 w-3/4 bg-shelf-border rounded mt-2" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="animate-pulse flex gap-4 rounded-xl border border-shelf-border bg-shelf-card p-4">
          <div className="w-16 h-24 rounded-lg bg-shelf-border shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-20 bg-shelf-border rounded" />
            <div className="h-5 w-3/4 bg-shelf-border rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

export const LoadingSkeleton = memo(LoadingSkeletonComponent);
