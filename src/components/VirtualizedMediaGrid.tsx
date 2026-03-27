"use client";

import { useRef, useMemo } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { Media } from "@/types/media";

type Props = {
  items: Media[];
  renderItem: (item: Media) => React.ReactNode;
  containerClass: string;
  isList: boolean;
};

export function VirtualizedMediaGrid({
  items,
  renderItem,
  containerClass,
  isList,
}: Props) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => (isList ? 120 : 300),
    overscan: isList ? 5 : 15,
  });

  const virtualItems = virtualizer.getVirtualItems();
  const totalSize = virtualizer.getTotalSize();

  // For grid layouts, we can't use absolute positioning within CSS Grid
  // Grid items must be direct children. So we render all items and let CSS Grid handle layout.
  if (!isList) {
    return (
      <div className={containerClass}>
        {items.map((item) => (
          <div key={item.id}>
            {renderItem(item)}
          </div>
        ))}
      </div>
    );
  }

  // For list layout, use true virtualization
  return (
    <div
      ref={parentRef}
      className="overflow-y-auto"
      style={{ height: "100vh" }}
    >
      <div style={{ height: totalSize, position: "relative" }}>
        {virtualItems.map((virtualItem) => (
          <div
            key={virtualItem.key}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              transform: `translateY(${virtualItem.start}px)`,
              height: virtualItem.size,
            }}
          >
            {renderItem(items[virtualItem.index])}
          </div>
        ))}
      </div>
    </div>
  );
}
