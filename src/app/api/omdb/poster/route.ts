import { NextRequest } from "next/server";

/** GET /api/omdb/poster?imdbId=tt0137523 - Get poster URL from OMDb by IMDb ID. Requires OMDB_API_KEY. */
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const imdbId = request.nextUrl.searchParams.get("imdbId")?.trim();
  if (!imdbId || !/^tt\d+$/i.test(imdbId)) {
    return Response.json({ error: "Missing or invalid imdbId (e.g. tt0137523)" }, { status: 400 });
  }
  const apiKey = process.env.OMDB_API_KEY?.trim();
  if (!apiKey) {
    return Response.json({ error: "OMDB API key not configured" }, { status: 503 });
  }
  const res = await fetch(
    `https://www.omdbapi.com/?apikey=${encodeURIComponent(apiKey)}&i=${encodeURIComponent(imdbId)}`
  );
  if (!res.ok) return Response.json({ error: "OMDb request failed" }, { status: 502 });
  const data = (await res.json()) as { Response?: string; Error?: string; Poster?: string };
  if (data.Response === "False" || data.Error) {
    return Response.json({ error: data.Error || "Not found" }, { status: 404 });
  }
  const posterUrl = typeof data.Poster === "string" && data.Poster.startsWith("http") ? data.Poster : null;
  if (!posterUrl) return Response.json({ error: "No poster in OMDb response" }, { status: 404 });
  return Response.json({ posterUrl });
}
