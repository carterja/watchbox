import { prisma } from "@/lib/db";
import {
  inferUnmatchedKind,
  unmatchedPlaybackDedupeKey,
} from "@/lib/unmatchedPlaybackDedupe";
import {
  getAllowedPlexWebhookAccountTitles,
  withPlaybackAccountFilter,
} from "@/lib/plexWebhookAccountFilter";

export const dynamic = "force-dynamic";

/**
 * GET /api/plex/unmatched-playback — Recent Plex activity not linked to any WatchBox title (mediaId null).
 * Deduped per series/movie for “add to library” hints. Respects dismissals and account filter.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const days = Math.min(90, Math.max(1, parseInt(url.searchParams.get("days") ?? "14", 10) || 14));
  const limit = Math.min(40, Math.max(1, parseInt(url.searchParams.get("limit") ?? "15", 10) || 15));

  const since = new Date(Date.now() - days * 86_400_000);

  const [rows, dismissedRows] = await Promise.all([
    prisma.playbackEvent.findMany({
      where: withPlaybackAccountFilter({
        mediaId: null,
        createdAt: { gte: since },
      }),
      orderBy: { createdAt: "desc" },
      take: 500,
    }),
    prisma.unmatchedPlaybackDismissal.findMany({ select: { dedupeKey: true } }),
  ]);

  const dismissed = new Set(dismissedRows.map((d) => d.dedupeKey));

  const merged = new Map<
    string,
    {
      dedupeKey: string;
      representativeEventId: string;
      accountTitle: string | null;
      fingerprintAvailable: boolean;
      lastActivityAt: Date;
      lastEvent: string;
      mediaKind: "movie" | "tv";
      displayTitle: string;
      subtitle: string | null;
      tmdbId: number | null;
    }
  >();

  // Rows are newest-first; first time we see a dedupe key is the latest activity for that title.
  for (const r of rows) {
    const hasName = Boolean(r.showTitle?.trim() || r.title?.trim());
    if (!hasName) continue;

    const dedupeKey = unmatchedPlaybackDedupeKey(r);
    if (dismissed.has(dedupeKey)) continue;

    if (merged.has(dedupeKey)) continue;

    const kind = inferUnmatchedKind(r);
    const fingerprintAvailable =
      kind === "tv"
        ? Boolean(r.grandparentRatingKey?.trim())
        : Boolean(r.ratingKey?.trim());
    const displayTitle =
      kind === "tv"
        ? (r.showTitle?.trim() || r.title?.trim() || "Unknown show")
        : (r.title?.trim() || "Unknown title");

    let subtitle: string | null = null;
    if (kind === "tv" && r.season != null && r.episode != null) {
      const ep = r.title?.trim();
      subtitle = ep
        ? `S${r.season} E${r.episode} · ${ep}`
        : `S${r.season} E${r.episode}`;
    } else if (kind === "movie" && r.year != null) {
      subtitle = String(r.year);
    }

    merged.set(dedupeKey, {
      dedupeKey,
      representativeEventId: r.id,
      accountTitle: r.accountTitle ?? null,
      fingerprintAvailable,
      lastActivityAt: r.createdAt,
      lastEvent: r.event,
      mediaKind: kind,
      displayTitle,
      subtitle,
      tmdbId: r.tmdbId ?? null,
    });
  }

  const items = [...merged.values()]
    .sort((a, b) => b.lastActivityAt.getTime() - a.lastActivityAt.getTime())
    .slice(0, limit)
    .map((m) => ({
      dedupeKey: m.dedupeKey,
      representativeEventId: m.representativeEventId,
      accountTitle: m.accountTitle,
      fingerprintAvailable: m.fingerprintAvailable,
      mediaKind: m.mediaKind,
      displayTitle: m.displayTitle,
      subtitle: m.subtitle,
      lastActivityAt: m.lastActivityAt.toISOString(),
      lastEvent: m.lastEvent,
      tmdbId: m.tmdbId,
      discoverQuery: m.displayTitle,
      discoverType: m.mediaKind,
    }));

  return Response.json({
    items,
    days,
    limit,
    webhookAccountFilterActive: getAllowedPlexWebhookAccountTitles() != null,
  });
}
