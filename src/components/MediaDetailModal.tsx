"use client";

import { useState, useEffect, useRef, useCallback, memo } from "react";
import Image from "next/image";
import { X, Film, Tv, Save, Trash2 } from "lucide-react";
import type { Media, MediaUpdatePatch, SeasonProgressItem } from "@/types/media";
import { posterUrl, isExternalPoster } from "@/lib/tmdb";
import { useIsMobileViewport } from "@/hooks/useIsMobileViewport";
import { PosterPicker } from "./detail-modal/PosterPicker";
import { TmdbRematchPanel, type TmdbSearchItem } from "./detail-modal/TmdbRematchPanel";
import { MediaDetailFormFields, type FormState } from "./detail-modal/MediaDetailFormFields";

type Props = {
  media: Media;
  onClose: () => void;
  onUpdate: (patch: MediaUpdatePatch) => Promise<void>;
  onDelete?: () => void;
};

function MediaDetailModalComponent({ media, onClose, onUpdate, onDelete }: Props) {
  const isSeries = media.type === "tv";
  const isMobile = useIsMobileViewport();
  const [isClosing, setIsClosing] = useState(false);
  const closeDoneRef = useRef(false);
  const [saving, setSaving] = useState(false);

  // TMDB identity (can change via rematch)
  const [currentTmdbId, setCurrentTmdbId] = useState(media.tmdbId);
  const [title, setTitle] = useState(media.title);
  const [overview, setOverview] = useState(media.overview ?? "");
  const [releaseDate, setReleaseDate] = useState<string | null>(media.releaseDate ?? null);
  const [selectedPoster, setSelectedPoster] = useState(media.posterPath);

  // Form fields state
  const [formState, setFormState] = useState<FormState>({
    status: media.status,
    streamingService: media.streamingService,
    viewer: media.viewer,
    totalSeasons: media.totalSeasons || 0,
    seasonProgress: (media.seasonProgress || []) as SeasonProgressItem[],
    manualLastWatchedSeason: media.manualLastWatchedSeason ?? null,
    manualLastWatchedEpisode: media.manualLastWatchedEpisode ?? null,
    progressNote: media.progressNote || "",
  });

  const handleFormChange = useCallback((patch: Partial<FormState>) => {
    setFormState((prev) => ({ ...prev, ...patch }));
  }, []);

  // Sync manual position if parent media changes
  useEffect(() => {
    setFormState((prev) => ({
      ...prev,
      manualLastWatchedSeason: media.manualLastWatchedSeason ?? null,
      manualLastWatchedEpisode: media.manualLastWatchedEpisode ?? null,
    }));
  }, [media.id, media.manualLastWatchedSeason, media.manualLastWatchedEpisode]);

  const handleClose = useCallback(() => {
    if (closeDoneRef.current) return;
    if (!isMobile) { onClose(); return; }
    setIsClosing(true);
  }, [isMobile, onClose]);

  const handleAnimationEnd = (e: React.AnimationEvent<HTMLDivElement>) => {
    if (e.animationName !== "modal-slide-down") return;
    if (closeDoneRef.current) return;
    closeDoneRef.current = true;
    onClose();
  };

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => { if (e.key === "Escape") handleClose(); };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [handleClose]);

  const applyRematch = async (item: TmdbSearchItem) => {
    if (item.type === "movie") {
      setCurrentTmdbId(item.data.id);
      setTitle(item.data.title);
      setOverview(item.data.overview ?? "");
      setSelectedPoster(item.data.poster_path ?? null);
      setReleaseDate(item.data.release_date ?? null);
      handleFormChange({ totalSeasons: 0, seasonProgress: [], manualLastWatchedSeason: null, manualLastWatchedEpisode: null });
    } else {
      try {
        const res = await fetch(`/api/tmdb/tv/${item.data.id}`);
        if (!res.ok) console.error("Failed to load TV details for rematch");
        const details = await res.json();
        setCurrentTmdbId(item.data.id);
        setTitle(details.name ?? item.data.name);
        setOverview((details.overview as string | null) ?? item.data.overview ?? "");
        setSelectedPoster(details.poster_path ?? item.data.poster_path ?? null);
        setReleaseDate(details.first_air_date ?? item.data.first_air_date ?? null);
        const seasons = typeof details.number_of_seasons === "number" ? details.number_of_seasons : 0;
        handleFormChange({ totalSeasons: seasons, seasonProgress: [], manualLastWatchedSeason: null, manualLastWatchedEpisode: null });
      } catch (error) {
        console.error("Failed to apply TV rematch:", error);
      }
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onUpdate({
        status: formState.status,
        streamingService: formState.streamingService,
        viewer: formState.viewer,
        posterPath: selectedPoster,
        ...(isSeries && formState.totalSeasons > 0 && {
          totalSeasons: formState.totalSeasons,
          seasonProgress: formState.seasonProgress,
        }),
        ...(isSeries && {
          manualLastWatchedSeason: formState.manualLastWatchedSeason,
          manualLastWatchedEpisode: formState.manualLastWatchedEpisode,
        }),
        progressNote: formState.progressNote.trim() || undefined,
      });
      handleClose();
    } catch (error) {
      console.error("Failed to save:", error);
    } finally {
      setSaving(false);
    }
  };

  const posterImage = selectedPoster ? (
    isExternalPoster(selectedPoster) ? (
      <img src={posterUrl(selectedPoster)!} alt={title} className="object-cover w-full h-full" />
    ) : (
      <Image src={posterUrl(selectedPoster)!} alt={title} fill className="object-cover" />
    )
  ) : (
    <div className="absolute inset-0 flex items-center justify-center text-shelf-muted">
      {isSeries ? <Tv size={48} /> : <Film size={48} />}
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center md:p-4 bg-black/80 backdrop-blur-sm"
      onClick={handleClose}
      role="dialog"
      aria-modal
      aria-labelledby="media-detail-title"
    >
      <div
        className={`relative w-full max-w-4xl max-h-[95vh] md:max-h-[90vh] rounded-t-2xl md:rounded-2xl border-t md:border border-shelf-border bg-shelf-sidebar shadow-2xl overflow-hidden flex flex-col modal-slide-up ${isClosing ? "modal-slide-down" : ""}`}
        onClick={(e) => e.stopPropagation()}
        onAnimationEnd={handleAnimationEnd}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 md:p-6 border-b border-shelf-border bg-gradient-to-r from-shelf-sidebar to-shelf-card">
          <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
            <div className="p-1.5 md:p-2 rounded-lg bg-[#8b5cf6]/10 shrink-0">
              {isSeries ? <Tv className="text-[#8b5cf6]" size={20} /> : <Film className="text-[#8b5cf6]" size={20} />}
            </div>
            <div className="min-w-0">
              <h2 id="media-detail-title" className="text-base md:text-xl font-bold text-white truncate">{title}</h2>
              <p className="text-xs md:text-sm text-shelf-muted">
                {(releaseDate || media.releaseDate)?.slice(0, 4)} • {isSeries ? "TV Series" : "Movie"}
              </p>
            </div>
          </div>
          <button onClick={handleClose} className="p-2 rounded-lg hover:bg-shelf-card text-shelf-muted hover:text-white transition shrink-0">
            <X size={18} className="md:w-5 md:h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          {/* Mobile layout */}
          <div className="lg:hidden mb-4">
            <div className="flex gap-3 mb-4">
              <div className="relative w-24 h-36 rounded-lg overflow-hidden border border-shelf-border bg-shelf-card shrink-0">
                {posterImage}
              </div>
              <div className="flex-1 min-w-0 flex flex-col justify-between">
                {overview && (
                  <p className="text-xs text-shelf-muted line-clamp-4 leading-relaxed">{overview}</p>
                )}
                <PosterPicker tmdbId={currentTmdbId} mediaType={media.type} selectedPoster={selectedPoster} onSelect={setSelectedPoster} />
              </div>
            </div>
          </div>

          {/* Desktop layout */}
          <div className="hidden lg:grid lg:grid-cols-3 gap-6">
            <div className="space-y-4">
              <div className="relative aspect-[2/3] rounded-xl overflow-hidden border border-shelf-border bg-shelf-card">
                {posterImage}
              </div>
              <PosterPicker tmdbId={currentTmdbId} mediaType={media.type} selectedPoster={selectedPoster} onSelect={setSelectedPoster} />
            </div>
            <div className="lg:col-span-2 space-y-6">
              <TmdbRematchPanel mediaType={media.type} initialTitle={media.title} currentTmdbId={currentTmdbId} onApply={(item) => void applyRematch(item)} />
              <MediaDetailFormFields media={media} currentTmdbId={currentTmdbId} state={formState} onChange={handleFormChange} />
            </div>
          </div>

          {/* Mobile form fields */}
          <div className="lg:hidden space-y-4">
            <TmdbRematchPanel mediaType={media.type} initialTitle={media.title} currentTmdbId={currentTmdbId} onApply={(item) => void applyRematch(item)} />
            <MediaDetailFormFields media={media} currentTmdbId={currentTmdbId} state={formState} onChange={handleFormChange} />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 p-4 md:p-6 border-t border-shelf-border bg-shelf-card">
          <div className="flex items-center gap-2">
            {onDelete && (
              <button
                type="button"
                onClick={() => { onDelete(); handleClose(); }}
                className="px-3 py-2 rounded-lg text-red-400 hover:bg-red-500/20 hover:text-red-300 transition text-sm md:text-base inline-flex items-center gap-1.5"
              >
                <Trash2 size={14} className="md:w-4 md:h-4" />
                Remove
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handleClose} className="px-4 py-2 rounded-lg text-white hover:bg-shelf-sidebar transition text-sm md:text-base">
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 md:px-6 py-2 rounded-lg bg-[#8b5cf6] text-white text-sm md:text-base font-medium hover:bg-[#a78bfa] disabled:opacity-50 transition inline-flex items-center gap-2"
            >
              <Save size={14} className="md:w-4 md:h-4" />
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export const MediaDetailModal = memo(MediaDetailModalComponent);
