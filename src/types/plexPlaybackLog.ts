/** Row shape for GET /api/plex/playback-logs */
export type PlexPlaybackLogRow = {
  id: string;
  createdAt: string;
  event: string;
  title: string | null;
  showTitle: string | null;
  season: number | null;
  episode: number | null;
  year: number | null;
  accountTitle: string | null;
  playerTitle: string | null;
  mediaId: string | null;
  mediaKind: string | null;
  tmdbId: number | null;
  linkedTitle: string | null;
  linkedType: string | null;
};
