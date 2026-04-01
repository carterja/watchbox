"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import Image from "next/image";
import { Search, Film, Tv, Loader2, Check } from "lucide-react";
import { toast } from "sonner";
import { posterUrl } from "@/lib/tmdb";
import { DiscoverCard } from "@/components/DiscoverCard";
import { TabButton } from "@/components/TabButton";
import { QuickSetupModal } from "@/components/QuickSetupModal";
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
  const [searchQuery, setSearchQuery] = useState("");
  const [searchMode, setSearchMode] = useState<"title" | "actor" | "imdb">("title");
  const [query, setQuery] = useState("");
  const [searchType, setSearchType] = useState<"all" | "movie" | "tv">("all");
  const [searchResults, setSearchResults] = useState<TmdbSearchItem[]>([]);
  const [lists, setLists] = useState<TmdbLists | null>(null);
  const { list: myMedia, optimisticAdd } = useMediaList();
  const [loading, setLoading] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [tmdbError, setTmdbError] = useState<string | null>(null);
  const [showQuickSetup, setShowQuickSetup] = useState(false);
  const [quickSetupItem, setQuickSetupItem] = useState<TmdbSearchItem | null>(null);
  const [imdbLoading, setImdbLoading] = useState(false);
  const [imdbError, setImdbError] = useState<string | null>(null);
  const [personResults, setPersonResults] = useState<{ id: number; name: string; profile_path: string | null; known_for_department: string }[]>([]);
  const [selectedPersonId, setSelectedPersonId] = useState<number | null>(null);
  const [selectedPersonName, setSelectedPersonName] = useState<string | null>(null);
  const [personCredits, setPersonCredits] = useState<{ movies: { id: number; title: string; poster_path: string | null; release_date: string | null }[]; tv: { id: number; name: string; poster_path: string | null; first_air_date: string | null }[] } | null>(null);
  const [loadingPersonSearch, setLoadingPersonSearch] = useState(false);
  const [loadingPersonCredits, setLoadingPersonCredits] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchQueryRef = useRef(searchQuery);
  searchQueryRef.current = searchQuery;

  useEffect(() => {
    if (searchMode !== "actor") return;
    if (searchQuery.trim().length < 2) {
      setPersonResults([]);
      setLoadingPersonSearch(false);
      setSelectedPersonId(null);
      setSelectedPersonName(null);
      setPersonCredits(null);
      return;
    }
    setSelectedPersonId(null);
    setSelectedPersonName(null);
    setPersonCredits(null);
    const t = setTimeout(async () => {
      setLoadingPersonSearch(true);
      const q = searchQuery.trim();
      try {
        const res = await fetch(`/api/tmdb/search/person?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        if (searchQueryRef.current !== q) return;
        if (!res.ok) {
          setTmdbError(data.error || "Search failed");
          setPersonResults([]);
        } else {
          setTmdbError(null);
          setPersonResults(Array.isArray(data) ? data : []);
        }
      } finally {
        if (searchQueryRef.current === q) setLoadingPersonSearch(false);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [searchMode, searchQuery]);

  useEffect(() => {
    const handleSlash = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (e.key === "/" && target.tagName !== "INPUT" && target.tagName !== "TEXTAREA" && !target.isContentEditable) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleSlash);
    return () => window.removeEventListener("keydown", handleSlash);
  }, []);

  const lookupByImdb = useCallback(async () => {
    const raw = searchQuery.trim();
    if (!raw) return;
    setImdbError(null);
    setImdbLoading(true);
    try {
      const match = raw.match(/(?:imdb\.com\/title\/)?(tt\d+)/i);
      const id = match ? match[1] : raw.startsWith("tt") ? raw : `tt${raw}`;
      const res = await fetch(`/api/tmdb/by-imdb?id=${encodeURIComponent(id)}`);
      const data = await res.json();
      if (!res.ok) {
        setImdbError(data.error || "Lookup failed");
        return;
      }
      const item = data.type === "movie"
        ? { type: "movie" as const, data: { id: data.data.id, title: data.data.title, overview: data.data.overview, poster_path: data.data.poster_path, release_date: data.data.release_date, ...(data.data.runtime != null && { runtime: data.data.runtime }) } }
        : { type: "tv" as const, data: { id: data.data.id, name: data.data.name, overview: data.data.overview, poster_path: data.data.poster_path, first_air_date: data.data.first_air_date } };
      setQuickSetupItem(item as TmdbSearchItem);
      setShowQuickSetup(true);
      setSearchQuery("");
    } catch {
      setImdbError("Lookup failed");
    } finally {
      setImdbLoading(false);
    }
  }, [searchQuery]);

  const runSearch = useCallback(async () => {
    const q = searchQuery.trim();
    if (!q) return;
    setQuery(q);
    setLoading(true);
    setTmdbError(null);
    try {
      const res = await fetch(`/api/tmdb/search?q=${encodeURIComponent(q)}`);
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
  }, [searchQuery]);

  const loadPersonCredits = useCallback(async (personId: number, personName: string) => {
    setSelectedPersonId(personId);
    setSelectedPersonName(personName);
    setLoadingPersonCredits(true);
    setPersonCredits(null);
    try {
      const res = await fetch(`/api/tmdb/person/${personId}/credits`);
      const data = await res.json();
      if (res.ok) setPersonCredits(data);
    } finally {
      setLoadingPersonCredits(false);
    }
  }, []);

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
  useEffect(() => {
    if (tab === "browse" && !lists && !loading) {
      loadLists();
    }
  }, [tab, lists, loading, loadLists]);

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

  const EMPTY_PROVIDERS: string[] = useMemo(() => [], []);
  const getWatchProvidersForCard = useCallback(
    (key: string): string[] | undefined => {
      if (batchProviderKeySet.has(key)) {
        return watchProvidersByKey[key] ?? EMPTY_PROVIDERS;
      }
      return watchProvidersByKey[key];
    },
    [batchProviderKeySet, watchProvidersByKey, EMPTY_PROVIDERS]
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
        const movieData = item.data as { runtime?: number };
        const payload =
          item.type === "movie"
            ? {
                tmdbId: item.data.id,
                type: "movie",
                title: item.data.title,
                overview: item.data.overview,
                posterPath: item.data.poster_path,
                releaseDate: item.data.release_date,
                ...(movieData.runtime != null && movieData.runtime > 0 && { runtime: movieData.runtime }),
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
          const created = await res.json();
          optimisticAdd(created);
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
    [myMedia, optimisticAdd]
  );

  const handleDiscoverAdd = useCallback(
    (payload: import("@/components/DiscoverCard").DiscoverAddPayload) => {
      const { id, type, title, overview, posterPath, releaseDate, setupData } = payload;
      const item: TmdbSearchItem =
        type === "movie"
          ? { type: "movie", data: { id, title, overview, poster_path: posterPath, release_date: releaseDate ?? null } }
          : { type: "tv", data: { id, name: title, overview, poster_path: posterPath, first_air_date: releaseDate ?? null } };
      addToLibrary(item, setupData);
    },
    [addToLibrary]
  );

  return (
    <div className="min-h-screen">
      <div className="p-4 md:p-6">
        {/* Browse or Search: always visible, part of the page */}
        <div className="sticky top-14 md:top-0 z-10 -mx-4 -mt-4 px-4 pt-4 md:-mx-6 md:-mt-6 md:px-6 md:pt-6 pb-3 md:pb-4 mb-3 md:mb-4 bg-shelf-bg border-b border-shelf-border">
          <div className="flex flex-nowrap items-center gap-2 md:gap-3 overflow-x-auto min-w-0">
            <div className="flex rounded-lg border border-shelf-border bg-shelf-card p-0.5 shrink-0">
              <TabButton
                size="sm"
                active={tab === "browse"}
                onClick={() => setTab("browse")}
                data-testid="discover-tab-browse"
              >
                Browse
              </TabButton>
              <TabButton
                size="sm"
                active={tab === "search"}
                onClick={() => setTab("search")}
                data-testid="discover-tab-search"
              >
                Search
              </TabButton>
            </div>
            {tab === "browse" && (
              <>
                <div className="h-4 w-px bg-shelf-border shrink-0 md:h-5" aria-hidden />
                <div className="flex flex-nowrap items-center gap-1 md:gap-1.5 shrink-0">
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
            {tab === "search" && (
              <div className="ml-auto flex flex-nowrap items-center gap-1 shrink-0">
                <div className="flex rounded-lg border border-shelf-border bg-shelf-card p-0.5">
                  <TabButton
                    size="sm"
                    active={searchMode === "title"}
                    onClick={() => setSearchMode("title")}
                    data-testid="discover-search-mode-title"
                  >
                    Movies & TV
                  </TabButton>
                  <TabButton
                    size="sm"
                    active={searchMode === "actor"}
                    onClick={() => setSearchMode("actor")}
                    data-testid="discover-search-mode-actor"
                  >
                    Actor
                  </TabButton>
                  <TabButton
                    size="sm"
                    active={searchMode === "imdb"}
                    onClick={() => setSearchMode("imdb")}
                    data-testid="discover-search-mode-imdb"
                  >
                    IMDb
                  </TabButton>
                </div>
              </div>
            )}
          </div>
        </div>
        {tmdbError && (
          <div className="mb-4 rounded-lg bg-red-500/20 border border-red-500/50 text-red-200 px-3 md:px-4 py-2 md:py-3 text-sm">
            {tmdbError}
          </div>
        )}

        {tab === "search" && (
          <div className="space-y-4">
            {/* Single search pill: one input + mode pills + primary action */}
            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (searchMode === "imdb") setImdbError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key !== "Enter") return;
                  if (searchMode === "title") runSearch();
                  else if (searchMode === "imdb") lookupByImdb();
                }}
                placeholder={
                  searchMode === "title"
                    ? "Search movies & TV…"
                    : searchMode === "actor"
                      ? "Type an actor name…"
                      : "IMDb link or ID (e.g. tt0137523)"
                }
                className="min-w-[160px] flex-1 max-w-md rounded-lg border border-shelf-border bg-shelf-card px-3 py-2.5 text-sm text-white placeholder-shelf-muted focus:outline-none focus:ring-2 focus:ring-shelf-accent"
                autoFocus
              />
              {(searchMode === "title" || searchMode === "imdb") && (
                <button
                  type="button"
                  data-testid="discover-query-submit"
                  onClick={searchMode === "title" ? runSearch : lookupByImdb}
                  disabled={searchMode === "title" ? loading : imdbLoading || !searchQuery.trim()}
                  className="rounded-lg bg-shelf-accent px-4 py-2.5 text-sm font-medium text-white hover:bg-shelf-accent-hover disabled:opacity-50 flex items-center gap-2 shrink-0"
                >
                  {(searchMode === "title" && loading) || (searchMode === "imdb" && imdbLoading) ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <Search size={18} />
                  )}
                  {searchMode === "title" ? "Search" : "Look up"}
                </button>
              )}
              {searchMode === "actor" && loadingPersonSearch && (
                <Loader2 size={20} className="animate-spin text-shelf-muted shrink-0" />
              )}
            </div>
            {searchMode === "title" && (
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex rounded-lg border border-shelf-border bg-shelf-card p-0.5">
                  <TabButton
                    size="sm"
                    active={searchType === "all"}
                    onClick={() => setSearchType("all")}
                    data-testid="discover-search-type-all"
                  >
                    All
                  </TabButton>
                  <TabButton
                    size="sm"
                    active={searchType === "movie"}
                    onClick={() => setSearchType("movie")}
                    data-testid="discover-search-type-movie"
                  >
                    Movies
                  </TabButton>
                  <TabButton
                    size="sm"
                    active={searchType === "tv"}
                    onClick={() => setSearchType("tv")}
                    data-testid="discover-search-type-tv"
                  >
                    TV
                  </TabButton>
                </div>
              </div>
            )}

            {/* Mode: Movies & TV — results */}
            {searchMode === "title" && (
              <>
                {!loading && !query && (
                  <p className="text-shelf-muted text-sm">Enter a search term or switch to Actor / IMDb above.</p>
                )}
                {!loading && query && searchResults.length === 0 && (
                  <p className="text-shelf-muted text-sm">No results for &ldquo;{query}&rdquo;. Try a different search or browse.</p>
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
                  data-testid={`discover-search-result-${key}`}
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
              </>
            )}

            {/* Mode: Actor — dropdown + filmography */}
            {searchMode === "actor" && (
              <>
                {searchQuery.trim().length >= 2 && (
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <label htmlFor="actor-select" className="text-sm font-medium text-shelf-muted shrink-0">
                      Select actor:
                    </label>
                    <select
                      id="actor-select"
                      value={selectedPersonId ?? ""}
                      onChange={(e) => {
                        const id = e.target.value ? parseInt(e.target.value, 10) : null;
                        if (id != null) {
                          const p = personResults.find((r) => r.id === id);
                          if (p) loadPersonCredits(p.id, p.name);
                        }
                      }}
                      className="min-w-[200px] max-w-full rounded-lg border border-shelf-border bg-shelf-card px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-shelf-accent appearance-none bg-[length:1rem_1rem] bg-[right_0.5rem_center] bg-no-repeat pr-9"
                      style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")" }}
                    >
                      <option value="">Select an actor…</option>
                      {personResults.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                          {p.known_for_department ? ` (${p.known_for_department})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                {!loadingPersonSearch && searchQuery.trim().length >= 2 && personResults.length === 0 && (
                  <p className="text-shelf-muted text-sm">No people found for &ldquo;{searchQuery}&rdquo;.</p>
                )}
                {searchQuery.trim().length < 2 && (
                  <p className="text-shelf-muted text-sm">Type at least 2 characters to search by actor name.</p>
                )}
                {selectedPersonId && loadingPersonCredits && (
              <div className="flex justify-center py-12">
                <Loader2 size={32} className="animate-spin text-shelf-accent" />
              </div>
            )}
            {selectedPersonId && selectedPersonName && personCredits && !loadingPersonCredits && (
              <div className="space-y-6">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => { setSelectedPersonId(null); setSelectedPersonName(null); setPersonCredits(null); }}
                    className="text-shelf-muted hover:text-white text-sm"
                  >
                    ← Back to results
                  </button>
                  <span className="text-shelf-muted">|</span>
                  <h2 className="text-lg font-semibold text-white">{selectedPersonName}</h2>
                </div>
                {personCredits.movies.length > 0 && (
                  <section>
                    <h3 className="text-base font-medium text-shelf-muted mb-3">Movies</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3">
                      {personCredits.movies.map((m) => {
                        const key = `movie-${m.id}`;
                        return (
                          <DiscoverCard
                            key={key}
                            id={m.id}
                            type="movie"
                            title={m.title}
                            overview={null}
                            posterPath={m.poster_path}
                            releaseDate={m.release_date}
                            inCollection={isInCollection("movie", m.id)}
                            adding={addingId === key}
                            onAdd={handleDiscoverAdd}
                            watchProviders={getWatchProvidersForCard(key)}
                          />
                        );
                      })}
                    </div>
                  </section>
                )}
                {personCredits.tv.length > 0 && (
                  <section>
                    <h3 className="text-base font-medium text-shelf-muted mb-3">TV</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3">
                      {personCredits.tv.map((t) => {
                        const key = `tv-${t.id}`;
                        return (
                          <DiscoverCard
                            key={key}
                            id={t.id}
                            type="tv"
                            title={t.name}
                            overview={null}
                            posterPath={t.poster_path}
                            releaseDate={t.first_air_date}
                            inCollection={isInCollection("tv", t.id)}
                            adding={addingId === key}
                            onAdd={handleDiscoverAdd}
                            watchProviders={getWatchProvidersForCard(key)}
                          />
                        );
                      })}
                    </div>
                  </section>
                )}
                {personCredits.movies.length === 0 && personCredits.tv.length === 0 && (
                  <p className="text-shelf-muted text-sm">No credits found.</p>
                )}
              </div>
            )}
              </>
            )}

            {/* Mode: IMDb — hint and error only (input/button are in the pill) */}
            {searchMode === "imdb" && (
              <>
                <p className="text-shelf-muted text-sm">Paste an IMDb title link or ID (e.g. tt0137523) and click Look up to add it.</p>
                {imdbError && <p className="text-red-400 text-sm">{imdbError}</p>}
              </>
            )}
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
                              onAdd={handleDiscoverAdd}
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
                              onAdd={handleDiscoverAdd}
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
                            onAdd={handleDiscoverAdd}
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
                              onAdd={handleDiscoverAdd}
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
                              onAdd={handleDiscoverAdd}
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
                              onAdd={handleDiscoverAdd}
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
                              onAdd={handleDiscoverAdd}
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
