"use client";

import type { ReactNode } from "react";
import type { Media } from "@/types/media";

type Props = {
  items: Media[];
  renderItem: (item: Media) => ReactNode;
  containerClass: string;
};

/**
 * Renders the media collection with the layout from `containerClass`.
 * Grid and list both use normal document flow so CSS Grid / flex gap work correctly.
 * (List virtualization was removed: fixed row heights caused huge gaps between compact rows.)
 */
export function VirtualizedMediaGrid({ items, renderItem, containerClass }: Props) {
  return (
    <div className={containerClass}>
      {items.map((item) => (
        <div key={item.id}>{renderItem(item)}</div>
      ))}
    </div>
  );
}
