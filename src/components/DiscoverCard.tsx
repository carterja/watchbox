"use client";

import { memo, useState } from "react";
import Image from "next/image";
import { Film, Tv, Check, Plus, Loader2 } from "lucide-react";
import { posterUrl } from "@/lib/tmdb";
import { QuickSetupModal } from "./QuickSetupModal";
import type { MediaStatus, Viewer } from "@/types/media";

type Props = {
  id: number;
  type: "movie" | "tv";
  title: string;
  overview: string | null;
  posterPath: string | null;
  releaseDate: string | null | undefined;
  inCollection: boolean;
  adding: boolean;
  onAdd: (data: {
    streamingService: string | null;
    viewer: Viewer | null;
    status: MediaStatus;
  }) => void;
};

function DiscoverCardComponent({
  id,
  type,
  title,
  overview,
  posterPath,
  releaseDate,
  inCollection,
  adding,
  onAdd,
}: Props) {
  const [showQuickSetup, setShowQuickSetup] = useState(false);
  const imgSrc = posterUrl(posterPath, "w185");
  const year = releaseDate?.slice(0, 4) || (type === "movie" ? "Movie" : "TV");

  const handleClick = () => {
    if (!inCollection && !adding) {
      setShowQuickSetup(true);
    }
  };

  const handleQuickSetupSave = (data: {
    streamingService: string | null;
    viewer: Viewer | null;
    status: MediaStatus;
  }) => {
    setShowQuickSetup(false);
    onAdd(data);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={adding || inCollection}
        className="group rounded-xl border border-shelf-border bg-shelf-card overflow-hidden hover:border-[#8b5cf6]/50 hover:shadow-lg hover:shadow-[#8b5cf6]/20 disabled:opacity-50 transition relative"
      >
        <div className="aspect-[2/3] relative bg-shelf-border">
          {imgSrc ? (
            <Image
              src={imgSrc}
              alt={title}
              fill
              className="object-cover"
              sizes="160px"
              loading="lazy"
              quality={75}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-shelf-muted">
              {type === "movie" ? <Film size={32} /> : <Tv size={32} />}
            </div>
          )}

          {/* Top right icon - green checkmark or purple plus */}
          {inCollection ? (
            <div className="absolute top-2 right-2 rounded-full bg-green-500 p-1.5 z-20">
              <Check size={14} className="text-white" />
            </div>
          ) : (
            <div className="absolute top-2 right-2 rounded-full bg-shelf-accent p-1.5 opacity-0 group-hover:opacity-100 transition duration-200 z-20">
              {adding ? (
                <Loader2 size={14} className="text-white animate-spin" />
              ) : (
                <Plus size={14} className="text-white" />
              )}
            </div>
          )}

          {/* Hover overlay with title, year, and overview */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/80 to-black/60 opacity-0 group-hover:opacity-100 transition duration-200 p-3 flex flex-col justify-end">
            <span className="text-xs text-white/70 mb-1">{year}</span>
            <h3 className="text-sm font-bold text-white leading-tight mb-2 line-clamp-2">
              {title}
            </h3>
            {overview && (
              <p className="text-xs text-white/90 leading-relaxed line-clamp-6">
                {overview}
              </p>
            )}
          </div>
        </div>
      </button>

      {showQuickSetup && (
        <QuickSetupModal
          mediaTitle={title}
          mediaType={type}
          onClose={() => setShowQuickSetup(false)}
          onSave={handleQuickSetupSave}
        />
      )}
    </>
  );
}

export const DiscoverCard = memo(DiscoverCardComponent);
