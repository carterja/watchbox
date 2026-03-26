"use client";

import { useState, useEffect, useRef, useCallback, useMemo, memo } from "react";
import Image from "next/image";
import { X, Film, Tv, Save, Search, Check, Trash2, Heart, UsersRound, User, History, Loader2 } from "lucide-react";
import type { Media, MediaStatus, SeasonProgressItem, Viewer } from "@/types/media";
import { posterUrl, isExternalPoster } from "@/lib/tmdb";

type Props = {
  media: Media;
  onClose: () => void;
  onUpdate: (patch: {
    status?: MediaStatus;
    streamingService?: string | null;
    viewer?: Viewer | null;
    posterPath?: string | null;
    totalSeasons?: number;
    seasonProgress?: SeasonProgressItem[];
    manualLastWatchedSeason?: number | null;
    manualLastWatchedEpisode?: number | null;
    progressNote?: string;
  }) => Promise<void>;
  onDelete?: () => void;
};

type PosterSearchResult = {
  file_path: string;
  width: number;
  height: number;
  vote_average: number;
};

type CastMember = {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
};

type TmdbSearchItem =
  | {
      type: "movie";
      data: {
        id: number;
        title: string;
        overview: string | null;
        poster_path: string | null;
        release_date: string | null;
      };
    }
  | {
      type: "tv";
      data: {
        id: number;
        name: string;
        overview: string | null;
        poster_path: string | null;
        first_air_date: string | null;
      };
    };

const STATUS_OPTIONS: { value: MediaStatus; label: string }[] = [
  { value: "yet_to_start", label: "Unwatched" },
  { value: "in_progress", label: "In progress" },
  { value: "finished", label: "Finished" },
  { value: "rewatch", label: "Rewatch" },
];

const STREAMING_SERVICES = [
  "Theater",
  "Apple TV",
  "Netflix",
  "Plex",
  "HBO",
  "Prime",
  "Disney+",
  "Hulu",
  "Peacock",
  "Paramount+",
  "Comedy Specials",
];

const VIEWER_OPTIONS: { value: Viewer; label: string; Icon: typeof Heart }[] = [
  { value: "wife", label: "Wife", Icon: Heart },
  { value: "both", label: "Both", Icon: UsersRound },
  { value: "me", label: "Me", Icon: User },
];

function MediaDetailModalComponent({ media, onClose, onUpdate, onDelete }: Props) {
  const [status, setStatus] = useState<MediaStatus>(media.status);
  const [streamingService, setStreamingService] = useState<string | null>(media.streamingService);
  const [viewer, setViewer] = useState<Viewer | null>(media.viewer);
  const [totalSeasons, setTotalSeasons] = useState(media.totalSeasons || 0);
  const [seasonProgress, setSeasonProgress] = useState<SeasonProgressItem[]>(
    media.seasonProgress || []
  );
  const [progressNote, setProgressNote] = useState(media.progressNote || "");
  const [manualLastWatchedSeason, setManualLastWatchedSeason] = useState<number | null>(
    media.manualLastWatchedSeason ?? null
  );
  const [manualLastWatchedEpisode, setManualLastWatchedEpisode] = useState<number | null>(
    media.manualLastWatchedEpisode ?? null
  );
  const [selectedPoster, setSelectedPoster] = useState(media.posterPath);

  // TMDB rematch state
  const [currentTmdbId, setCurrentTmdbId] = useState(media.tmdbId);
  const [title, setTitle] = useState(media.title);
  const [overview, setOverview] = useState(media.overview ?? "");
  const [releaseDate, setReleaseDate] = useState<string | null>(media.releaseDate ?? null);

  const [rematchOpen, setRematchOpen] = useState(false);
  const [rematchQuery, setRematchQuery] = useState(media.title);
  const [rematchResults, setRematchResults] = useState<TmdbSearchItem[]>([]);
  const [rematchLoading, setRematchLoading] = useState(false);
  const [posterSearch, setPosterSearch] = useState(false);
  const [posterResults, setPosterResults] = useState<PosterSearchResult[]>([]);
  const [loadingPosters, setLoadingPosters] = useState(false);
  const [customPosterUrl, setCustomPosterUrl] = useState("");
  const [imdbPosterUrl, setImdbPosterUrl] = useState<string | null>(null);
  const [loadingImdbPoster, setLoadingImdbPoster] = useState(false);
  const [cast, setCast] = useState<CastMember[] | null>(null);
  const [loadingCast, setLoadingCast] = useState(false);
  const [saving, setSaving] = useState(false);

  const [plexLog, setPlexLog] = useState<
    {
      id: string;
      createdAt: string;
      title: string | null;
      showTitle: string | null;
      season: number | null;
      episode: number | null;
      accountTitle: string | null;
      playerTitle: string | null;
    }[]
  >([]);
  const [plexLogLoading, setPlexLogLoading] = useState(false);

  const [seasonsData, setSeasonsData] = useState<{ season: number; episodeCount: number }[] | null>(null);
  const [seasonsLoading, setSeasonsLoading] = useState(false);
  const [seasonsError, setSeasonsError] = useState<string | null>(null);

  const isSeries = media.type === "tv";
  const [isClosing, setIsClosing] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const closeDoneRef = useRef(false);

  useEffect(() => {
    setIsMobile(typeof window !== "undefined" && window.innerWidth < 768);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setPlexLogLoading(true);
    fetch(`/api/media/${encodeURIComponent(media.id)}/playback`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (!cancelled && Array.isArray(data)) setPlexLog(data);
      })
      .catch(() => {
        if (!cancelled) setPlexLog([]);
      })
      .finally(() => {
        if (!cancelled) setPlexLogLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [media.id]);

  useEffect(() => {
    setManualLastWatchedSeason(media.manualLastWatchedSeason ?? null);
    setManualLastWatchedEpisode(media.manualLastWatchedEpisode ?? null);
  }, [media.id, media.manualLastWatchedSeason, media.manualLastWatchedEpisode]);

  useEffect(() => {
    if (!isSeries || !media.id) {
      setSeasonsData(null);
      setSeasonsError(null);
      return;
    }
    let cancelled = false;
    setSeasonsLoading(true);
    setSeasonsError(null);
    void fetch(`/api/media/${encodeURIComponent(media.id)}/tv-season-episodes`)
      .then(async (res) => {
        const data = (await res.json()) as { seasons?: { season: number; episodeCount: number }[]; error?: string };
        if (!res.ok) {
          throw new Error(typeof data.error === "string" ? data.error : "Could not load seasons");
        }
        if (!cancelled) setSeasonsData(data.seasons ?? []);
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setSeasonsData(null);
          setSeasonsError(e instanceof Error ? e.message : "Could not load seasons");
        }
      })
      .finally(() => {
        if (!cancelled) setSeasonsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isSeries, media.id]);

  const episodeMaxForSeason = useMemo(() => {
    if (!seasonsData?.length || manualLastWatchedSeason == null) return null;
    const row = seasonsData.find((s) => s.season === manualLastWatchedSeason);
    const c = row?.episodeCount ?? 0;
    return c > 0 ? c : 1;
  }, [seasonsData, manualLastWatchedSeason]);

  useEffect(() => {
    if (episodeMaxForSeason == null) return;
    setManualLastWatchedEpisode((e) => {
      if (e == null) return null;
      const n = Math.min(Math.max(1, e), episodeMaxForSeason);
      return n === e ? e : n;
    });
  }, [episodeMaxForSeason]);

  const handleClose = useCallback(() => {
    if (closeDoneRef.current) return;
    if (!isMobile) {
      onClose();
      return;
    }
    setIsClosing(true);
  }, [isMobile, onClose]);

  const handleAnimationEnd = (e: React.AnimationEvent<HTMLDivElement>) => {
    if (e.animationName !== "modal-slide-down") return;
    if (closeDoneRef.current) return;
    closeDoneRef.current = true;
    onClose();
  };

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [handleClose]);

  // Load poster options from TMDB
  const searchPosters = async () => {
    setLoadingPosters(true);
    setImdbPosterUrl(null);
    try {
      const [postersRes, idsRes] = await Promise.all([
        fetch(`/api/tmdb/posters/${media.tmdbId}?type=${media.type}`),
        fetch(`/api/tmdb/external-ids?id=${media.tmdbId}&type=${media.type}`),
      ]);
      const postersData = await postersRes.json();
      setPosterResults(postersData.posters || []);
      const idsData = await idsRes.json();
      const imdbId = idsData.imdbId;
      if (imdbId) {
        setLoadingImdbPoster(true);
        try {
          const omdbRes = await fetch(`/api/omdb/poster?imdbId=${encodeURIComponent(imdbId)}`);
          if (omdbRes.ok) {
            const omdb = await omdbRes.json();
            if (omdb.posterUrl) setImdbPosterUrl(omdb.posterUrl);
          }
        } finally {
          setLoadingImdbPoster(false);
        }
      }
    } catch (error) {
      console.error("Failed to load posters:", error);
    } finally {
      setLoadingPosters(false);
    }
  };

  const runRematchSearch = async () => {
    const q = rematchQuery.trim();
    if (!q) return;
    setRematchLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("q", q);
      params.set("type", media.type);
      const res = await fetch(`/api/tmdb/search?${params.toString()}`);
      const data = await res.json();
      setRematchResults(Array.isArray(data) ? (data as TmdbSearchItem[]) : []);
    } catch (err) {
      console.error("Failed to search TMDB for rematch:", err);
      setRematchResults([]);
    } finally {
      setRematchLoading(false);
    }
  };

  const applyRematch = async (item: TmdbSearchItem) => {
    if (item.type === "movie") {
      setCurrentTmdbId(item.data.id);
      setTitle(item.data.title);
      setOverview(item.data.overview ?? "");
      setSelectedPoster(item.data.poster_path ?? null);
      setReleaseDate(item.data.release_date ?? null);
      setTotalSeasons(0);
      setSeasonProgress([]);
      setManualLastWatchedSeason(null);
      setManualLastWatchedEpisode(null);
    } else {
      try {
        const res = await fetch(`/api/tmdb/tv/${item.data.id}`);
        if (!res.ok) {
          console.error("Failed to load TV details for rematch");
        }
        const details = await res.json();
        setCurrentTmdbId(item.data.id);
        setTitle(details.name ?? item.data.name);
        setOverview((details.overview as string | null) ?? item.data.overview ?? "");
        setSelectedPoster(details.poster_path ?? item.data.poster_path ?? null);
        setReleaseDate(details.first_air_date ?? item.data.first_air_date ?? null);
        const seasons = typeof details.number_of_seasons === "number" ? details.number_of_seasons : 0;
        setTotalSeasons(seasons);
        setSeasonProgress([]);
        setManualLastWatchedSeason(null);
        setManualLastWatchedEpisode(null);
      } catch (error) {
        console.error("Failed to apply TV rematch:", error);
      }
    }
  };

  const handleSeasonStatusChange = (season: number, newStatus: string) => {
    const existing = seasonProgress.find((s) => s.season === season);
    if (existing) {
      setSeasonProgress(
        seasonProgress.map((s) =>
          s.season === season ? { ...s, status: newStatus as SeasonProgressItem["status"] } : s
        )
      );
    } else {
      setSeasonProgress([
        ...seasonProgress,
        { season, status: newStatus as SeasonProgressItem["status"] },
      ]);
    }
  };

  const getSeasonStatus = (season: number) => {
    return seasonProgress.find((s) => s.season === season)?.status || "not_started";
  };

  useEffect(() => {
    let cancelled = false;
    setLoadingCast(true);
    setCast(null);
    fetch(`/api/tmdb/credits?id=${currentTmdbId}&type=${isSeries ? "tv" : "movie"}`)
      .then((res) => res.json())
      .then((data: { cast?: CastMember[] }) => {
        if (!cancelled && data.cast) setCast(data.cast);
      })
      .finally(() => {
        if (!cancelled) setLoadingCast(false);
      });
    return () => {
      cancelled = true;
    };
  }, [currentTmdbId, isSeries]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updateData = {
        tmdbId: currentTmdbId,
        title,
        overview,
        releaseDate,
        status,
        streamingService,
        viewer,
        posterPath: selectedPoster,
        ...(isSeries && totalSeasons > 0 && {
          totalSeasons,
          seasonProgress,
        }),
        ...(isSeries && {
          manualLastWatchedSeason: manualLastWatchedSeason,
          manualLastWatchedEpisode: manualLastWatchedEpisode,
        }),
        progressNote: progressNote.trim() || undefined,
      };
      await onUpdate(updateData);
      handleClose();
    } catch (error) {
      console.error("Failed to save:", error);
    } finally {
      setSaving(false);
    }
  };

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
              {isSeries ? (
                <Tv className="text-[#8b5cf6]" size={20} />
              ) : (
                <Film className="text-[#8b5cf6]" size={20} />
              )}
            </div>
            <div className="min-w-0">
              <h2 id="media-detail-title" className="text-base md:text-xl font-bold text-white truncate">{title}</h2>
              <p className="text-xs md:text-sm text-shelf-muted">
                {(releaseDate || media.releaseDate)?.slice(0, 4)} • {isSeries ? "TV Series" : "Movie"}
              </p>
            </div>
          </div>
            <button
              onClick={handleClose}
              className="p-2 rounded-lg hover:bg-shelf-card text-shelf-muted hover:text-white transition shrink-0"
            >
              <X size={18} className="md:w-5 md:h-5" />
            </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
              {/* Mobile: Horizontal poster card + details */}
          <div className="lg:hidden mb-4">
            <div className="flex gap-3 mb-4">
              {/* Compact poster */}
              <div className="relative w-24 h-36 rounded-lg overflow-hidden border border-shelf-border bg-shelf-card shrink-0">
                {selectedPoster ? (
                  isExternalPoster(selectedPoster) ? (
                    <img
                      src={posterUrl(selectedPoster)!}
                      alt={title}
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    <Image
                      src={posterUrl(selectedPoster)!}
                      alt={title}
                      fill
                      className="object-cover"
                    />
                  )
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-shelf-muted">
                    {isSeries ? <Tv size={24} /> : <Film size={24} />}
                  </div>
                )}
              </div>
              
              {/* Quick info + poster change button */}
              <div className="flex-1 min-w-0 flex flex-col justify-between">
                <div className="space-y-1">
                  {overview && (
                    <p className="text-xs text-shelf-muted line-clamp-4 leading-relaxed">
                      {overview}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => {
                    setPosterSearch(!posterSearch);
                    if (!posterSearch && posterResults.length === 0) searchPosters();
                  }}
                  className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-shelf-card hover:bg-[#8b5cf6]/20 border border-shelf-border hover:border-[#8b5cf6]/50 text-white transition text-xs"
                >
                  <Search size={14} />
                  {posterSearch ? "Hide" : "Change"}
                </button>
              </div>
            </div>

            {/* Poster search results - mobile */}
            {posterSearch && (
              <div className="mb-4 space-y-2 max-h-48 overflow-y-auto">
                <p className="text-xs text-shelf-muted">Select a poster:</p>
                {/* Custom URL */}
                <div className="flex gap-2 items-center">
                  <input
                    type="url"
                    value={customPosterUrl}
                    onChange={(e) => setCustomPosterUrl(e.target.value)}
                    placeholder="Paste image URL"
                    className="flex-1 min-w-0 rounded-lg border border-shelf-border bg-shelf-card px-2 py-1.5 text-xs text-white placeholder-shelf-muted focus:outline-none focus:ring-2 focus:ring-[#8b5cf6]"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (customPosterUrl.trim()) {
                        setSelectedPoster(customPosterUrl.trim());
                        setCustomPosterUrl("");
                        setPosterSearch(false);
                      }
                    }}
                    disabled={!customPosterUrl.trim()}
                    className="shrink-0 px-2 py-1.5 rounded-lg bg-shelf-card hover:bg-[#8b5cf6]/20 border border-shelf-border text-xs text-white disabled:opacity-50"
                  >
                    Use URL
                  </button>
                </div>
                {loadingImdbPoster && <p className="text-xs text-shelf-muted">Loading IMDb poster…</p>}
                {imdbPosterUrl && !loadingImdbPoster && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPoster(imdbPosterUrl);
                      setPosterSearch(false);
                    }}
                    className="flex items-center gap-2 w-full rounded-lg border-2 border-shelf-border hover:border-[#8b5cf6]/50 p-2 text-left"
                  >
                    <img src={imdbPosterUrl} alt="IMDb poster" className="w-10 h-14 object-cover rounded shrink-0" />
                    <span className="text-xs text-shelf-muted">Use IMDb poster</span>
                  </button>
                )}
                {loadingPosters ? (
                  <div className="text-center py-4 text-shelf-muted text-sm">Loading...</div>
                ) : (
                  <div className="grid grid-cols-4 gap-2">
                    {posterResults.slice(0, 8).map((poster) => (
                      <button
                        key={poster.file_path}
                        onClick={() => {
                          setSelectedPoster(poster.file_path);
                          setPosterSearch(false);
                        }}
                        className={`relative aspect-[2/3] rounded-lg overflow-hidden border-2 transition ${
                          selectedPoster === poster.file_path
                            ? "border-[#8b5cf6]"
                            : "border-shelf-border hover:border-[#8b5cf6]/50"
                        }`}
                      >
                        <Image
                          src={posterUrl(poster.file_path, "w92")!}
                          alt="Poster"
                          fill
                          className="object-cover"
                        />
                        {selectedPoster === poster.file_path && (
                          <div className="absolute top-0.5 right-0.5 rounded-full bg-[#8b5cf6] p-0.5">
                            <Check size={10} className="text-white" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Desktop: Original 3-column layout */}
          <div className="hidden lg:grid lg:grid-cols-3 gap-6">
            {/* Left column - Poster */}
            <div className="space-y-4">
              <div className="relative aspect-[2/3] rounded-xl overflow-hidden border border-shelf-border bg-shelf-card">
                {selectedPoster ? (
                  isExternalPoster(selectedPoster) ? (
                    <img
                      src={posterUrl(selectedPoster)!}
                      alt={title}
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    <Image
                      src={posterUrl(selectedPoster)!}
                      alt={title}
                      fill
                      className="object-cover"
                    />
                  )
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-shelf-muted">
                    {isSeries ? <Tv size={48} /> : <Film size={48} />}
                  </div>
                )}
              </div>
              <button
                onClick={() => {
                  setPosterSearch(!posterSearch);
                  if (!posterSearch && posterResults.length === 0) searchPosters();
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-shelf-card hover:bg-[#8b5cf6]/20 border border-shelf-border hover:border-[#8b5cf6]/50 text-white transition"
              >
                <Search size={16} />
                {posterSearch ? "Hide Posters" : "Change Poster"}
              </button>

              {posterSearch && (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  <p className="text-xs text-shelf-muted px-1">Select a poster:</p>
                  <div className="flex gap-2 items-center">
                    <input
                      type="url"
                      value={customPosterUrl}
                      onChange={(e) => setCustomPosterUrl(e.target.value)}
                      placeholder="Paste image URL"
                      className="flex-1 min-w-0 rounded-lg border border-shelf-border bg-shelf-card px-3 py-2 text-sm text-white placeholder-shelf-muted focus:outline-none focus:ring-2 focus:ring-[#8b5cf6]"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (customPosterUrl.trim()) {
                          setSelectedPoster(customPosterUrl.trim());
                          setCustomPosterUrl("");
                          setPosterSearch(false);
                        }
                      }}
                      disabled={!customPosterUrl.trim()}
                      className="shrink-0 px-3 py-2 rounded-lg bg-shelf-card hover:bg-[#8b5cf6]/20 border border-shelf-border text-sm text-white disabled:opacity-50"
                    >
                      Use URL
                    </button>
                  </div>
                  {loadingImdbPoster && <p className="text-xs text-shelf-muted">Loading IMDb poster…</p>}
                  {imdbPosterUrl && !loadingImdbPoster && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPoster(imdbPosterUrl);
                        setPosterSearch(false);
                      }}
                      className="flex items-center gap-2 w-full rounded-lg border-2 border-shelf-border hover:border-[#8b5cf6]/50 p-2 text-left"
                    >
                      <img src={imdbPosterUrl} alt="IMDb poster" className="w-12 h-[4.5rem] object-cover rounded shrink-0" />
                      <span className="text-sm text-shelf-muted">Use IMDb poster</span>
                    </button>
                  )}
                  {loadingPosters ? (
                    <div className="text-center py-4 text-shelf-muted text-sm">Loading...</div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {posterResults.slice(0, 10).map((poster) => (
                        <button
                          key={poster.file_path}
                          onClick={() => {
                            setSelectedPoster(poster.file_path);
                            setPosterSearch(false);
                          }}
                          className={`relative aspect-[2/3] rounded-lg overflow-hidden border-2 transition ${
                            selectedPoster === poster.file_path
                              ? "border-[#8b5cf6]"
                              : "border-shelf-border hover:border-[#8b5cf6]/50"
                          }`}
                        >
                          <Image
                            src={posterUrl(poster.file_path, "w185")!}
                            alt="Poster option"
                            fill
                            className="object-cover"
                          />
                          {selectedPoster === poster.file_path && (
                            <div className="absolute top-1 right-1 rounded-full bg-[#8b5cf6] p-1">
                              <Check size={12} className="text-white" />
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right columns - Details */}
            <div className="lg:col-span-2 space-y-6">
              {/* TMDB rematch */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs md:text-sm font-medium text-white">TMDB Match</h3>
                  <button
                    type="button"
                    onClick={() => {
                      const next = !rematchOpen;
                      setRematchOpen(next);
                      if (next && rematchResults.length === 0) {
                        void runRematchSearch();
                      }
                    }}
                    className="text-xs md:text-sm text-shelf-muted hover:text-white underline-offset-2 hover:underline"
                  >
                    {rematchOpen ? "Hide" : "Fix match"}
                  </button>
                </div>
                {rematchOpen && (
                  <div className="rounded-lg border border-shelf-border bg-shelf-card/40 p-3 space-y-3">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={rematchQuery}
                        onChange={(e) => setRematchQuery(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            void runRematchSearch();
                          }
                        }}
                        className="flex-1 rounded-lg border border-shelf-border bg-shelf-card px-3 py-1.5 text-xs md:text-sm text-white placeholder-shelf-muted focus:outline-none focus:ring-1 focus:ring-[#8b5cf6]"
                        placeholder={`Search TMDB for ${isSeries ? "series" : "movie"}...`}
                      />
                      <button
                        type="button"
                        onClick={() => void runRematchSearch()}
                        disabled={rematchLoading}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-shelf-accent px-3 py-1.5 text-xs md:text-sm font-medium text-white hover:bg-shelf-accent-hover disabled:opacity-50"
                      >
                        <Search size={14} />
                        Search
                      </button>
                    </div>
                    <div className="max-h-56 overflow-y-auto space-y-1">
                      {rematchLoading ? (
                        <p className="text-xs text-shelf-muted py-2">Searching…</p>
                      ) : rematchResults.length === 0 ? (
                        <p className="text-xs text-shelf-muted py-2">No results yet.</p>
                      ) : (
                        rematchResults.slice(0, 10).map((item) => {
                          const itemTitle =
                            item.type === "movie" ? item.data.title : item.data.name;
                          const itemDate =
                            item.type === "movie"
                              ? item.data.release_date
                              : item.data.first_air_date;
                          const isActive = item.data.id === currentTmdbId;
                          return (
                            <button
                              key={`${item.type}-${item.data.id}`}
                              type="button"
                              onClick={() => void applyRematch(item)}
                              className={`w-full flex items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs md:text-sm transition ${
                                isActive
                                  ? "bg-[#8b5cf6]/20 border border-[#8b5cf6]/60"
                                  : "hover:bg-shelf-card border border-transparent"
                              }`}
                            >
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-white truncate">{itemTitle}</p>
                                <p className="text-[10px] text-shelf-muted truncate">
                                  {(itemDate || "").slice(0, 4)} •{" "}
                                  {item.type === "movie" ? "Movie" : "TV"}
                                </p>
                              </div>
                              {isActive && (
                                <Check size={14} className="text-[#8b5cf6] shrink-0" />
                              )}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* All form fields for desktop */}
              <FormFields />
            </div>
          </div>

          {/* Form fields - Mobile version */}
          <div className="lg:hidden space-y-4">
            {/* TMDB rematch (mobile) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-medium text-white">TMDB Match</h3>
                <button
                  type="button"
                  onClick={() => {
                    const next = !rematchOpen;
                    setRematchOpen(next);
                    if (next && rematchResults.length === 0) {
                      void runRematchSearch();
                    }
                  }}
                  className="text-[11px] text-shelf-muted hover:text-white underline-offset-2 hover:underline"
                >
                  {rematchOpen ? "Hide" : "Fix match"}
                </button>
              </div>
              {rematchOpen && (
                <div className="rounded-lg border border-shelf-border bg-shelf-card/40 p-3 space-y-2">
                  <div className="flex gap-2 mb-1">
                    <input
                      type="text"
                      value={rematchQuery}
                      onChange={(e) => setRematchQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          void runRematchSearch();
                        }
                      }}
                      className="flex-1 rounded-lg border border-shelf-border bg-shelf-card px-2 py-1.5 text-[11px] text-white placeholder-shelf-muted focus:outline-none focus:ring-1 focus:ring-[#8b5cf6]"
                      placeholder={`Search TMDB for ${isSeries ? "series" : "movie"}...`}
                    />
                    <button
                      type="button"
                      onClick={() => void runRematchSearch()}
                      disabled={rematchLoading}
                      className="inline-flex items-center gap-1 rounded-lg bg-shelf-accent px-2.5 py-1.5 text-[11px] font-medium text-white hover:bg-shelf-accent-hover disabled:opacity-50"
                    >
                      <Search size={12} />
                      Go
                    </button>
                  </div>
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {rematchLoading ? (
                      <p className="text-[11px] text-shelf-muted py-1.5">Searching…</p>
                    ) : rematchResults.length === 0 ? (
                      <p className="text-[11px] text-shelf-muted py-1.5">No results yet.</p>
                    ) : (
                      rematchResults.slice(0, 8).map((item) => {
                        const itemTitle =
                          item.type === "movie" ? item.data.title : item.data.name;
                        const itemDate =
                          item.type === "movie"
                            ? item.data.release_date
                            : item.data.first_air_date;
                        const isActive = item.data.id === currentTmdbId;
                        return (
                          <button
                            key={`${item.type}-${item.data.id}`}
                            type="button"
                            onClick={() => void applyRematch(item)}
                            className={`w-full flex items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[11px] transition ${
                              isActive
                                ? "bg-[#8b5cf6]/20 border border-[#8b5cf6]/60"
                                : "hover:bg-shelf-card border border-transparent"
                            }`}
                          >
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-white truncate">{itemTitle}</p>
                              <p className="text-[10px] text-shelf-muted truncate">
                                {(itemDate || "").slice(0, 4)} •{" "}
                                {item.type === "movie" ? "Movie" : "TV"}
                              </p>
                            </div>
                            {isActive && (
                              <Check size={12} className="text-[#8b5cf6] shrink-0" />
                            )}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            <FormFields />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 p-4 md:p-6 border-t border-shelf-border bg-shelf-card">
          <div className="flex items-center gap-2">
            {onDelete && (
              <button
                type="button"
                onClick={() => {
                  if (confirm("Remove this from your list?")) {
                    onDelete();
                    handleClose();
                  }
                }}
                className="px-3 py-2 rounded-lg text-red-400 hover:bg-red-500/20 hover:text-red-300 transition text-sm md:text-base inline-flex items-center gap-1.5"
              >
                <Trash2 size={14} className="md:w-4 md:h-4" />
                Remove
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleClose}
              className="px-4 py-2 rounded-lg text-white hover:bg-shelf-sidebar transition text-sm md:text-base"
            >
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

  function FormFields() {
    return (
      <>
              {/* Status */}
              <div>
                <label className="block text-xs md:text-sm font-medium text-white mb-2">Status</label>
                <div className="flex gap-1.5 md:gap-2">
                  {STATUS_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setStatus(option.value)}
                      className={`flex-1 px-2 md:px-4 py-1.5 md:py-2 rounded-lg text-xs md:text-sm font-medium transition ${
                        status === option.value
                          ? "bg-[#8b5cf6] text-white"
                          : "bg-shelf-card text-shelf-muted hover:text-white border border-shelf-border"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Streaming Service */}
              <div>
                <label className="block text-xs md:text-sm font-medium text-white mb-2">
                  Streaming Service
                </label>
                <select
                  value={streamingService || ""}
                  onChange={(e) => setStreamingService(e.target.value || null)}
                  className="w-full px-3 md:px-4 py-2 rounded-lg bg-shelf-card border border-shelf-border text-sm md:text-base text-white focus:outline-none focus:ring-2 focus:ring-[#8b5cf6]"
                >
                  <option value="">None</option>
                  {STREAMING_SERVICES.map((service) => (
                    <option key={service} value={service}>
                      {service}
                    </option>
                  ))}
                </select>
              </div>

              {/* Viewer */}
              <div>
                <label className="block text-xs md:text-sm font-medium text-white mb-2">Viewer</label>
                <div className="flex gap-1.5 md:gap-2">
                  {VIEWER_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setViewer(option.value)}
                      className={`flex-1 px-2 md:px-4 py-2 md:py-2 rounded-lg text-xs md:text-sm font-medium transition inline-flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2 ${
                        viewer === option.value
                          ? option.value === "wife"
                            ? "bg-red-500/20 border-red-500/50 text-red-300 border-2"
                            : option.value === "both"
                            ? "bg-purple-500/20 border-purple-500/50 text-purple-300 border-2"
                            : "bg-sky-500/20 border-sky-500/50 text-sky-300 border-2"
                          : "bg-shelf-card text-shelf-muted hover:text-white border border-shelf-border"
                      }`}
                    >
                      <option.Icon size={18} className="shrink-0 md:w-5 md:h-5" strokeWidth={2} />
                      <span className="text-[10px] md:text-sm">{option.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Season Progress (TV only) */}
              {isSeries && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs md:text-sm font-medium text-white">Seasons</label>
                    <input
                      type="number"
                      min="1"
                      max="50"
                      value={totalSeasons || ""}
                      onChange={(e) => setTotalSeasons(parseInt(e.target.value) || 0)}
                      className="w-16 md:w-20 px-2 md:px-3 py-1 rounded-lg bg-shelf-card border border-shelf-border text-white text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-[#8b5cf6]"
                      placeholder="0"
                    />
                  </div>
                  {totalSeasons > 0 && (
                    <>
                      <p className="text-[11px] md:text-xs text-shelf-muted mb-2">
                        Cycle each season button to mark not started / in progress / finished. Last watched position
                        matches the Watching page (&quot;Set last watched&quot;) — same values, editable here.
                      </p>
                      <div className="mb-3 rounded-lg border border-shelf-border bg-shelf-card/40 p-3">
                        <p className="text-[11px] font-medium text-cyan-200/90 mb-2">Last watched episode</p>
                        {seasonsLoading ? (
                          <div className="flex flex-col items-center justify-center gap-2 py-6">
                            <Loader2 className="animate-spin text-cyan-400/90" size={24} aria-hidden />
                            <p className="text-xs text-shelf-muted">Loading seasons…</p>
                          </div>
                        ) : seasonsData && seasonsData.length > 0 ? (
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                            <label className="flex-1 min-w-0">
                              <span className="text-xs text-shelf-muted">Season</span>
                              <select
                                className="mt-1 w-full cursor-pointer rounded-lg border border-shelf-border bg-shelf-bg px-3 py-2.5 text-sm text-white"
                                value={manualLastWatchedSeason ?? ""}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  if (v === "") {
                                    setManualLastWatchedSeason(null);
                                    setManualLastWatchedEpisode(null);
                                    return;
                                  }
                                  const s = Number(v);
                                  setManualLastWatchedSeason(s);
                                  setManualLastWatchedEpisode((prev) => {
                                    const row = seasonsData.find((x) => x.season === s);
                                    const max = Math.max(1, row?.episodeCount ?? 1);
                                    if (prev == null) return 1;
                                    return Math.min(Math.max(1, prev), max);
                                  });
                                }}
                              >
                                <option value="">Not set</option>
                                {seasonsData.map(({ season }) => (
                                  <option key={season} value={season}>
                                    Season {season}
                                  </option>
                                ))}
                              </select>
                            </label>
                            {manualLastWatchedSeason != null && episodeMaxForSeason != null && (
                              <label className="flex-1 min-w-0">
                                <span className="text-xs text-shelf-muted">Episode</span>
                                <select
                                  className="mt-1 w-full cursor-pointer rounded-lg border border-shelf-border bg-shelf-bg px-3 py-2.5 text-sm text-white"
                                  value={manualLastWatchedEpisode ?? 1}
                                  onChange={(e) =>
                                    setManualLastWatchedEpisode(Number(e.target.value) || 1)
                                  }
                                >
                                  {Array.from({ length: episodeMaxForSeason }, (_, i) => i + 1).map((n) => (
                                    <option key={n} value={n}>
                                      Episode {n}
                                    </option>
                                  ))}
                                </select>
                              </label>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                setManualLastWatchedSeason(null);
                                setManualLastWatchedEpisode(null);
                              }}
                              className="shrink-0 rounded-lg px-3 py-2.5 text-xs text-shelf-muted hover:text-white sm:mb-0.5"
                            >
                              Clear
                            </button>
                          </div>
                        ) : (
                          <>
                            {seasonsError ? (
                              <p className="mb-2 text-xs text-amber-200/90">{seasonsError}</p>
                            ) : null}
                            <p className="mb-2 text-xs text-shelf-muted">
                              Enter season and episode manually (or sync seasons from Settings).
                            </p>
                            <div className="flex flex-wrap gap-2 items-end">
                              <label className="flex-1 min-w-[6rem]">
                                <span className="text-xs text-shelf-muted">Season</span>
                                <input
                                  type="number"
                                  min={1}
                                  className="mt-1 w-full rounded-lg border border-shelf-border bg-shelf-bg px-3 py-2 text-sm text-white"
                                  value={manualLastWatchedSeason ?? ""}
                                  onChange={(e) => {
                                    const n = parseInt(e.target.value, 10);
                                    setManualLastWatchedSeason(Number.isFinite(n) ? n : null);
                                  }}
                                />
                              </label>
                              <label className="flex-1 min-w-[6rem]">
                                <span className="text-xs text-shelf-muted">Episode</span>
                                <input
                                  type="number"
                                  min={1}
                                  className="mt-1 w-full rounded-lg border border-shelf-border bg-shelf-bg px-3 py-2 text-sm text-white"
                                  value={manualLastWatchedEpisode ?? ""}
                                  onChange={(e) => {
                                    const n = parseInt(e.target.value, 10);
                                    setManualLastWatchedEpisode(Number.isFinite(n) ? n : null);
                                  }}
                                />
                              </label>
                              <button
                                type="button"
                                onClick={() => {
                                  setManualLastWatchedSeason(null);
                                  setManualLastWatchedEpisode(null);
                                }}
                                className="text-xs text-shelf-muted hover:text-white underline-offset-2 hover:underline sm:mb-2"
                              >
                                Clear
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-1.5 md:gap-2 max-h-48 md:max-h-64 overflow-y-auto p-2 rounded-lg bg-shelf-card/50 border border-shelf-border">
                        {Array.from({ length: totalSeasons }, (_, i) => i + 1).map((season) => {
                          const seasonStatus = getSeasonStatus(season);
                          const manualHere =
                            manualLastWatchedSeason != null &&
                            manualLastWatchedSeason === season;
                          return (
                            <button
                              key={season}
                              type="button"
                              onClick={() => {
                                const nextStatus =
                                  seasonStatus === "not_started"
                                    ? "in_progress"
                                    : seasonStatus === "in_progress"
                                      ? "completed"
                                      : "not_started";
                                handleSeasonStatusChange(season, nextStatus);
                              }}
                              className={`px-2 md:px-3 py-1.5 md:py-2 rounded-lg text-xs md:text-sm font-medium transition ${
                                seasonStatus === "completed"
                                  ? "bg-green-500/20 border-green-500/50 text-green-300 border"
                                  : seasonStatus === "in_progress"
                                    ? "bg-[#8b5cf6]/20 border-[#8b5cf6]/50 text-[#a78bfa] border"
                                    : "bg-shelf-card text-shelf-muted border border-shelf-border"
                              } ${manualHere ? "ring-2 ring-cyan-400/90 ring-offset-2 ring-offset-shelf-card" : ""}`}
                              title={
                                manualHere && manualLastWatchedEpisode != null
                                  ? `Last finished: S${season}E${manualLastWatchedEpisode}`
                                  : undefined
                              }
                            >
                              S{season}
                              {manualHere && manualLastWatchedEpisode != null ? (
                                <span className="block text-[9px] font-normal text-cyan-200/90 leading-tight">
                                  E{manualLastWatchedEpisode}
                                </span>
                              ) : null}
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Cast */}
              <div>
                <label className="block text-xs md:text-sm font-medium text-white mb-2">Cast</label>
                {loadingCast ? (
                  <p className="text-xs text-shelf-muted">Loading…</p>
                ) : cast && cast.length > 0 ? (
                  <ul className="flex flex-wrap gap-x-3 gap-y-1 text-xs md:text-sm">
                    {cast.map((member) => (
                      <li key={member.id}>
                        <a
                          href={`https://www.imdb.com/find?q=${encodeURIComponent(member.name)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#8b5cf6] hover:text-[#a78bfa] hover:underline"
                        >
                          {member.name}
                        </a>
                        {member.character ? (
                          <span className="text-shelf-muted ml-1">({member.character})</span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-shelf-muted">No cast data</p>
                )}
              </div>

              {/* Plex playback log (webhook scrobbles; survives deleting media in Plex) */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <History size={16} className="text-shelf-muted shrink-0" aria-hidden />
                  <label className="text-xs md:text-sm font-medium text-white">Plex log</label>
                </div>
                {plexLogLoading ? (
                  <p className="text-xs text-shelf-muted">Loading…</p>
                ) : plexLog.length === 0 ? (
                  <p className="text-xs text-shelf-muted">
                    No Plex scrobbles recorded yet. Add a webhook on your server and finish an episode
                    or movie past the threshold — history is stored here even if you remove files from
                    Plex later.
                  </p>
                ) : (
                  <ul className="max-h-40 overflow-y-auto space-y-1.5 text-xs md:text-sm rounded-lg border border-shelf-border bg-shelf-card/50 p-2">
                    {plexLog.map((e) => {
                      const when = new Date(e.createdAt);
                      const dateStr = Number.isNaN(when.getTime())
                        ? ""
                        : when.toLocaleString(undefined, {
                            dateStyle: "medium",
                            timeStyle: "short",
                          });
                      const epLabel =
                        isSeries &&
                        e.season != null &&
                        e.episode != null &&
                        e.season > 0 &&
                        e.episode > 0
                          ? `S${e.season}E${e.episode}`
                          : isSeries
                          ? "Episode"
                          : null;
                      const primary =
                        isSeries && (e.title || epLabel)
                          ? [epLabel, e.title].filter(Boolean).join(" · ")
                          : e.title ?? media.title;
                      return (
                        <li key={e.id} className="text-shelf-muted">
                          <span className="text-white/90">{primary}</span>
                          {dateStr ? (
                            <span className="text-shelf-muted"> · {dateStr}</span>
                          ) : null}
                          {e.accountTitle ? (
                            <span className="text-shelf-muted"> · {e.accountTitle}</span>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              {/* Progress Note - compact */}
              <div>
                <label className="block text-xs md:text-sm font-medium text-white mb-2">Note</label>
                <input
                  type="text"
                  value={progressNote}
                  onChange={(e) => setProgressNote(e.target.value)}
                  placeholder="Optional note about your progress..."
                  className="w-full px-3 md:px-4 py-2 rounded-lg bg-shelf-card border border-shelf-border text-sm md:text-base text-white placeholder-shelf-muted focus:outline-none focus:ring-2 focus:ring-[#8b5cf6]"
                />
              </div>
      </>
    );
  }
}

export const MediaDetailModal = memo(MediaDetailModalComponent);