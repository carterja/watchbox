"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import Image from "next/image";
import { Search, Film, Tv, Loader2, Check } from "lucide-react";
import { toast } from "sonner";
import { posterUrl } from "@/lib/tmdb";
import { DiscoverCard } from "@/components/DiscoverCard";
import { TabButton } from "@/components/TabButton";
import { QuickSetupModal } from "@/components/QuickSetupModal";
import { MobileFiltersPanel } from "@/components/MobileFiltersPanel";
import { useMediaList } from "@/contexts/MediaListContext";
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
  const [searchType, setSearchType] = useState<"all" | "movie" | "tv">("all");
  const [searchResults, setSearchResults] = useState<TmdbSearchItem[]>([]);
  const [lists, setLists] = useState<TmdbLists | null>(null);
  const { list: myMedia, refetch: refetchMyMedia } = useMediaList();
  const [loading, setLoading] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [tmdbError, setTmdbError] = useState<string | null>(null);
  const [showQuickSetup, setShowQuickSetup] = useState(false);
  const [quickSetupItem, setQuickSetupItem] = useState<TmdbSearchItem | null>(null);

  const runSearch = useCallback(async () => {
    if (!query.trim()) return;
    setLoading(true);
    setTmdbError(null);
    try {
      const res = await fetch(`/api/tmdb/search?q=${encodeURIComponent(query.trim())}`);
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

  const filteredSearchResults = useMemo(
    () =>
      searchType === "all"
        ? searchResults
        : searchResults.filter((item) => item.type === searchType),
    [searchResults, searchType]
  );

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

  const [watchProvidersByKey, setWatchProvidersByKey] = useState<Record<string, string[]>>({});

  const batchProviderItems = useMemo(() => {
    if (tab !== "browse" || !lists) return [];
    const seen = new Set<string>();
    const items: { type: "movie" | "tv"; id: number }[] = [];
    const add = (type: "movie" | "tv", id: number) => {
      const key = `${type}-${id}`;
      if (seen.has(key)) return;
      seen.add(key);
      items.push({ type, id });
    };
    if (category === "popular") {
      (lists.popular?.movies ?? []).forEach((m) => add("movie", m.id));
      (lists.popular?.tv ?? []).forEach((t) => add("tv", t.id));
    } else if (category === "trending") {
      (lists.trending ?? []).forEach((item) => add(item.type, item.data.id));
    } else if (category === "top") {
      (lists.top?.movies ?? []).forEach((m) => add("movie", m.id));
      (lists.top?.tv ?? []).forEach((t) => add("tv", t.id));
    } else if (category === "nowPlaying") {
      (lists.nowPlaying ?? []).forEach((m) => add("movie", m.id));
      (lists.airingToday ?? []).forEach((t) => add("tv", t.id));
    }
    return items;
  }, [tab, lists, category]);

  useEffect(() => {
    if (batchProviderItems.length === 0) {
      setWatchProvidersByKey({});
      return;
    }
    let cancelled = false;
    fetch("/api/tmdb/watch-providers/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: batchProviderItems }),
    })
      .then((res) => (res.ok ? res.json() : { providers: {} }))
      .then((data: { providers?: Record<string, string[]> }) => {
        if (cancelled) return;
        setWatchProvidersByKey(data?.providers ?? {});
      })
      .catch(() => {
        if (!cancelled) setWatchProvidersByKey({});
      });
    return () => {
      cancelled = true;
    };
  }, [batchProviderItems]);

  const batchProviderKeySet = useMemo(
    () => new Set(batchProviderItems.map((i) => `${i.type}-${i.id}`)),
    [batchProviderItems]
  );

  const getWatchProvidersForCard = useCallback(
    (key: string): string[] | undefined => {
      if (batchProviderKeySet.has(key)) {
        return watchProvidersByKey[key] ?? [];
      }
      return watchProvidersByKey[key];
    },
    [batchProviderKeySet, watchProvidersByKey]
  );

  const isInCollection = useCallback(
    (type: "movie" | "tv", tmdbId: number) =>
      myMedia.some((m) => m.type === type && m.tmdbId === tmdbId),
    [myMedia]
  );

  const addToLibrary = useCallback(
    async (
      item: TmdbSearchItem,
      setupData: {
        streamingService: string | null;
        viewer: import("@/types/media").Viewer | null;
        status: import("@/types/media").MediaStatus;
      }
    ) => {
      const key = item.type === "movie" ? `movie-${item.data.id}` : `tv-${item.data.id}`;
      if (myMedia.some((m) => m.type === item.type && m.tmdbId === item.data.id)) return;
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
          await refetchMyMedia();
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
      } finally {
        setAddingId(null);
      }
    },
    [myMedia, refetchMyMedia]
  );

  const addMovieFromBrowse = useCallback(
    (m: { id: number; title: string; overview: string | null; poster_path: string | null; release_date: string | null }) =>
      (setupData: {
        streamingService: string | null;
        viewer: import("@/types/media").Viewer | null;
        status: import("@/types/media").MediaStatus;
      }) =>
        addToLibrary({ type: "movie", data: m }, setupData),
    [addToLibrary]
  );

  const addTvFromBrowse = useCallback(
    (t: { id: number; name: string; overview: string | null; poster_path: string | null; first_air_date: string | null }) =>
      (setupData: {
        streamingService: string | null;
        viewer: import("@/types/media").Viewer | null;
        status: import("@/types/media").MediaStatus;
      }) =>
        addToLibrary({ type: "tv", data: t }, setupData),
    [addToLibrary]
  );

  const addTrendingItem = useCallback(
    (item: TmdbLists["trending"][0]) =>
      (setupData: {
        streamingService: string | null;
        viewer: import("@/types/media").Viewer | null;
        status: import("@/types/media").MediaStatus;
      }) => {
        if (item.type === "movie" && item.data.title) {
          addToLibrary(
            {
              type: "movie",
              data: {
                id: item.data.id,
                title: item.data.title,
                overview: item.data.overview,
                poster_path: item.data.poster_path,
                release_date: item.data.release_date ?? null,
              },
            },
            setupData
          );
        } else if (item.type === "tv" && item.data.name) {
          addToLibrary(
            {
              type: "tv",
              data: {
                id: item.data.id,
                name: item.data.name,
                overview: item.data.overview,
                poster_path: item.data.poster_path,
                first_air_date: item.data.first_air_date ?? null,
              },
            },
            setupData
          );
        }
      },
    [addToLibrary]
  );

  return (
    <div className="min-h-screen">
      <header className="sticky top-14 md:top-0 z-20 md:border-b border-shelf-border bg-shelf-bg/95 backdrop-blur relative h-0 min-h-0 overflow-visible md:h-auto md:min-h-0">
        <MobileFiltersPanel>
          <div className="flex flex-col">
            {/* Single bar: Browse/Search + categories (browse) or search UI below (search) */}
            <div className="bg-shelf-sidebar border-b border-shelf-border px-2 py-1.5 md:px-6 md:py-2.5">
              <div className="flex flex-nowrap items-center gap-1 md:gap-3 overflow-x-auto min-w-0 pr-2 md:pr-0">
                <div className="flex rounded-md md:rounded-lg border border-shelf-border bg-shelf-card p-0.5 shrink-0">
                  <TabButton size="sm" active={tab === "browse"} onClick={() => setTab("browse")}>
                    Browse
                  </TabButton>
                  <TabButton size="sm" active={tab === "search"} onClick={() => setTab("search")}>
                    Search
                  </TabButton>
                </div>
                {tab === "browse" && (
                  <>
                    <div className="h-4 w-px bg-shelf-border shrink-0 md:h-5" aria-hidden />
                    <div className="flex flex-nowrap items-center gap-0.5 md:gap-1 shrink-0">
                      <TabButton size="sm" active={category === "popular"} onClick={() => setCategory("popular")}>
                        Popular
                      </TabButton>
                      <TabButton size="sm" active={category === "trending"} onClick={() => setCategory("trending")}>
                        Trending
                      </TabButton>
                      <TabButton size="sm" active={category === "top"} onClick={() => setCategory("top")}>
                        <span className="hidden sm:inline">Top Rated</span>
                        <span className="sm:hidden">Top</span>
                      </TabButton>
                      <TabButton size="sm" active={category === "nowPlaying"} onClick={() => setCategory("nowPlaying")}>
                        <span className="hidden sm:inline">Now Playing</span>
                        <span className="sm:hidden">Now</span>
                      </TabButton>
                    </div>
                  </>
                )}
              </div>
            </div>
            {tab === "search" && (
              <div className="px-2 py-2 md:px-6 md:py-4">
                <div className="flex flex-nowrap items-center gap-1 md:gap-2 overflow-x-auto min-w-0">
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && runSearch()}
                    placeholder="Search..."
                    className="min-w-[80px] w-28 flex-1 max-w-md rounded-md md:rounded-lg border border-shelf-border bg-shelf-card px-2 py-1.5 md:px-4 md:py-2.5 text-xs md:text-base text-white placeholder-shelf-muted focus:outline-none focus:ring-2 focus:ring-shelf-accent"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={runSearch}
                    disabled={loading}
                    className="rounded-md md:rounded-lg bg-shelf-accent px-2 py-1.5 md:px-4 md:py-2.5 text-xs md:text-base font-medium text-white hover:bg-shelf-accent-hover disabled:opacity-50 flex items-center gap-1 shrink-0"
                  >
                    {loading && tab === "search" ? <Loader2 size={14} className="animate-spin md:w-[18px] md:h-[18px]" /> : <Search size={14} className="md:w-[18px] md:h-[18px]" />}
                    Search
                  </button>
                  <div className="h-4 w-px bg-shelf-border shrink-0 md:h-5" aria-hidden />
                  <div className="flex flex-nowrap gap-0.5 md:gap-1 shrink-0">
                    <TabButton size="sm" active={searchType === "all"} onClick={() => setSearchType("all")}>
                      All
                    </TabButton>
                    <TabButton size="sm" active={searchType === "movie"} onClick={() => setSearchType("movie")}>
                      Movies
                    </TabButton>
                    <TabButton size="sm" active={searchType === "tv"} onClick={() => setSearchType("tv")}>
                      TV
                    </TabButton>
                  </div>
                </div>
              </div>
            )}
          </div>
        </MobileFiltersPanel>
      </header>

      <div className="p-4 md:p-6">
        {tmdbError && (
          <div className="mb-4 rounded-lg bg-red-500/20 border border-red-500/50 text-red-200 px-3 md:px-4 py-2 md:py-3 text-sm">
            {tmdbError}
          </div>
        )}

        {tab === "search" && (
          <div className="space-y-3">
            {!loading && !query && (
              <p className="text-shelf-muted text-sm">Enter a search term above to find movies or TV shows.</p>
            )}
            {!loading && query && searchResults.length === 0 && (
              <p className="text-shelf-muted text-sm">No results found for &ldquo;{query}&rdquo;</p>
            )}
            {!loading && query && searchResults.length > 0 && filteredSearchResults.length === 0 && (
              <p className="text-shelf-muted text-sm">
                No {searchType === "movie" ? "movies" : "TV shows"} in the results. Try &ldquo;All&rdquo; or a different search.
              </p>
            )}
            {filteredSearchResults.map((item) => {
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
                              watchProviders={getWatchProvidersForCard(key)}
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
                              watchProviders={getWatchProvidersForCard(key)}
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
                            watchProviders={getWatchProvidersForCard(key)}
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
                              watchProviders={getWatchProvidersForCard(key)}
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
                              watchProviders={getWatchProvidersForCard(key)}
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
                              watchProviders={getWatchProvidersForCard(key)}
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
                              watchProviders={getWatchProvidersForCard(key)}
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
