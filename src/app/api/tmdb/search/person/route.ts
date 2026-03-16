import { NextRequest } from "next/server";

const TMDB_BASE = "https://api.themoviedb.org/3";

export type TmdbPersonResult = {
  id: number;
  name: string;
  profile_path: string | null;
  known_for_department: string;
};

/** GET /api/tmdb/search/person?q=name - Search for a person (actor, etc.) on TMDB. */
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim();
  if (!q) {
    return Response.json({ error: "Missing q" }, { status: 400 });
  }
  const apiKey = process.env.TMDB_API_KEY?.trim();
  if (!apiKey) {
    return Response.json({ error: "TMDB API key not configured" }, { status: 500 });
  }
  const res = await fetch(
    `${TMDB_BASE}/search/person?api_key=${apiKey}&query=${encodeURIComponent(q)}`
  );
  if (!res.ok) return Response.json({ error: "Search failed" }, { status: res.status });
  const data = (await res.json()) as { results?: TmdbPersonResult[] };
  const results = (data.results || []).slice(0, 15);
  return Response.json(results, {
    headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
  });
}
