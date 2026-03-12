"use client";

import { useState, useCallback, useEffect } from "react";
import Image from "next/image";
import { Search, Film, Tv, Loader2, Check } from "lucide-react";
import { toast } from "sonner";
import { posterUrl } from "@/lib/tmdb";
import { DiscoverCard } from "@/components/DiscoverCard";
import { TabButton } from "@/components/TabButton";
import { QuickSetupModal } from "@/components/QuickSetupModal";
import type { Media } from "@/types/media";

type TmdbSearchItem =
  | { type: "movie"; data: { id: number; title: string; overview: string | null; poster_path: string | null; release_date: string | null } }
  | { type: "tv"; data: { id: number; name: string; overview: string | null; poster_path: string | null; first_air_date: string | null } };

type TmdbLists = {
  top: {
    movies: { id: number; title: string; overview: string | null; poster_path: string | null; release_date: string | null }[];
    tv: { id: number; name: string; overview: string | null; poster_path: string | null; first_air_date: string | null }[];
  };
  popular: {
    movies: { id: number; title: string; overview: string | null; poster_path: string | null; release_date: string | null }[];
    tv: { id: number; name: string; overview: string | null; poster_path: string | null; first_air_date: string | null }[];
  };
  trending: { type: "movie" | "tv"; data: { id: number; title?: string; name?: string; overview: string | null; poster_path: string | null; release_date?: string | null; first_air_date?: string | null } }[];
  nowPlaying: { id: number; title: string; overview: string | null; poster_path: string | null; release_date: string | null }[];
  airingToday?: { id: number; name: string; overview: string | null; poster_path: string | null; first_air_date: string | null }[];
};

type Category = "top" | "popular" | "trending" | "nowPlaying";

export default function DiscoverPage() {
  const [tab, setTab] = useState<"search" | "browse">("browse");
  const [category, setCategory] = useState<Category>("popular");
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<TmdbSearchItem[]>([]);
  const [lists, setLists] = useState<TmdbLists | null>(null);
  const [myMedia, setMyMedia] = useState<Media[]>([]);
  const [loading, setLoading] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [tmdbError, setTmdbError] = useState<string | null>(null);
  const [showQuickSetup, setShowQuickSetup] = useState(false);
  const [quickSetupItem, setQuickSetupItem] = useState<TmdbSearchItem | null>(null);

  const fetchMyMedia = useCallback(async () => {
    const res = await fetch("/api/media");
    const data = await res.json();
    setMyMedia(Array.isArray(data) ? data : []);
  }, []);

  useEffect(() => {
    fetchMyMedia();
  }, [fetchMyMedia]);

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
      setSearchResults(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }, [query]);

  const loadLists = useCallback(async () => {
    setLoading(true);
    setTmdbError(null);
    try {
      const res = await fetch("/api/tmdb/lists");
      const data = await res.json();
      if (!res.ok) {
        setTmdbError(data.error || "Failed to load lists");
        setLists(null);
        return;
      }
      setLists(data);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load lists when switching to browse tab
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (tab === "browse" && !lists && !loading) {
      loadLists();
    }
  }, [tab, lists, loading]); // loadLists is stable (useCallback with no deps) - intentionally excluded

  const isInCollection = (type: "movie" | "tv", tmdbId: number) => {
    return myMedia.some((m) => m.type === type && m.tmdbId === tmdbId);
  };

  const addToLibrary = async (
    item: TmdbSearchItem,
    setupData: {
      streamingService: string | null;
      viewer: import("@/types/media").Viewer | null;
      status: import("@/types/media").MediaStatus;
    }
  ) => {
    const key = item.type === "movie" ? `movie-${item.data.id}` : `tv-${item.data.id}`;
    if (isInCollection(item.type, item.data.id)) return;
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
              status: setupData.status,
              streamingService: setupData.streamingService,
              viewer: setupData.viewer,
            }
          : {
              tmdbId: item.data.id,
              type: "tv",
              title: item.data.name,
              overview: item.data.overview,
              posterPath: item.data.poster_path,
              releaseDate: item.data.first_air_date,
              status: setupData.status,
              streamingService: setupData.streamingService,
              viewer: setupData.viewer,
              ...(totalSeasons != null && { totalSeasons }),
            };
      const res = await fetch("/api/media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        await fetchMyMedia();
        toast.success("Added to your list");
      } else {
        const contentType = res.headers.get('content-type');
        if (contentType?.includes('application/json')) {
          const err = await res.json();
          toast.error(err.error || "Failed to add");
        } else {
          toast.error("Failed to add: Server error");
        }
      }
    } finally {
      setAddingId(null);
    }
  };

  const addMovieFromBrowse = (m: { id: number; title: string; overview: string | null; poster_path: string | null; release_date: string | null }) => (
    setupData: {
      streamingService: string | null;
      viewer: import("@/types/media").Viewer | null;
      status: import("@/types/media").MediaStatus;
    }
  ) => addToLibrary({ type: "movie", data: m }, setupData);
  
  const addTvFromBrowse = (t: { id: number; name: string; overview: string | null; poster_path: string | null; first_air_date: string | null }) => (
    setupData: {
      streamingService: string | null;
      viewer: import("@/types/media").Viewer | null;
      status: import("@/types/media").MediaStatus;
    }
  ) => addToLibrary({ type: "tv", data: t }, setupData);
  
  const addTrendingItem = (item: TmdbLists["trending"][0]) => (
    setupData: {
      streamingService: string | null;
      viewer: import("@/types/media").Viewer | null;
      status: import("@/types/media").MediaStatus;
    }
  ) => {
    if (item.type === "movie" && item.data.title) {
      addToLibrary({
        type: "movie",
        data: {
          id: item.data.id,
          title: item.data.title,
          overview: item.data.overview,
          poster_path: item.data.poster_path,
          release_date: item.data.release_date ?? null,
        },
      }, setupData);
    } else if (item.type === "tv" && item.data.name) {
      addToLibrary({
        type: "tv",
        data: {
          id: item.data.id,
          name: item.data.name,
          overview: item.data.overview,
          poster_path: item.data.poster_path,
          first_air_date: item.data.first_air_date ?? null,
        },
      }, setupData);
    }
  };

  return (
    <div className="min-h-screen">
      <header className="sticky top-14 md:top-0 z-20 border-b border-shelf-border bg-shelf-bg/95 backdrop-blur">
        <div className="px-4 md:px-6 py-3 md:py-4">
          <div className="flex items-center justify-between mb-3 md:mb-4">
            <h1 className="text-xl md:text-2xl font-semibold text-shelf-accent">Discover</h1>
            <div className="flex gap-1.5 md:gap-2">
              <TabButton active={tab === "browse"} onClick={() => setTab("browse")}>
                Browse
              </TabButton>
              <TabButton active={tab === "search"} onClick={() => setTab("search")}>
                Search
              </TabButton>
            </div>
          </div>

          {tab === "search" && (
            <div className="flex gap-2 max-w-xl">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && runSearch()}
                placeholder="Search movies & TV shows..."
                className="flex-1 rounded-lg border border-shelf-border bg-shelf-card px-3 md:px-4 py-2 md:py-2.5 text-sm md:text-base text-white placeholder-shelf-muted focus:outline-none focus:ring-2 focus:ring-shelf-accent"
                autoFocus
              />
              <button
                type="button"
                onClick={runSearch}
                disabled={loading}
                className="rounded-lg bg-shelf-accent px-4 py-2.5 text-white font-medium hover:bg-shelf-accent-hover disabled:opacity-50 flex items-center gap-2 shrink-0"
              >
                {loading && tab === "search" ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
                Search
              </button>
            </div>
          )}

          {tab === "browse" && (
            <div className="flex gap-2">
              <TabButton active={category === "popular"} onClick={() => setCategory("popular")}>
                Popular
              </TabButton>
              <TabButton active={category === "trending"} onClick={() => setCategory("trending")}>
                Trending
              </TabButton>
              <TabButton active={category === "top"} onClick={() => setCategory("top")}>
                Top Rated
              </TabButton>
              <TabButton active={category === "nowPlaying"} onClick={() => setCategory("nowPlaying")}>
                Now Playing
              </TabButton>
            </div>
          )}
        </div>
      </header>

      <div className="p-4 md:p-6">
        {tmdbError && (
          <div className="mb-4 rounded-lg bg-red-500/20 border border-red-500/50 text-red-200 px-3 md:px-4 py-2 md:py-3 text-sm">
            {tmdbError}
          </div>
        )}

        {tab === "search" && (
          <div className="space-y-3">
            {searchResults.length === 0 && !loading && !query && (
              <p className="text-shelf-muted text-sm">Enter a search term above to find movies or TV shows.</p>
            )}
            {searchResults.length === 0 && !loading && query && (
              <p className="text-shelf-muted text-sm">No results found for &ldquo;{query}&rdquo;</p>
            )}
            {searchResults.map((item) => {
              const title = item.type === "movie" ? item.data.title : item.data.name;
              const date = item.type === "movie" ? item.data.release_date : item.data.first_air_date;
              const key = item.type === "movie" ? `movie-${item.data.id}` : `tv-${item.data.id}`;
              const adding = addingId === key;
              const inCollection = isInCollection(item.type, item.data.id);
              return (
                <div
                  key={key}
                  className="flex gap-4 rounded-xl border border-shelf-border bg-shelf-card p-4 items-center max-w-2xl"
                >
                  <div className="relative w-16 h-24 rounded-lg overflow-hidden bg-shelf-border shrink-0">
                    {item.data.poster_path ? (
                      <Image
                        src={posterUrl(item.data.poster_path, "w92")!}
                        alt={title}
                        fill
                        className="object-cover"
                        loading="lazy"
                        quality={75}
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-shelf-muted">
                        {item.type === "movie" ? <Film size={28} /> : <Tv size={28} />}
                      </div>
                    )}
                    {inCollection && (
                      <div className="absolute top-1 right-1 rounded-full bg-green-500 p-1">
                        <Check size={12} className="text-white" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-xs text-shelf-muted mb-0.5">
                      <span className="uppercase">{item.type === "movie" ? "Movie" : "TV"}</span>
                      {date && <span>{date.slice(0, 4)}</span>}
                    </div>
                    <p className="font-medium text-white truncate">{title}</p>
                  </div>
                  {inCollection ? (
                    <span className="text-xs text-green-500 font-medium shrink-0">In collection</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setQuickSetupItem(item);
                        setShowQuickSetup(true);
                      }}
                      disabled={adding}
                      className="rounded-lg bg-shelf-accent px-4 py-2 text-white text-sm font-medium hover:bg-shelf-accent-hover disabled:opacity-50 shrink-0"
                    >
                      {adding ? "Adding…" : "Add to list"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {tab === "browse" && (
          <>
            {loading && !lists ? (
              <div className="flex justify-center py-16">
                <Loader2 size={40} className="animate-spin text-shelf-accent" />
              </div>
            ) : lists ? (
              <div className="space-y-8">
                {category === "popular" && (
                  <>
                    <section>
                      <h2 className="text-lg font-semibold text-white mb-4">Popular movies</h2>
                      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3">
                        {(lists.popular?.movies ?? []).map((m) => {
                          const key = `movie-${m.id}`;
                          return (
                            <DiscoverCard
                              key={key}
                              id={m.id}
                              type="movie"
                              title={m.title}
                              overview={m.overview}
                              posterPath={m.poster_path}
                              releaseDate={m.release_date}
                              inCollection={isInCollection("movie", m.id)}
                              adding={addingId === key}
                              onAdd={addMovieFromBrowse(m)}
                            />
                          );
                        })}
                      </div>
                    </section>
                    <section>
                      <h2 className="text-lg font-semibold text-white mb-4">Popular TV shows</h2>
                      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3">
                        {(lists.popular?.tv ?? []).map((t) => {
                          const key = `tv-${t.id}`;
                          return (
                            <DiscoverCard
                              key={key}
                              id={t.id}
                              type="tv"
                              title={t.name}
                              overview={t.overview}
                              posterPath={t.poster_path}
                              releaseDate={t.first_air_date}
                              inCollection={isInCollection("tv", t.id)}
                              adding={addingId === key}
                              onAdd={addTvFromBrowse(t)}
                            />
                          );
                        })}
                      </div>
                    </section>
                  </>
                )}

                {category === "trending" && (
                  <section>
                    <h2 className="text-lg font-semibold text-white mb-4">Trending this week</h2>
                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3">
                      {(lists.trending ?? []).map((item) => {
                        const title = item.type === "movie" ? item.data.title : item.data.name;
                        if (!title) return null;
                        const key = `${item.type}-${item.data.id}`;
                        const releaseDate = item.type === "movie" 
                          ? item.data.release_date 
                          : item.data.first_air_date;
                        return (
                          <DiscoverCard
                            key={key}
                            id={item.data.id}
                            type={item.type}
                            title={title}
                            overview={item.data.overview}
                            posterPath={item.data.poster_path}
                            releaseDate={releaseDate}
                            inCollection={isInCollection(item.type, item.data.id)}
                            adding={addingId === key}
                            onAdd={addTrendingItem(item)}
                          />
                        );
                      })}
                    </div>
                  </section>
                )}

                {category === "top" && (
                  <>
                    <section>
                      <h2 className="text-lg font-semibold text-white mb-4">Top rated movies</h2>
                      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3">
                        {(lists.top?.movies ?? []).map((m) => {
                          const key = `movie-${m.id}`;
                          return (
                            <DiscoverCard
                              key={key}
                              id={m.id}
                              type="movie"
                              title={m.title}
                              overview={m.overview}
                              posterPath={m.poster_path}
                              releaseDate={m.release_date}
                              inCollection={isInCollection("movie", m.id)}
                              adding={addingId === key}
                              onAdd={addMovieFromBrowse(m)}
                            />
                          );
                        })}
                      </div>
                    </section>
                    <section>
                      <h2 className="text-lg font-semibold text-white mb-4">Top rated TV shows</h2>
                      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3">
                        {(lists.top?.tv ?? []).map((t) => {
                          const key = `tv-${t.id}`;
                          return (
                            <DiscoverCard
                              key={key}
                              id={t.id}
                              type="tv"
                              title={t.name}
                              overview={t.overview}
                              posterPath={t.poster_path}
                              releaseDate={t.first_air_date}
                              inCollection={isInCollection("tv", t.id)}
                              adding={addingId === key}
                              onAdd={addTvFromBrowse(t)}
                            />
                          );
                        })}
                      </div>
                    </section>
                  </>
                )}

                {category === "nowPlaying" && (
                  <>
                    <section>
                      <h2 className="text-lg font-semibold text-white mb-4">Now playing in theaters</h2>
                      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3">
                        {(lists.nowPlaying ?? []).map((m) => {
                          const key = `movie-${m.id}`;
                          return (
                            <DiscoverCard
                              key={key}
                              id={m.id}
                              type="movie"
                              title={m.title}
                              overview={m.overview}
                              posterPath={m.poster_path}
                              releaseDate={m.release_date}
                              inCollection={isInCollection("movie", m.id)}
                              adding={addingId === key}
                              onAdd={addMovieFromBrowse(m)}
                            />
                          );
                        })}
                      </div>
                    </section>
                    <section>
                      <h2 className="text-lg font-semibold text-white mb-4">Airing today (TV)</h2>
                      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3">
                        {(lists.airingToday ?? []).map((t) => {
                          const key = `tv-${t.id}`;
                          return (
                            <DiscoverCard
                              key={key}
                              id={t.id}
                              type="tv"
                              title={t.name}
                              overview={t.overview}
                              posterPath={t.poster_path}
                              releaseDate={t.first_air_date}
                              inCollection={isInCollection("tv", t.id)}
                              adding={addingId === key}
                              onAdd={addTvFromBrowse(t)}
                            />
                          );
                        })}
                      </div>
                    </section>
                  </>
                )}
              </div>
            ) : null}
          </>
        )}

        <p className="mt-8 text-xs text-shelf-muted">
          This product uses the TMDB API but is not endorsed or certified by TMDB.
        </p>
      </div>

      {showQuickSetup && quickSetupItem && (
        <QuickSetupModal
          mediaTitle={quickSetupItem.type === "movie" ? quickSetupItem.data.title : quickSetupItem.data.name}
          mediaType={quickSetupItem.type}
          onClose={() => {
            setShowQuickSetup(false);
            setQuickSetupItem(null);
          }}
          onSave={(setupData) => {
            setShowQuickSetup(false);
            addToLibrary(quickSetupItem, setupData);
            setQuickSetupItem(null);
          }}
        />
      )}
    </div>
  );
}
