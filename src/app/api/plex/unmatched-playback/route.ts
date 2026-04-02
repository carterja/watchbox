import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

function inferKind(row: {
  mediaKind: string | null;
  showTitle: string | null;
  grandparentRatingKey: string | null;
}): "movie" | "tv" {
  if (row.mediaKind === "movie" || row.mediaKind === "tv") return row.mediaKind;
  if (row.showTitle || row.grandparentRatingKey) return "tv";
  return "movie";
}

function dedupeKey(row: {
  mediaKind: string | null;
  showTitle: string | null;
  title: string | null;
  ratingKey: string | null;
  grandparentRatingKey: string | null;
  tmdbId: number | null;
  id: string;
}): string {
  const kind = inferKind(row);
  if (kind === "movie") {
    const id = row.ratingKey ?? (row.tmdbId != null ? `tmdb-${row.tmdbId}` : null) ?? row.title ?? row.id;
    return `m:${id}`;
  }
  const gp = row.grandparentRatingKey?.trim();
  if (gp) return `tv:gp:${gp}`;
  const show = row.showTitle?.trim();
  if (show) return `tv:show:${show.toLowerCase()}`;
  return `tv:fb:${row.tmdbId ?? row.title ?? row.id}`;
}

/**
 * GET /api/plex/unmatched-playback — Recent Plex activity not linked to any WatchBox title (mediaId null).
 * Deduped per series/movie for “add to library” hints.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const days = Math.min(90, Math.max(1, parseInt(url.searchParams.get("days") ?? "14", 10) || 14));
  const limit = Math.min(40, Math.max(1, parseInt(url.searchParams.get("limit") ?? "15", 10) || 15));

  const since = new Date(Date.now() - days * 86_400_000);

  const rows = await prisma.playbackEvent.findMany({
    where: {
      mediaId: null,
      createdAt: { gte: since },
    },
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  const merged = new Map<
    string,
    {
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

    const key = dedupeKey(r);
    if (merged.has(key)) continue;

    const kind = inferKind(r);
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

    merged.set(key, {
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
      mediaKind: m.mediaKind,
      displayTitle: m.displayTitle,
      subtitle: m.subtitle,
      lastActivityAt: m.lastActivityAt.toISOString(),
      lastEvent: m.lastEvent,
      tmdbId: m.tmdbId,
      discoverQuery: m.displayTitle,
      discoverType: m.mediaKind,
    }));

  return Response.json({ items, days, limit });
}
