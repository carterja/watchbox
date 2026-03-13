const TMDB_BASE = "https://api.themoviedb.org/3";
const IMAGE_BASE = "https://image.tmdb.org/t/p";

function getApiKey(): string {
  const key = process.env.TMDB_API_KEY?.trim();
  if (!key) throw new Error("TMDB_API_KEY is not set. Get a free key at https://www.themoviedb.org/settings/api");
  return key;
}

/** TMDB returns { status_code, status_message } when something goes wrong (e.g. 7 = invalid API key). */
function checkTmdbError(json: { status_code?: number; status_message?: string }): void {
  if (json.status_code) {
    throw new Error(json.status_message || `TMDB error ${json.status_code}`);
  }
}

export type TmdbMovie = {
  id: number;
  title: string;
  overview: string | null;
  poster_path: string | null;
  release_date: string | null;
};

export type TmdbTv = {
  id: number;
  name: string;
  overview: string | null;
  poster_path: string | null;
  first_air_date: string | null;
};

export type TmdbTvDetails = TmdbTv & {
  number_of_seasons: number;
};

export type TmdbSearchResult = { type: "movie"; data: TmdbMovie } | { type: "tv"; data: TmdbTv };

export function posterUrl(path: string | null, size: "w92" | "w154" | "w185" | "w342" = "w185"): string | null {
  if (!path) return null;
  return `${IMAGE_BASE}/${size}${path}`;
}

export type SearchTypeFilter = "movie" | "tv" | "all";

export async function searchTmdb(query: string, typeFilter: SearchTypeFilter = "all"): Promise<TmdbSearchResult[]> {
  const key = getApiKey();
  const searchMovie = typeFilter === "all" || typeFilter === "movie";
  const searchTv = typeFilter === "all" || typeFilter === "tv";

  const [moviesRes, tvRes] = await Promise.all([
    searchMovie ? fetch(`${TMDB_BASE}/search/movie?api_key=${key}&query=${encodeURIComponent(query)}`) : Promise.resolve(null),
    searchTv ? fetch(`${TMDB_BASE}/search/tv?api_key=${key}&query=${encodeURIComponent(query)}`) : Promise.resolve(null),
  ]);
  const [moviesJson, tvJson] = await Promise.all([
    moviesRes ? moviesRes.json() : Promise.resolve({ results: [] }),
    tvRes ? tvRes.json() : Promise.resolve({ results: [] }),
  ]);
  if (searchMovie) checkTmdbError(moviesJson);
  if (searchTv) checkTmdbError(tvJson);

  const movies: TmdbSearchResult[] = (moviesJson.results || []).slice(0, 20).map((m: TmdbMovie & { popularity?: number }) => ({
    type: "movie",
    data: m,
    popularity: m.popularity || 0,
  }));
  const tvs: TmdbSearchResult[] = (tvJson.results || []).slice(0, 20).map((t: TmdbTv & { popularity?: number }) => ({
    type: "tv",
    data: t,
    popularity: t.popularity || 0,
  }));

  const combined = [...movies, ...tvs] as (TmdbSearchResult & { popularity: number })[];
  return combined.sort((a, b) => b.popularity - a.popularity).slice(0, 20);
}

export async function getTmdbTopMovies(): Promise<TmdbMovie[]> {
  const key = getApiKey();
  const res = await fetch(`${TMDB_BASE}/movie/top_rated?api_key=${key}&page=1`);
  const json = await res.json();
  checkTmdbError(json);
  return (json.results || []).slice(0, 100);
}

export async function getTmdbTopTv(): Promise<TmdbTv[]> {
  const key = getApiKey();
  const res = await fetch(`${TMDB_BASE}/tv/top_rated?api_key=${key}&page=1`);
  const json = await res.json();
  checkTmdbError(json);
  return (json.results || []).slice(0, 100);
}

export async function getTmdbPopularMovies(): Promise<TmdbMovie[]> {
  const key = getApiKey();
  const res = await fetch(`${TMDB_BASE}/movie/popular?api_key=${key}&page=1`);
  const json = await res.json();
  checkTmdbError(json);
  return (json.results || []).slice(0, 100);
}

export async function getTmdbPopularTv(): Promise<TmdbTv[]> {
  const key = getApiKey();
  const res = await fetch(`${TMDB_BASE}/tv/popular?api_key=${key}&page=1`);
  const json = await res.json();
  checkTmdbError(json);
  return (json.results || []).slice(0, 100);
}

export async function getTmdbTrending(timeWindow: "day" | "week" = "week"): Promise<{ type: "movie" | "tv"; data: TmdbMovie | TmdbTv }[]> {
  const key = getApiKey();
  const res = await fetch(`${TMDB_BASE}/trending/all/${timeWindow}?api_key=${key}`);
  const json = await res.json();
  checkTmdbError(json);
  const results = (json.results || []).slice(0, 100);
  return results.map((r: { media_type: string } & TmdbMovie & TmdbTv) => {
    if (r.media_type === "movie") {
      return { type: "movie" as const, data: { id: r.id, title: r.title, overview: r.overview, poster_path: r.poster_path, release_date: r.release_date } };
    }
    return { type: "tv" as const, data: { id: r.id, name: r.name, overview: r.overview, poster_path: r.poster_path, first_air_date: r.first_air_date } };
  }).filter((x: { type: string }) => x.type === "movie" || x.type === "tv");
}

export async function getTmdbNowPlaying(): Promise<TmdbMovie[]> {
  const key = getApiKey();
  const res = await fetch(`${TMDB_BASE}/movie/now_playing?api_key=${key}&page=1`);
  const json = await res.json();
  checkTmdbError(json);
  return (json.results || []).slice(0, 100);
}

export async function getTmdbAiringToday(): Promise<TmdbTv[]> {
  const key = getApiKey();
  const res = await fetch(`${TMDB_BASE}/tv/airing_today?api_key=${key}&page=1`);
  const json = await res.json();
  checkTmdbError(json);
  return (json.results || []).slice(0, 100);
}

export async function getTmdbTvDetails(tvId: number): Promise<TmdbTvDetails | null> {
  const key = getApiKey();
  const res = await fetch(`${TMDB_BASE}/tv/${tvId}?api_key=${key}`);
  const json = await res.json();
  if (json.status_code) return null;
  return json as TmdbTvDetails;
}

/** TMDB provider_id -> our app streaming service name (only services we show in UI) */
const TMDB_PROVIDER_TO_OUR_NAME: Record<number, string> = {
  8: "Netflix",
  9: "Prime",       // Amazon Prime Video
  15: "Hulu",
  337: "Disney+",
  386: "Peacock",
  531: "Paramount+",
  283: "HBO",       // Max / HBO Max -> map to HBO
  384: "HBO",
  350: "Apple TV",  // Apple TV+
  2: "Apple TV",    // Apple TV (legacy)
};

/** Get flatrate (subscription) watch provider names we recognize for a movie or TV show. Region defaults to US. */
export async function getTmdbWatchProviders(
  type: "movie" | "tv",
  id: number,
  region = "US"
): Promise<string[]> {
  const key = getApiKey();
  const path = type === "movie" ? "movie" : "tv";
  const res = await fetch(`${TMDB_BASE}/${path}/${id}/watch/providers?api_key=${key}`);
  const json = await res.json();
  if (json.status_code) return [];
  const regionData = json.results?.[region];
  if (!regionData?.flatrate || !Array.isArray(regionData.flatrate)) return [];
  const names = new Set<string>();
  for (const p of regionData.flatrate as { provider_id?: number }[]) {
    const ourName = p.provider_id != null ? TMDB_PROVIDER_TO_OUR_NAME[p.provider_id] : undefined;
    if (ourName) names.add(ourName);
  }
  return Array.from(names);
}
