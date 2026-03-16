"use client";

import { useState, memo } from "react";
import Image from "next/image";
import { Film, Tv } from "lucide-react";
import type { Media, SeasonProgressItem } from "@/types/media";
import { posterUrl, isExternalPoster } from "@/lib/tmdb";
import { MediaDetailModal } from "./MediaDetailModal";
import { StreamingIcon } from "./StreamingIcon";

type Props = {
  media: Media;
  onDelete: (id: string) => void;
  onUpdate?: (id: string, patch: { progressNote?: string; totalSeasons?: number; seasonProgress?: SeasonProgressItem[]; status?: Media["status"]; streamingService?: string | null; viewer?: import("@/types/media").Viewer | null; posterPath?: string | null }) => void;
  /** Show Movie/Series pill on card. Use true on All page, false on Movies/Series pages. */
  showTypeTag?: boolean;
  /** Card = poster tile; list = horizontal row (compact view). */
  variant?: "card" | "list";
};

export const MediaCard = memo(function MediaCard({ media, onDelete, onUpdate, showTypeTag = true, variant = "card" }: Props) {
  const [showDetailModal, setShowDetailModal] = useState(false);
  const imgSrc = posterUrl(media.posterPath) ?? null;
  const year = media.releaseDate?.slice(0, 4) ?? "";
  const runtimeStr =
    media.type === "movie" && media.runtime != null && media.runtime > 0
      ? (() => {
          const h = Math.floor(media.runtime! / 60);
          const m = media.runtime! % 60;
          if (h > 0 && m > 0) return `${h}h ${m}m`;
          if (h > 0) return `${h}h`;
          return `${m}m`;
        })()
      : "";

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

  if (variant === "list") {
    return (
      <>
        <div
          className={`group flex items-center gap-3 rounded-xl border border-shelf-border bg-shelf-card overflow-hidden transition hover:border-[#8b5cf6]/50 hover:shadow-lg hover:shadow-[#8b5cf6]/20 cursor-pointer ${getViewerGlowClass()}`}
          onClick={() => setShowDetailModal(true)}
        >
          <div className="relative w-14 sm:w-16 aspect-[2/3] shrink-0 bg-shelf-border">
            {imgSrc ? (
              isExternalPoster(media.posterPath) ? (
                <img src={imgSrc} alt={media.title} className="object-cover w-full h-full" loading="lazy" />
              ) : (
                <Image
                  src={imgSrc}
                  alt={media.title}
                  fill
                  className="object-cover"
                  sizes="64px"
                  loading="lazy"
                  quality={75}
                />
              )
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-shelf-muted">
                {media.type === "movie" ? <Film size={24} /> : <Tv size={24} />}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0 py-2 pr-3 flex flex-col gap-0.5">
            {showTypeTag && (
              <span className="text-[10px] font-semibold uppercase tracking-wide text-shelf-muted">
                {media.type === "movie" ? "Movie" : "Series"}
              </span>
            )}
            <h3 className="font-semibold text-white truncate">{media.title}</h3>
            <div className="flex items-center gap-2 text-xs text-shelf-muted">
              {year && <span>{year}</span>}
              {runtimeStr && <span>{runtimeStr}</span>}
            </div>
          </div>
          {media.streamingService && (
            <div className="shrink-0 pr-3">
              <span className="inline-flex w-7 h-7 rounded-lg overflow-hidden bg-black" title={media.streamingService}>
                <StreamingIcon service={media.streamingService} className="w-full h-full" />
              </span>
            </div>
          )}
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
      </>
    );
  }

  return (
    <div
      className={`group relative aspect-[2/3] rounded-xl border border-shelf-border bg-shelf-card overflow-hidden transition hover:border-[#8b5cf6]/50 hover:shadow-lg hover:shadow-[#8b5cf6]/20 cursor-pointer ${getViewerGlowClass()}`}
      onClick={() => setShowDetailModal(true)}
    >
      <div className="absolute inset-0">
        {imgSrc ? (
          isExternalPoster(media.posterPath) ? (
            <img src={imgSrc} alt={media.title} className="object-cover w-full h-full" loading="lazy" />
          ) : (
            <Image
              src={imgSrc}
              alt={media.title}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 50vw, 180px"
              loading="lazy"
              quality={75}
            />
          )
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
          {["hulu", "netflix", "hbo", "prime"].includes(
            media.streamingService.toLowerCase()
          ) ? (
            <span
              className="inline-flex w-8 h-8 rounded-lg shadow-lg overflow-hidden bg-black"
              title={media.streamingService}
            >
              <StreamingIcon service={media.streamingService} className="w-full h-full" />
            </span>
          ) : (
            <span
              className="inline-flex w-8 h-8 rounded-lg shadow-lg overflow-hidden"
              style={{ backgroundColor: "#00d0ff9c" }}
              title={media.streamingService}
            >
              <StreamingIcon service={media.streamingService} className="w-full h-full text-black" />
            </span>
          )}
        </div>
      )}

      {/* Hover: title + year + runtime + hint */}
      <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition duration-200 p-3">
        <div className="flex gap-2 text-xs text-white/80 mb-0.5">
          {year && <span>{year}</span>}
          {runtimeStr && <span>{runtimeStr}</span>}
        </div>
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
