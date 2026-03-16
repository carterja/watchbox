import { NextRequest } from "next/server";

const TMDB_BASE = "https://api.themoviedb.org/3";

export type PersonMovieCredit = {
  id: number;
  title: string;
  poster_path: string | null;
  release_date: string | null;
  character?: string;
};

export type PersonTvCredit = {
  id: number;
  name: string;
  poster_path: string | null;
  first_air_date: string | null;
  character?: string;
};

export type PersonCreditsResponse = {
  movies: PersonMovieCredit[];
  tv: PersonTvCredit[];
};

/** GET /api/tmdb/person/[id]/credits - Get movie and TV credits for a person. */
export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const personId = parseInt(id, 10);
  if (Number.isNaN(personId)) {
    return Response.json({ error: "Invalid person id" }, { status: 400 });
  }
  const apiKey = process.env.TMDB_API_KEY?.trim();
  if (!apiKey) {
    return Response.json({ error: "TMDB API key not configured" }, { status: 500 });
  }
  const [movieRes, tvRes] = await Promise.all([
    fetch(`${TMDB_BASE}/person/${personId}/movie_credits?api_key=${apiKey}`),
    fetch(`${TMDB_BASE}/person/${personId}/tv_credits?api_key=${apiKey}`),
  ]);
  if (!movieRes.ok || !tvRes.ok) {
    return Response.json({ error: "Failed to fetch credits" }, { status: 502 });
  }
  const movieData = (await movieRes.json()) as { cast?: PersonMovieCredit[] };
  const tvData = (await tvRes.json()) as { cast?: PersonTvCredit[] };
  const movies = (movieData.cast || [])
    .filter((m) => m.title && m.id)
    .sort((a, b) => {
      const aYear = a.release_date?.slice(0, 4) || "0";
      const bYear = b.release_date?.slice(0, 4) || "0";
      return bYear.localeCompare(aYear);
    })
    .slice(0, 50);
  const tv = (tvData.cast || [])
    .filter((t) => t.name && t.id)
    .sort((a, b) => {
      const aYear = a.first_air_date?.slice(0, 4) || "0";
      const bYear = b.first_air_date?.slice(0, 4) || "0";
      return bYear.localeCompare(aYear);
    })
    .slice(0, 50);
  return Response.json(
    { movies, tv },
    { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } }
  );
}
