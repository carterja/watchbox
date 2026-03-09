"use client";

import { useState, memo } from "react";
import Image from "next/image";
import { Film, Tv, Trash2, ChevronDown } from "lucide-react";
import type { Media, MediaStatus, SeasonProgressItem } from "@/types/media";
import { posterUrl } from "@/lib/tmdb";
import { SeasonProgressEditor } from "./SeasonProgressEditor";

type Props = {
  media: Media;
  onStatusChange: (id: string, status: Media["status"]) => void;
  onDelete: (id: string) => void;
  onUpdate?: (id: string, patch: { progressNote?: string; totalSeasons?: number; seasonProgress?: SeasonProgressItem[] }) => void;
};

const STATUS_OPTIONS: { value: MediaStatus; label: string }[] = [
  { value: "yet_to_start", label: "Yet to start" },
  { value: "in_progress", label: "In progress" },
  { value: "finished", label: "Finished" },
];

export const MediaCard = memo(function MediaCard({ media, onStatusChange, onDelete, onUpdate }: Props) {
  const [showSeasonEditor, setShowSeasonEditor] = useState(false);
  const imgSrc = posterUrl(media.posterPath) ?? null;
  const year = media.releaseDate?.slice(0, 4) ?? "";
  const overview = media.overview?.trim() ?? "";
  const isSeries = media.type === "tv";

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDelete(media.id);
  };

  const handleStatusClick = (e: React.MouseEvent, status: MediaStatus) => {
    e.preventDefault();
    e.stopPropagation();
    if (status !== media.status) onStatusChange(media.id, status);
  };

  return (
    <div className="group relative aspect-[2/3] rounded-xl border border-shelf-border bg-shelf-card overflow-hidden transition hover:border-shelf-accent/50">
      {/* Poster background */}
      <div className="absolute inset-0">
        {imgSrc ? (
          <Image
            src={imgSrc}
            alt={media.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 50vw, 180px"
            loading="lazy"
            quality={75}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-shelf-border text-shelf-muted">
            {media.type === "movie" ? <Film size={48} /> : <Tv size={48} />}
          </div>
        )}
      </div>

      {/* Top-left: type pill (always visible) */}
      <div className="absolute top-2 left-2 z-10">
        <span className="rounded bg-shelf-bg/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
          {media.type === "movie" ? "Movie" : "Series"}
        </span>
      </div>

      {/* Top-right: trash (always visible, subtle) */}
      <button
        type="button"
        onClick={handleDelete}
        className="absolute top-2 right-2 z-10 rounded-full bg-black/60 p-1.5 text-white/90 hover:bg-red-600 hover:text-white transition opacity-0 group-hover:opacity-100 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-shelf-accent"
        aria-label="Remove from list"
      >
        <Trash2 size={16} />
      </button>

      {/* Hover overlay: gradient + info + state buttons */}
      <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/95 via-black/50 to-transparent opacity-0 group-hover:opacity-100 transition duration-200 p-3">
        {year && (
          <span className="text-xs text-white/80 mb-0.5">{year}</span>
        )}
        <h3 className="font-bold text-white leading-tight line-clamp-2 mb-1">
          {media.title}
        </h3>
        {overview && (
          <p className="text-xs text-white/90 line-clamp-3 mb-3 leading-relaxed">
            {overview}
          </p>
        )}

        {/* State transition buttons */}
        <div className="flex flex-wrap gap-1 mb-2">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={(e) => handleStatusClick(e, opt.value)}
              className={`rounded-md px-2 py-1 text-xs font-medium transition ${
                media.status === opt.value
                  ? "bg-shelf-accent text-white"
                  : "bg-white/20 text-white hover:bg-white/30"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Series: season progress + edit */}
        {isSeries && (
          <div className="mt-auto pt-2 border-t border-white/20">
            {media.seasonProgress && media.seasonProgress.length > 0 ? (
              <div className="flex flex-wrap gap-1 items-center">
                {media.seasonProgress
                  .slice()
                  .sort((a, b) => a.season - b.season)
                  .map((s) => (
                    <span
                      key={s.season}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-white/20 text-white"
                      title={s.status}
                    >
                      S{s.season}{" "}
                      {s.status === "completed" ? "✓" : s.status === "in_progress" ? "●" : "○"}
                    </span>
                  ))}
              </div>
            ) : null}
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowSeasonEditor(true); }}
              className="mt-1 flex items-center gap-1 text-xs text-shelf-accent hover:text-white transition"
            >
              <ChevronDown size={12} />
              {media.seasonProgress?.length ? "Edit seasons" : "Track seasons"}
            </button>
          </div>
        )}
      </div>

      {/* Fallback title when not hovering (bottom, so it's visible) */}
      <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent opacity-100 group-hover:opacity-0 transition pointer-events-none">
        <p className="text-xs font-medium text-white truncate">{media.title}</p>
      </div>

      {showSeasonEditor && onUpdate && (
        <SeasonProgressEditor
          media={media}
          onClose={() => setShowSeasonEditor(false)}
          onSave={(totalSeasons, seasonProgress) => {
            onUpdate(media.id, { totalSeasons, seasonProgress });
            setShowSeasonEditor(false);
          }}
        />
      )}
    </div>
  );
});
