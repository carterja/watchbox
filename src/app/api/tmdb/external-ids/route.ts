import { NextRequest } from "next/server";

const TMDB_BASE = "https://api.themoviedb.org/3";

/** GET /api/tmdb/external-ids?id=123&type=movie - Get IMDb ID for a TMDB movie or TV show. */
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  const type = request.nextUrl.searchParams.get("type") || "movie";
  if (!id) {
    return Response.json({ error: "Missing id" }, { status: 400 });
  }
  const apiKey = process.env.TMDB_API_KEY?.trim();
  if (!apiKey) {
    return Response.json({ error: "TMDB API key not configured" }, { status: 500 });
  }
  const endpoint = type === "tv" ? "tv" : "movie";
  const append = type === "tv" ? "&append_to_response=external_ids" : "";
  const res = await fetch(`${TMDB_BASE}/${endpoint}/${id}?api_key=${apiKey}${append}`);
  if (!res.ok) return Response.json({ error: "Not found" }, { status: res.status });
  const data = (await res.json()) as {
    imdb_id?: string;
    external_ids?: { imdb_id?: string };
  };
  const imdbId = type === "tv" ? data.external_ids?.imdb_id : data.imdb_id;
  return Response.json({ imdbId: imdbId ?? null });
}
