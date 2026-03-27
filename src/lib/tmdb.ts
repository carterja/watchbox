import { TMDB_PROVIDER_TO_SERVICE } from "@/lib/constants";

const TMDB_BASE = "https://api.themoviedb.org/3";
const IMAGE_BASE = "https://image.tmdb.org/t/p";
const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1000;

function getApiKey(): string {
  const key = process.env.TMDB_API_KEY?.trim();
  if (!key) throw new Error("TMDB_API_KEY is not set. Get a free key at https://www.themoviedb.org/settings/api");
  return key;
}

/** Shared fetch helper for TMDB endpoints — handles api_key injection, error checking, and 429 rate-limit retries. */
async function tmdbGet<T = Record<string, unknown>>(
  path: string,
  params?: Record<string, string>,
  attempt = 0
): Promise<T> {
  const url = new URL(`${TMDB_BASE}${path}`);
  url.searchParams.set("api_key", getApiKey());
  if (params) {
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  }
  
  const res = await fetch(url);
  const json = await res.json();
  
  // Handle 429 rate limit with exponential backoff
  if (res.status === 429 && attempt < MAX_RETRIES) {
    const retryAfter = res.headers.get("retry-after");
    const waitMs = retryAfter 
      ? parseInt(retryAfter) * 1000 
      : INITIAL_BACKOFF_MS * Math.pow(2, attempt);
    
    await new Promise((resolve) => setTimeout(resolve, waitMs));
    return tmdbGet<T>(path, params, attempt + 1);
  }
  
  if (json.status_code) {
    throw new Error(json.status_message || `TMDB error ${json.status_code}`);
  }
  return json as T;
}

/** Variant that returns null instead of throwing on TMDB errors (for optional lookups). */
async function tmdbGetOrNull<T = Record<string, unknown>>(
  path: string,
  params?: Record<string, string>
): Promise<T | null> {
  try {
    return await tmdbGet<T>(path, params);
  } catch {
    return null;
  }
}

// ── Types ────────────────────────────────────────────────────────────

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

export type TmdbFindResult =
  | { type: "movie"; data: TmdbMovie & { runtime?: number } }
  | { type: "tv"; data: TmdbTv };

export type TmdbSeasonEpisode = {
  episode_number: number;
  name: string;
  air_date: string | null;
  overview: string | null;
  still_path: string | null;
  runtime: number | null;
};

export type SearchTypeFilter = "movie" | "tv" | "all";

// ── Image helpers ────────────────────────────────────────────────────

export function isExternalPoster(path: string | null): boolean {
  if (!path) return false;
  return path.startsWith("http://") || path.startsWith("https://");
}

export function posterUrl(
  path: string | null,
  size: "w92" | "w154" | "w185" | "w342" | "w500" | "w780" = "w185"
): string | null {
  if (!path) return null;
  if (isExternalPoster(path)) return path;
  return `${IMAGE_BASE}/${size}${path}`;
}

// ── Search ───────────────────────────────────────────────────────────

type ResultsPage<T> = { results: T[] };

export async function searchTmdb(query: string, typeFilter: SearchTypeFilter = "all"): Promise<TmdbSearchResult[]> {
  const q = encodeURIComponent(query);
  const searchMovie = typeFilter === "all" || typeFilter === "movie";
  const searchTv = typeFilter === "all" || typeFilter === "tv";

  const [moviesJson, tvJson] = await Promise.all([
    searchMovie ? tmdbGet<ResultsPage<TmdbMovie & { popularity?: number }>>(`/search/movie`, { query: q }) : { results: [] },
    searchTv ? tmdbGet<ResultsPage<TmdbTv & { popularity?: number }>>(`/search/tv`, { query: q }) : { results: [] },
  ]);

  const movies: (TmdbSearchResult & { popularity: number })[] = (moviesJson.results || []).slice(0, 20).map((m) => ({
    type: "movie", data: m, popularity: m.popularity || 0,
  }));
  const tvs: (TmdbSearchResult & { popularity: number })[] = (tvJson.results || []).slice(0, 20).map((t) => ({
    type: "tv", data: t, popularity: t.popularity || 0,
  }));

  return [...movies, ...tvs].sort((a, b) => b.popularity - a.popularity).slice(0, 20);
}

// ── List endpoints ───────────────────────────────────────────────────

async function tmdbResultsList<T>(path: string, limit = 100): Promise<T[]> {
  const json = await tmdbGet<ResultsPage<T>>(path, { page: "1" });
  return (json.results || []).slice(0, limit);
}

export function getTmdbTopMovies() { return tmdbResultsList<TmdbMovie>("/movie/top_rated"); }
export function getTmdbTopTv() { return tmdbResultsList<TmdbTv>("/tv/top_rated"); }
export function getTmdbPopularMovies() { return tmdbResultsList<TmdbMovie>("/movie/popular"); }
export function getTmdbPopularTv() { return tmdbResultsList<TmdbTv>("/tv/popular"); }
export function getTmdbNowPlaying() { return tmdbResultsList<TmdbMovie>("/movie/now_playing"); }
export function getTmdbAiringToday() { return tmdbResultsList<TmdbTv>("/tv/airing_today"); }

export async function getTmdbTrending(timeWindow: "day" | "week" = "week"): Promise<{ type: "movie" | "tv"; data: TmdbMovie | TmdbTv }[]> {
  const json = await tmdbGet<ResultsPage<{ media_type: string } & TmdbMovie & TmdbTv>>(`/trending/all/${timeWindow}`);
  return (json.results || []).slice(0, 100)
    .filter((r) => r.media_type === "movie" || r.media_type === "tv")
    .map((r) => {
      if (r.media_type === "movie") {
        return { type: "movie" as const, data: { id: r.id, title: r.title, overview: r.overview, poster_path: r.poster_path, release_date: r.release_date } };
      }
      return { type: "tv" as const, data: { id: r.id, name: r.name, overview: r.overview, poster_path: r.poster_path, first_air_date: r.first_air_date } };
    });
}

// ── Detail endpoints ─────────────────────────────────────────────────

export async function getTmdbTvDetails(tvId: number): Promise<TmdbTvDetails | null> {
  return tmdbGetOrNull<TmdbTvDetails>(`/tv/${tvId}`);
}

export type TmdbMovieDetails = TmdbMovie & { runtime?: number };

export async function getTmdbMovieDetails(movieId: number): Promise<TmdbMovieDetails | null> {
  return tmdbGetOrNull<TmdbMovieDetails>(`/movie/${movieId}`);
}

export async function getTmdbTvSeason(
  tvId: number,
  seasonNumber: number
): Promise<{ episode_count: number; episodes: TmdbSeasonEpisode[] } | null> {
  type RawEpisode = {
    episode_number?: number;
    name?: string;
    air_date?: string | null;
    overview?: string | null;
    still_path?: string | null;
    runtime?: number | null;
  };
  const json = await tmdbGetOrNull<{ episodes?: RawEpisode[] }>(`/tv/${tvId}/season/${seasonNumber}`);
  if (!json) return null;
  const eps = json.episodes || [];
  return {
    episode_count: eps.length,
    episodes: eps.map((e) => ({
      episode_number: e.episode_number ?? 0,
      name: e.name ?? "Episode",
      air_date: e.air_date ?? null,
      overview: typeof e.overview === "string" && e.overview.trim() ? e.overview.trim() : null,
      still_path: typeof e.still_path === "string" && e.still_path ? e.still_path : null,
      runtime:
        typeof e.runtime === "number" && Number.isFinite(e.runtime) && e.runtime > 0
          ? Math.round(e.runtime)
          : null,
    })),
  };
}

export async function getTmdbByImdbId(imdbId: string): Promise<TmdbFindResult | null> {
  const id = imdbId.trim();
  if (!/^tt\d+$/i.test(id)) return null;
  const json = await tmdbGet<{ movie_results?: TmdbMovie[]; tv_results?: TmdbTv[] }>(
    `/find/${encodeURIComponent(id)}`,
    { external_source: "imdb_id" }
  );
  const movieResults = json.movie_results || [];
  const tvResults = json.tv_results || [];
  if (movieResults.length > 0) {
    const m = movieResults[0];
    return {
      type: "movie",
      data: { id: m.id, title: m.title, overview: m.overview ?? null, poster_path: m.poster_path ?? null, release_date: m.release_date ?? null },
    };
  }
  if (tvResults.length > 0) {
    const t = tvResults[0];
    return {
      type: "tv",
      data: { id: t.id, name: t.name, overview: t.overview ?? null, poster_path: t.poster_path ?? null, first_air_date: t.first_air_date ?? null },
    };
  }
  return null;
}

// ── Watch providers ──────────────────────────────────────────────────

export async function getTmdbWatchProviders(
  type: "movie" | "tv",
  id: number,
  region = "US"
): Promise<string[]> {
  const path = type === "movie" ? "movie" : "tv";
  const json = await tmdbGetOrNull<{ results?: Record<string, { flatrate?: { provider_id?: number }[] }> }>(
    `/${path}/${id}/watch/providers`
  );
  if (!json) return [];
  const regionData = json.results?.[region];
  if (!regionData?.flatrate || !Array.isArray(regionData.flatrate)) return [];
  const names = new Set<string>();
  for (const p of regionData.flatrate) {
    const ourName = p.provider_id != null ? TMDB_PROVIDER_TO_SERVICE[p.provider_id] : undefined;
    if (ourName) names.add(ourName);
  }
  return Array.from(names);
}
