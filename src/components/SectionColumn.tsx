"use client";

import type { Media, MediaStatus } from "@/types/media";
import { MediaCard } from "./MediaCard";

type Props = {
  title: string;
  status: MediaStatus;
  items: Media[];
  onStatusChange: (id: string, status: MediaStatus) => void;
  onDelete: (id: string) => void;
};

export function SectionColumn({ title, status, items, onStatusChange, onDelete }: Props) {
  return (
    <section className="flex flex-col rounded-2xl border border-shelf-border bg-shelf-card/50 p-4 min-h-[320px]">
      <h2 className="text-lg font-semibold text-shelf-accent mb-4">{title}</h2>
      <div className="flex flex-wrap gap-3 content-start">
        {items.length === 0 ? (
          <p className="text-shelf-muted text-sm">Nothing here yet.</p>
        ) : (
          items.map((m) => (
            <MediaCard
              key={m.id}
              media={m}
              onStatusChange={onStatusChange}
              onDelete={onDelete}
            />
          ))
        )}
      </div>
    </section>
  );
}
