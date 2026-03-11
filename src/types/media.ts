export type MediaStatus = "yet_to_start" | "in_progress" | "finished" | "rewatch";

export type SeasonStatus = "not_started" | "in_progress" | "completed";

export type Viewer = "wife" | "both" | "me";

export type SeasonProgressItem = {
  season: number;
  status: SeasonStatus;
};

export type Media = {
  id: string;
  tmdbId: number;
  type: "movie" | "tv";
  title: string;
  overview: string | null;
  posterPath: string | null;
  releaseDate: string | null;
  status: MediaStatus;
  progressNote: string | null;
  totalSeasons: number | null;
  seasonProgress: SeasonProgressItem[] | null;
  streamingService: string | null;
  viewer: Viewer | null;
  createdAt: string;
  updatedAt: string;
};
