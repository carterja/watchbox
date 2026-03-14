import { NextRequest } from "next/server";
import { getTmdbByImdbId } from "@/lib/tmdb";

export const dynamic = "force-dynamic";

/** GET /api/tmdb/by-imdb?id=tt0137523 - Find movie or TV by IMDb ID. Accepts full URL or ID. */
export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("id")?.trim();
  if (!raw) {
    return Response.json({ error: "Missing id (e.g. tt0137523 or imdb.com/title/tt0137523)" }, { status: 400 });
  }
  const match = raw.match(/(?:imdb\.com\/title\/)?(tt\d+)/i);
  const imdbId = match ? match[1] : raw.startsWith("tt") ? raw : `tt${raw}`;
  if (!/^tt\d+$/i.test(imdbId)) {
    return Response.json({ error: "Invalid IMDb ID. Use tt0123456 or paste an IMDB link." }, { status: 400 });
  }
  try {
    const result = await getTmdbByImdbId(imdbId);
    if (!result) {
      return Response.json({ error: "Not found on TMDB for this IMDb ID" }, { status: 404 });
    }
    return Response.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Lookup failed";
    return Response.json({ error: message }, { status: 502 });
  }
}
