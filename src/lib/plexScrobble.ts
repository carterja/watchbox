/** Match Plex’s default “scrobble” threshold (~90% through) for polling fallback. */

const DEFAULT_THRESHOLD = 0.9;

export function getPlexSyncThreshold(): number {
  const raw = process.env.PLEX_SYNC_THRESHOLD ?? process.env.PLEX_SCROBBLE_THRESHOLD;
  if (raw == null || raw === "") return DEFAULT_THRESHOLD;
  const n = Number.parseFloat(String(raw).trim());
  if (!Number.isFinite(n) || n <= 0 || n > 1) return DEFAULT_THRESHOLD;
  return n;
}

/** True when playback is past the sync threshold (same idea as `media.scrobble`). */
export function isPlexScrobbleEquivalent(
  viewOffset: number | undefined,
  duration: number | undefined,
  threshold: number = getPlexSyncThreshold()
): boolean {
  if (duration == null || duration <= 0 || viewOffset == null) return false;
  return viewOffset / duration >= threshold;
}
