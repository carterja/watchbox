"use client";

import { useState } from "react";
import { Search, Check } from "lucide-react";

export type TmdbSearchItem =
  | {
      type: "movie";
      data: {
        id: number;
        title: string;
        overview: string | null;
        poster_path: string | null;
        release_date: string | null;
      };
    }
  | {
      type: "tv";
      data: {
        id: number;
        name: string;
        overview: string | null;
        poster_path: string | null;
        first_air_date: string | null;
      };
    };

type Props = {
  mediaType: "movie" | "tv";
  initialTitle: string;
  currentTmdbId: number;
  onApply: (item: TmdbSearchItem) => void;
};

export function TmdbRematchPanel({ mediaType, initialTitle, currentTmdbId, onApply }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(initialTitle);
  const [results, setResults] = useState<TmdbSearchItem[]>([]);
  const [loading, setLoading] = useState(false);
  const isSeries = mediaType === "tv";

  const search = async () => {
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("q", q);
      params.set("type", mediaType);
      const res = await fetch(`/api/tmdb/search?${params.toString()}`);
      const data = await res.json();
      setResults(Array.isArray(data) ? (data as TmdbSearchItem[]) : []);
    } catch (err) {
      console.error("Failed to search TMDB for rematch:", err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next && results.length === 0) void search();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs md:text-sm font-medium text-white">TMDB Match</h3>
        <button
          type="button"
          onClick={toggle}
          className="text-[11px] md:text-sm text-shelf-muted hover:text-white underline-offset-2 hover:underline"
        >
          {open ? "Hide" : "Fix match"}
        </button>
      </div>
      {open && (
        <div className="rounded-lg border border-shelf-border bg-shelf-card/40 p-3 space-y-2 md:space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void search();
              }}
              className="flex-1 rounded-lg border border-shelf-border bg-shelf-card px-2 md:px-3 py-1.5 text-[11px] md:text-sm text-white placeholder-shelf-muted focus:outline-none focus:ring-1 focus:ring-[#8b5cf6]"
              placeholder={`Search TMDB for ${isSeries ? "series" : "movie"}...`}
            />
            <button
              type="button"
              onClick={() => void search()}
              disabled={loading}
              className="inline-flex items-center gap-1 md:gap-1.5 rounded-lg bg-shelf-accent px-2.5 md:px-3 py-1.5 text-[11px] md:text-sm font-medium text-white hover:bg-shelf-accent-hover disabled:opacity-50"
            >
              <Search size={12} className="md:w-3.5 md:h-3.5" />
              <span className="md:hidden">Go</span>
              <span className="hidden md:inline">Search</span>
            </button>
          </div>
          <div className="max-h-40 md:max-h-56 overflow-y-auto space-y-1">
            {loading ? (
              <p className="text-[11px] md:text-xs text-shelf-muted py-1.5 md:py-2">Searching…</p>
            ) : results.length === 0 ? (
              <p className="text-[11px] md:text-xs text-shelf-muted py-1.5 md:py-2">No results yet.</p>
            ) : (
              results.slice(0, 10).map((item) => {
                const itemTitle =
                  item.type === "movie" ? item.data.title : item.data.name;
                const itemDate =
                  item.type === "movie"
                    ? item.data.release_date
                    : item.data.first_air_date;
                const isActive = item.data.id === currentTmdbId;
                return (
                  <button
                    key={`${item.type}-${item.data.id}`}
                    type="button"
                    onClick={() => onApply(item)}
                    className={`w-full flex items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[11px] md:text-sm transition ${
                      isActive
                        ? "bg-[#8b5cf6]/20 border border-[#8b5cf6]/60"
                        : "hover:bg-shelf-card border border-transparent"
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white truncate">{itemTitle}</p>
                      <p className="text-[10px] text-shelf-muted truncate">
                        {(itemDate || "").slice(0, 4)} •{" "}
                        {item.type === "movie" ? "Movie" : "TV"}
                      </p>
                    </div>
                    {isActive && (
                      <Check size={12} className="md:w-3.5 md:h-3.5 text-[#8b5cf6] shrink-0" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
