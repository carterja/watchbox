export type MediaStatus = "yet_to_start" | "in_progress" | "finished" | "rewatch";

export type SeasonStatus = "not_started" | "in_progress" | "completed";

export type Viewer = "wife" | "both" | "me";

export type SeasonProgressItem = {
  season: number;
  status: SeasonStatus;
};

/** Cached TMDB episode counts per season (from sync or tv-season-episodes). */
export type SeasonEpisodeCountItem = {
  season: number;
  episodeCount: number;
};

export type Media = {
  id: string;
  tmdbId: number;
  type: "movie" | "tv";
  title: string;
  overview: string | null;
  posterPath: string | null;
  releaseDate: string | null;
  runtime: number | null; // minutes
  status: MediaStatus;
  progressNote: string | null;
  totalSeasons: number | null;
  seasonEpisodeCounts: SeasonEpisodeCountItem[] | null;
  seasonProgress: SeasonProgressItem[] | null;
  /** Last episode marked finished manually (merged with Plex scrobbles for what is next) */
  manualLastWatchedSeason: number | null;
  manualLastWatchedEpisode: number | null;
  streamingService: string | null;
  viewer: Viewer | null;
  sortOrder: number;
  /** Watching queue position (what-next); independent of library `sortOrder`. */
  watchingSortOrder: number;
  personalNotes: string | null;
  lastProgressSource: "plex" | "manual" | null;
  createdAt: string;
  updatedAt: string;
};

/** Fields that can be patched via the UI (used by optimistic updates, API calls, and component props). */
export type MediaUpdatePatch = Partial<
  Pick<
    Media,
    | "status"
    | "progressNote"
    | "totalSeasons"
    | "seasonEpisodeCounts"
    | "seasonProgress"
    | "manualLastWatchedSeason"
    | "manualLastWatchedEpisode"
    | "streamingService"
    | "viewer"
    | "posterPath"
    | "sortOrder"
    | "watchingSortOrder"
    | "personalNotes"
    | "lastProgressSource"
  >
>;
