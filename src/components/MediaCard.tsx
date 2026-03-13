"use client";

import { useState, memo } from "react";
import Image from "next/image";
import { Film, Tv } from "lucide-react";
import type { Media, SeasonProgressItem } from "@/types/media";
import { posterUrl } from "@/lib/tmdb";
import { MediaDetailModal } from "./MediaDetailModal";
import { StreamingIcon } from "./StreamingIcon";

type Props = {
  media: Media;
  onDelete: (id: string) => void;
  onUpdate?: (id: string, patch: { progressNote?: string; totalSeasons?: number; seasonProgress?: SeasonProgressItem[]; status?: Media["status"]; streamingService?: string | null; viewer?: import("@/types/media").Viewer | null; posterPath?: string | null }) => void;
  /** Show Movie/Series pill on card. Use true on All page, false on Movies/Series pages. */
  showTypeTag?: boolean;
};

export const MediaCard = memo(function MediaCard({ media, onDelete, onUpdate, showTypeTag = true }: Props) {
  const [showDetailModal, setShowDetailModal] = useState(false);
  const imgSrc = posterUrl(media.posterPath) ?? null;
  const year = media.releaseDate?.slice(0, 4) ?? "";

  const getViewerGlowClass = () => {
    if (!media.viewer) return "";
    switch (media.viewer) {
      case "wife":
        return "neon-glow-wife";
      case "both":
        return "neon-glow-both";
      case "me":
        return "neon-glow-me";
      default:
        return "";
    }
  };

  return (
    <div
      className={`group relative aspect-[2/3] rounded-xl border border-shelf-border bg-shelf-card overflow-hidden transition hover:border-[#8b5cf6]/50 hover:shadow-lg hover:shadow-[#8b5cf6]/20 cursor-pointer ${getViewerGlowClass()}`}
      onClick={() => setShowDetailModal(true)}
    >
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

      {/* Type pill - only when showTypeTag (e.g. on All page) */}
      {showTypeTag && (
        <div className="absolute top-2 left-2 z-10">
          <span className="rounded bg-shelf-bg/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
            {media.type === "movie" ? "Movie" : "Series"}
          </span>
        </div>
      )}

      {/* Streaming icon - bottom-right corner */}
      {media.streamingService && (
        <div className="absolute bottom-2 right-2 z-10">
          <span className="inline-flex rounded-full p-1.5 shadow-lg" style={{ backgroundColor: '#00d0ff9c' }} title={media.streamingService}>
            <StreamingIcon service={media.streamingService} className="w-4 h-4 text-black" />
          </span>
        </div>
      )}

      {/* Hover: title + year + hint */}
      <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition duration-200 p-3">
        {year && (
          <span className="text-xs text-white/80 mb-0.5">{year}</span>
        )}
        <h3 className="font-bold text-white leading-tight line-clamp-2 mb-1">
          {media.title}
        </h3>
        <p className="text-[10px] text-white/70">Click to manage</p>
      </div>

      {/* Fallback title when not hovering */}
      <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent opacity-100 group-hover:opacity-0 transition pointer-events-none">
        <p className="text-xs font-medium text-white truncate">{media.title}</p>
      </div>

      {showDetailModal && onUpdate && (
        <MediaDetailModal
          media={media}
          onClose={() => setShowDetailModal(false)}
          onUpdate={async (patch) => {
            await onUpdate(media.id, patch);
            setShowDetailModal(false);
          }}
          onDelete={() => onDelete(media.id)}
        />
      )}
    </div>
  );
});
