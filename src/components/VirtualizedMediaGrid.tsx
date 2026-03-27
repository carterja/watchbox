"use client";

import { useMemo } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { Media } from "@/types/media";

type Props = {
  items: Media[];
  renderItem: (item: Media, index: number) => React.ReactNode;
  containerClass: string;
  isList: boolean;
};

export function VirtualizedMediaGrid({
  items,
  renderItem,
  containerClass,
  isList,
}: Props) {
  const parentRef = useMemo(() => ({ current: null as HTMLDivElement | null }), []);

  // For grid layout, estimate ~3-8 columns based on Tailwind breakpoints
  const estimatedColsPerRow = useMemo(() => {
    if (isList) return 1;
    // grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8
    // Average to ~5 columns for estimation
    return 5;
  }, [isList]);

  const estimatedRowHeight = isList ? 120 : 300; // list row vs grid card
  const estimatedItemHeight = estimatedRowHeight;

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimatedItemHeight,
    overscan: isList ? 5 : 10,
  });

  const virtualItems = virtualizer.getVirtualItems();
  const totalSize = virtualizer.getTotalSize();

  return (
    <div
      ref={parentRef}
      className="h-screen overflow-y-auto"
      style={{
        contain: "strict",
      }}
    >
      <div
        className={containerClass}
        style={{
          height: totalSize,
          width: "100%",
          position: "relative",
        }}
      >
        {virtualItems.map((virtualItem) => (
          <div
            key={virtualItem.key}
            data-index={virtualItem.index}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: isList ? "100%" : "auto",
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            {renderItem(items[virtualItem.index], virtualItem.index)}
          </div>
        ))}
      </div>
    </div>
  );
}
