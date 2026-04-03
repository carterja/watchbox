/** Row from GET /api/plex/unmatched-playback */
export type UnmatchedPlaybackItem = {
  dedupeKey: string;
  representativeEventId: string;
  accountTitle: string | null;
  fingerprintAvailable: boolean;
  mediaKind: "movie" | "tv";
  displayTitle: string;
  subtitle: string | null;
  lastActivityAt: string;
  lastEvent: string;
  tmdbId: number | null;
  discoverQuery: string;
  discoverType: "movie" | "tv";
};
