"use client";

import { useCallback, useState } from "react";
import Image from "next/image";
import { Loader2, Search, X, Film, Tv } from "lucide-react";
import { toast } from "sonner";
import { posterUrl } from "@/lib/tmdb";
import type { PlexOnDeckItem } from "@/lib/plex";

type TmdbSearchResult = {
  id: number;
  title: string;
  posterPath: string | null;
  releaseYear?: number;
  mediaType: "movie" | "tv";
};

type Props = {
  item: PlexOnDeckItem;
  onMatch: (tmdbId: number, mediaType: "movie" | "tv") => void;
  onClose: () => void;
};

export function PlexTmdbMatchModal({ item, onMatch, onClose }: Props) {
  const [query, setQuery] = useState(item.title);
  const [results, setResults] = useState<TmdbSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const search = useCallback(async () => {
    if (!query.trim()) {
      toast.error("Enter a search term");
      return;
    }
    setLoading(true);
    setSearched(true);
    try {
      const res = await fetch(`/api/tmdb/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (!res.ok || !Array.isArray(data)) {
        setResults([]);
        toast.error("Search failed");
        return;
      }
      setResults(data.slice(0, 12));
    } catch {
      toast.error("Search failed");
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [query]);

  const handleSelect = (result: TmdbSearchResult) => {
    onMatch(result.id, result.mediaType);
  };

  const itemKind = item.type === "show" ? "TV series" : item.type === "movie" ? "Movie" : "Item";

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center md:p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full md:w-full md:max-w-2xl bg-shelf-bg rounded-t-3xl md:rounded-2xl border border-shelf-border shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between gap-2 border-b border-shelf-border px-4 py-3 sm:px-6 sm:py-4 shrink-0">
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold text-white truncate">Find on TMDB</h2>
            <p className="text-xs text-shelf-muted truncate">
              Matching <strong>{item.title}</strong> ({itemKind})
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 flex items-center justify-center h-10 w-10 rounded-lg text-shelf-muted hover:text-white hover:bg-shelf-card transition"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Search box */}
        <div className="border-b border-shelf-border px-4 py-3 sm:px-6 sm:py-4 shrink-0 space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && search()}
              placeholder="Search TMDB..."
              className="flex-1 rounded-lg border border-shelf-border bg-shelf-card/50 px-3 py-2 text-sm text-white placeholder:text-shelf-muted focus:outline-none focus:border-[#8b5cf6] focus:ring-1 focus:ring-[#8b5cf6]"
            />
            <button
              type="button"
              onClick={() => search()}
              disabled={loading}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#8b5cf6] px-4 py-2 text-sm font-medium text-white hover:bg-[#9b7df0] disabled:opacity-50"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
              <span className="hidden sm:inline">Search</span>
            </button>
          </div>
          {results.length > 0 && (
            <p className="text-xs text-shelf-muted">
              {results.length} result{results.length !== 1 ? "s" : ""} — click to match
            </p>
          )}
        </div>

        {/* Results */}
        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 sm:px-6">
          {!searched ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-shelf-muted space-y-2 py-8">
              <Search size={40} className="opacity-30" />
              <p className="text-sm">Search for a title to find and match it</p>
            </div>
          ) : loading ? (
            <div className="flex flex-col items-center justify-center h-full">
              <Loader2 size={32} className="animate-spin text-shelf-muted mb-2" />
              <p className="text-sm text-shelf-muted">Searching…</p>
            </div>
          ) : results.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-shelf-muted space-y-2 py-8">
              <Search size={40} className="opacity-30" />
              <p className="text-sm">No results found — try a different search</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {results.map((result) => {
                const src = result.posterPath ? posterUrl(result.posterPath, "w154") : null;
                return (
                  <button
                    key={result.id}
                    type="button"
                    onClick={() => handleSelect(result)}
                    className="group relative rounded-lg overflow-hidden border border-shelf-border bg-shelf-card hover:border-[#8b5cf6] transition cursor-pointer"
                  >
                    <div className="relative aspect-[2/3] bg-shelf-card flex items-center justify-center">
                      {src ? (
                        <Image
                          src={src}
                          alt={result.title}
                          fill
                          className="object-cover group-hover:scale-105 transition"
                          sizes="200px"
                        />
                      ) : (
                        <div className="flex items-center justify-center text-shelf-muted">
                          {result.mediaType === "movie" ? <Film size={32} /> : <Tv size={32} />}
                        </div>
                      )}
                    </div>
                    <div className="p-2 space-y-0.5">
                      <p className="text-xs font-medium text-white line-clamp-2 leading-snug">
                        {result.title}
                      </p>
                      <p className="text-[10px] text-shelf-muted">
                        {result.releaseYear || "—"} • {result.mediaType === "tv" ? "TV" : "Movie"}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
