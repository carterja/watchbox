import { isPlexConfigured } from "@/lib/plex";
import { getMergedPlexOnDeckItems } from "@/lib/plexMergedOnDeck";

/**
 * GET /api/plex/on-deck — Plex “Continue watching” (On Deck) plus partially watched movies & TV
 * from your libraries (On Deck alone is a short list; library scan finds started series that fell off).
 * Also matches WatchBox “in progress” titles via hub search + TMDB Guid on metadata (Plex often uses
 * plex:// guids in lists; TMDB lives in `<Guid id="tmdb://…">` on `/library/metadata/{id}`).
 */
export const dynamic = "force-dynamic";

export async function GET() {
  if (!isPlexConfigured()) {
    return Response.json(
      { error: "Plex not configured", items: [] },
      { status: 503 }
    );
  }
  try {
    const { items, onDeckCount, libraryPartialCount, watchboxMatchCount } =
      await getMergedPlexOnDeckItems();

    return Response.json(
      {
        items,
        onDeckCount,
        libraryPartialCount,
        watchboxMatchCount,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "Plex request failed";
    return Response.json({ error: message, items: [] }, { status: 502 });
  }
}
