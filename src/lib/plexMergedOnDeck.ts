import { prisma } from "@/lib/db";
import {
  enrichOnDeckWithShowTmdb,
  fetchLibraryPartialItems,
  fetchPlex,
  findPlexMatchByTmdb,
  mergeOnDeckWithLibrary,
  parseOnDeckXml,
  type PlexOnDeckItem,
} from "@/lib/plex";

const MAX_WATCHBOX_LOOKUPS = 20;

export type MergedPlexOnDeckResult = {
  items: PlexOnDeckItem[];
  onDeckCount: number;
  libraryPartialCount: number;
  watchboxMatchCount: number;
};

/**
 * Plex “Continue watching” + partial library + hub matches for in-progress WatchBox rows.
 * Shared by GET /api/plex/on-deck and POST /api/plex/sync-watched.
 */
export async function getMergedPlexOnDeckItems(): Promise<MergedPlexOnDeckResult> {
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

  return {
    items: merged,
    onDeckCount: deckEnriched.length,
    libraryPartialCount: libraryEnriched.length,
    watchboxMatchCount,
  };
}
