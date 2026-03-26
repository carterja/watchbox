/** Streaming services shown as options in the UI (order = display order in selects). */
export const STREAMING_SERVICES = [
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
] as const;

export type StreamingService = (typeof STREAMING_SERVICES)[number];

/** Services that use a dark background for their icon on poster cards. */
export const DARK_BG_ICON_SERVICES = new Set<string>([
  "hulu",
  "netflix",
  "hbo",
  "prime",
]);

/** TMDB provider_id -> our app streaming service name (only services we show in UI). */
export const TMDB_PROVIDER_TO_SERVICE: Record<number, string> = {
  8: "Netflix",
  9: "Prime",
  15: "Hulu",
  337: "Disney+",
  386: "Peacock",
  531: "Paramount+",
  283: "HBO",
  384: "HBO",
  350: "Apple TV",
  2: "Apple TV",
};
