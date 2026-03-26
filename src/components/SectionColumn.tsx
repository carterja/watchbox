"use client";

import type { Media, MediaStatus, SeasonProgressItem } from "@/types/media";
import { MediaCard } from "./MediaCard";

type Props = {
  title: string;
  status: MediaStatus;
  items: Media[];
  onDelete: (id: string) => void;
  onUpdate?: (
    id: string,
    patch: {
      progressNote?: string;
      totalSeasons?: number;
      seasonProgress?: SeasonProgressItem[];
      manualLastWatchedSeason?: number | null;
      manualLastWatchedEpisode?: number | null;
      status?: MediaStatus;
      streamingService?: string | null;
      viewer?: import("@/types/media").Viewer | null;
      posterPath?: string | null;
    }
  ) => void;
};

export function SectionColumn({ title, status, items, onDelete, onUpdate }: Props) {
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
              onDelete={onDelete}
              onUpdate={onUpdate}
            />
          ))
        )}
      </div>
    </section>
  );
}
