import {
  enrichOnDeckWithShowTmdb,
  fetchLibraryPartialItems,
  fetchPlex,
  findPlexMatchByTmdb,
  isPlexConfigured,
  mergeOnDeckWithLibrary,
  parseOnDeckXml,
} from "@/lib/plex";
import { prisma } from "@/lib/db";

/**
 * GET /api/plex/on-deck — Plex “Continue watching” (On Deck) plus partially watched movies & TV
 * from your libraries (On Deck alone is a short list; library scan finds started series that fell off).
 * Also matches WatchBox “in progress” titles via hub search + TMDB Guid on metadata (Plex often uses
 * plex:// guids in lists; TMDB lives in `<Guid id="tmdb://…">` on `/library/metadata/{id}`).
 */
export const dynamic = "force-dynamic";

const MAX_WATCHBOX_LOOKUPS = 20;

export async function GET() {
  if (!isPlexConfigured()) {
    return Response.json(
      { error: "Plex not configured", items: [] },
      { status: 503 }
    );
  }
  try {
    const xml = await fetchPlex("/library/onDeck");
    const raw = parseOnDeckXml(xml);
    const deckEnriched = await enrichOnDeckWithShowTmdb(raw);

    let libraryEnriched: Awaited<ReturnType<typeof fetchLibraryPartialItems>> = [];
    try {
      const lib = await fetchLibraryPartialItems();
      libraryEnriched = await enrichOnDeckWithShowTmdb(lib);
    } catch {
      /* non-fatal: still return On Deck */
    }

    let merged = mergeOnDeckWithLibrary(deckEnriched, libraryEnriched);
    const keys = new Set(
      merged
        .map((m) => (m.tmdbId != null && m.tmdbType ? `${m.tmdbType}:${m.tmdbId}` : null))
        .filter((m): m is string => Boolean(m))
    );

    let watchboxMatchCount = 0;
    try {
      const rows = await prisma.media.findMany({
        where: { status: "in_progress" },
        select: { title: true, tmdbId: true, type: true },
        take: MAX_WATCHBOX_LOOKUPS,
      });
      for (const row of rows) {
        const mediaType = row.type as "movie" | "tv";
        const k = `${mediaType}:${row.tmdbId}`;
        if (keys.has(k)) continue;
        const found = await findPlexMatchByTmdb(row.title, row.tmdbId, mediaType);
        if (found) {
          merged.push(found);
          keys.add(k);
          watchboxMatchCount += 1;
        }
      }
    } catch {
      /* DB optional */
    }

    return Response.json(
      {
        items: merged,
        onDeckCount: deckEnriched.length,
        libraryPartialCount: libraryEnriched.length,
        watchboxMatchCount,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "Plex request failed";
    return Response.json({ error: message, items: [] }, { status: 502 });
  }
}
