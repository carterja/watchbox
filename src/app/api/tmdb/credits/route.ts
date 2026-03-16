import { NextRequest } from "next/server";

const TMDB_BASE = "https://api.themoviedb.org/3";

export type CastMember = {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
};

/** GET /api/tmdb/credits?id=123&type=movie - Get top cast for a movie or TV show. */
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
  const res = await fetch(`${TMDB_BASE}/${endpoint}/${id}/credits?api_key=${apiKey}`);
  if (!res.ok) return Response.json({ error: "Failed to fetch credits" }, { status: res.status });
  const data = (await res.json()) as { cast?: { id: number; name: string; character?: string; profile_path: string | null }[] };
  const cast = (data.cast || []).slice(0, 20).map((c) => ({
    id: c.id,
    name: c.name,
    character: c.character || "",
    profile_path: c.profile_path ?? null,
  }));
  return Response.json(
    { cast },
    { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } }
  );
}
