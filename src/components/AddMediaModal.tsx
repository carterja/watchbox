"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import { X, Search, Film, Tv, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { posterUrl } from "@/lib/tmdb";
import type { MediaStatus } from "@/types/media";

type TmdbSearchItem =
  | { type: "movie"; data: { id: number; title: string; overview: string | null; poster_path: string | null; release_date: string | null } }
  | { type: "tv"; data: { id: number; name: string; overview: string | null; poster_path: string | null; first_air_date: string | null } };

type TmdbTop = {
  movies: { id: number; title: string; overview: string | null; poster_path: string | null; release_date: string | null }[];
  tv: { id: number; name: string; overview: string | null; poster_path: string | null; first_air_date: string | null }[];
};

type Props = {
  onClose: () => void;
  onAdded: () => void;
  defaultStatus: MediaStatus;
  typeFilter?: "movie" | "tv";
};

export function AddMediaModal({ onClose, onAdded, defaultStatus, typeFilter }: Props) {
  const [tab, setTab] = useState<"search" | "top">("search");
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<TmdbSearchItem[]>([]);
  const [topResults, setTopResults] = useState<TmdbTop | null>(null);
  const [loading, setLoading] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [tmdbError, setTmdbError] = useState<string | null>(null);

  const runSearch = useCallback(async () => {
    if (!query.trim()) return;
    setLoading(true);
    setTmdbError(null);
    try {
      const res = await fetch(`/api/tmdb/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (!res.ok) {
        setTmdbError(data.error || "Search failed");
        setSearchResults([]);
        return;
      }
      const raw = Array.isArray(data) ? data : [];
      const filtered = typeFilter ? raw.filter((x: TmdbSearchItem) => x.type === typeFilter) : raw;
      setSearchResults(filtered);
    } catch {
      setTmdbError("Network error — search failed");
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  }, [query, typeFilter]);

  const loadTop = useCallback(async () => {
    setLoading(true);
    setTmdbError(null);
    try {
      const res = await fetch("/api/tmdb/top");
      const data = await res.json();
      if (!res.ok) {
        setTmdbError(data.error || "Failed to load Top 100");
        setTopResults(null);
        return;
      }
      if (typeFilter === "movie") setTopResults({ movies: data.movies || [], tv: [] });
      else if (typeFilter === "tv") setTopResults({ movies: [], tv: data.tv || [] });
      else setTopResults(data);
    } catch {
      setTmdbError("Network error — could not load Top 100");
      setTopResults(null);
    } finally {
      setLoading(false);
    }
  }, [typeFilter]);

  const addToLibrary = async (item: TmdbSearchItem) => {
    const key = item.type === "movie" ? `movie-${item.data.id}` : `tv-${item.data.id}`;
    setAddingId(key);
    try {
      let totalSeasons: number | undefined;
      if (item.type === "tv") {
        const tvRes = await fetch(`/api/tmdb/tv/${item.data.id}`);
        if (tvRes.ok) {
          const tvData = await tvRes.json();
          if (tvData.number_of_seasons != null) totalSeasons = tvData.number_of_seasons;
        }
      }
      const payload =
        item.type === "movie"
          ? {
              tmdbId: item.data.id,
              type: "movie",
              title: item.data.title,
              overview: item.data.overview,
              posterPath: item.data.poster_path,
              releaseDate: item.data.release_date,
              status: defaultStatus,
            }
          : {
              tmdbId: item.data.id,
              type: "tv",
              title: item.data.name,
              overview: item.data.overview,
              posterPath: item.data.poster_path,
              releaseDate: item.data.first_air_date,
              status: defaultStatus,
              ...(totalSeasons != null && { totalSeasons }),
            };
      const res = await fetch("/api/media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        onAdded();
        toast.success("Added to your list");
      } else {
        const contentType = res.headers.get("content-type");
        if (contentType?.includes("application/json")) {
          const err = await res.json();
          toast.error(err.error || "Failed to add");
        } else {
          toast.error("Failed to add: Server error");
        }
      }
    } catch {
      toast.error("Network error — could not add");
    } finally {
      setAddingId(null);
    }
  };

  const addMovieFromTop = async (m: TmdbTop["movies"][0]) => {
    await addToLibrary({
      type: "movie",
      data: m,
    });
  };

  const addTvFromTop = async (t: TmdbTop["tv"][0]) => {
    await addToLibrary({
      type: "tv",
      data: t,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70" onClick={onClose}>
      <div
        className="w-full max-w-2xl max-h-[85vh] overflow-hidden rounded-2xl border border-shelf-border bg-shelf-bg shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-shelf-border">
          <h2 className="text-xl font-semibold">Add movie or TV show</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-shelf-muted hover:bg-shelf-card hover:text-white"
          >
            <X size={20} />
          </button>
        </div>
        <div className="flex border-b border-shelf-border">
          <button
            type="button"
            onClick={() => setTab("search")}
            className={`flex-1 py-3 text-sm font-medium ${tab === "search" ? "text-shelf-accent border-b-2 border-shelf-accent" : "text-shelf-muted"}`}
          >
            Search
          </button>
          <button
            type="button"
            onClick={() => { setTab("top"); if (!topResults) loadTop(); }}
            className={`flex-1 py-3 text-sm font-medium ${tab === "top" ? "text-shelf-accent border-b-2 border-shelf-accent" : "text-shelf-muted"}`}
          >
            Top 100
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {tmdbError && (
            <div className="mb-4 rounded-lg bg-red-500/20 border border-red-500/50 text-red-200 px-4 py-3 text-sm">
              {tmdbError}
            </div>
          )}
          {tab === "search" && (
            <>
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && runSearch()}
                  placeholder="Search movies or TV shows..."
                  className="flex-1 rounded-lg border border-shelf-border bg-shelf-card px-4 py-2 text-white placeholder-shelf-muted focus:outline-none focus:ring-2 focus:ring-shelf-accent"
                />
                <button
                  type="button"
                  onClick={runSearch}
                  disabled={loading}
                  className="rounded-lg bg-shelf-accent px-4 py-2 text-white font-medium hover:bg-shelf-accent-hover disabled:opacity-50 flex items-center gap-2"
                >
                  {loading ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
                  Search
                </button>
              </div>
              <div className="space-y-2">
                {searchResults.map((item) => {
                  const title = item.type === "movie" ? item.data.title : item.data.name;
                  const date = item.type === "movie" ? item.data.release_date : item.data.first_air_date;
                  const key = item.type === "movie" ? `movie-${item.data.id}` : `tv-${item.data.id}`;
                  const adding = addingId === key;
                  return (
                    <div
                      key={key}
                      className="flex gap-3 rounded-lg border border-shelf-border bg-shelf-card p-3 items-center"
                    >
                      <div className="relative w-12 h-[72px] rounded overflow-hidden bg-shelf-border shrink-0">
                        {item.data.poster_path ? (
                          <Image
                            src={posterUrl(item.data.poster_path, "w92")!}
                            alt={title}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center text-shelf-muted">
                            {item.type === "movie" ? <Film size={24} /> : <Tv size={24} />}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 text-xs text-shelf-muted">
                          <span>{item.type === "movie" ? "Movie" : "TV"}</span>
                          {date && <span>{date.slice(0, 4)}</span>}
                        </div>
                        <p className="font-medium truncate">{title}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => addToLibrary(item)}
                        disabled={adding}
                        className="rounded-lg bg-shelf-accent px-3 py-1.5 text-white text-sm font-medium hover:bg-shelf-accent-hover disabled:opacity-50"
                      >
                        {adding ? "Adding…" : "Add"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </>
          )}
          {tab === "top" && (
            <>
              {loading && !topResults ? (
                <div className="flex justify-center py-12">
                  <Loader2 size={32} className="animate-spin text-shelf-accent" />
                </div>
              ) : topResults ? (
                <div className="space-y-6">
                  {(!typeFilter || typeFilter === "movie") && (
                  <div>
                    <h3 className="text-sm font-semibold text-shelf-muted mb-3">Top movies</h3>
                    <div className="flex flex-wrap gap-2">
                      {topResults.movies.map((m) => {
                        const key = `movie-${m.id}`;
                        const adding = addingId === key;
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => addMovieFromTop(m)}
                            disabled={adding}
                            className="flex items-center gap-2 rounded-lg border border-shelf-border bg-shelf-card px-3 py-2 text-left hover:border-shelf-accent/50 disabled:opacity-50"
                          >
                            {m.poster_path ? (
                              <div className="relative w-8 h-12 rounded overflow-hidden shrink-0">
                                <Image src={posterUrl(m.poster_path, "w92")!} alt={m.title} fill className="object-cover" loading="lazy" quality={75} />
                              </div>
                            ) : <Film size={24} className="text-shelf-muted shrink-0" />}
                            <span className="text-sm truncate max-w-[140px]">{m.title}</span>
                            {adding && <Loader2 size={14} className="animate-spin shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  )}
                  {(!typeFilter || typeFilter === "tv") && (
                  <div>
                    <h3 className="text-sm font-semibold text-shelf-muted mb-3">Top TV shows</h3>
                    <div className="flex flex-wrap gap-2">
                      {topResults.tv.map((t) => {
                        const key = `tv-${t.id}`;
                        const adding = addingId === key;
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => addTvFromTop(t)}
                            disabled={adding}
                            className="flex items-center gap-2 rounded-lg border border-shelf-border bg-shelf-card px-3 py-2 text-left hover:border-shelf-accent/50 disabled:opacity-50"
                          >
                            {t.poster_path ? (
                              <div className="relative w-8 h-12 rounded overflow-hidden shrink-0">
                                <Image src={posterUrl(t.poster_path, "w92")!} alt={t.name} fill className="object-cover" loading="lazy" quality={75} />
                              </div>
                            ) : <Tv size={24} className="text-shelf-muted shrink-0" />}
                            <span className="text-sm truncate max-w-[140px]">{t.name}</span>
                            {adding && <Loader2 size={14} className="animate-spin shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  )}
                </div>
              ) : null}
            </>
          )}
        </div>
        <p className="text-xs text-shelf-muted p-4 border-t border-shelf-border">
          This product uses the TMDB API but is not endorsed or certified by TMDB.
        </p>
      </div>
    </div>
  );
}
