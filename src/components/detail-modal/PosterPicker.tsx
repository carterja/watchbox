"use client";

import { useState } from "react";
import Image from "next/image";
import { Search, Check } from "lucide-react";
import { posterUrl } from "@/lib/tmdb";

export type PosterSearchResult = {
  file_path: string;
  width: number;
  height: number;
  vote_average: number;
};

type Props = {
  tmdbId: number;
  mediaType: "movie" | "tv";
  selectedPoster: string | null;
  onSelect: (path: string) => void;
};

export function PosterPicker({ tmdbId, mediaType, selectedPoster, onSelect }: Props) {
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<PosterSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [customUrl, setCustomUrl] = useState("");
  const [imdbPosterUrl, setImdbPosterUrl] = useState<string | null>(null);
  const [loadingImdb, setLoadingImdb] = useState(false);

  const search = async () => {
    setLoading(true);
    setImdbPosterUrl(null);
    try {
      const [postersRes, idsRes] = await Promise.all([
        fetch(`/api/tmdb/posters/${tmdbId}?type=${mediaType}`),
        fetch(`/api/tmdb/external-ids?id=${tmdbId}&type=${mediaType}`),
      ]);
      const postersData = await postersRes.json();
      setResults(postersData.posters || []);
      const idsData = await idsRes.json();
      const imdbId = idsData.imdbId;
      if (imdbId) {
        setLoadingImdb(true);
        try {
          const omdbRes = await fetch(`/api/omdb/poster?imdbId=${encodeURIComponent(imdbId)}`);
          if (omdbRes.ok) {
            const omdb = await omdbRes.json();
            if (omdb.posterUrl) setImdbPosterUrl(omdb.posterUrl);
          }
        } finally {
          setLoadingImdb(false);
        }
      }
    } catch (error) {
      console.error("Failed to load posters:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next && results.length === 0) void search();
  };

  const selectAndClose = (path: string) => {
    onSelect(path);
    setOpen(false);
  };

  return (
    <div className="space-y-2 lg:space-y-4">
      <button
        onClick={toggle}
        className="w-full flex items-center justify-center gap-1.5 lg:gap-2 px-3 lg:px-4 py-1.5 lg:py-2 rounded-lg bg-shelf-card hover:bg-[#8b5cf6]/20 border border-shelf-border hover:border-[#8b5cf6]/50 text-white transition text-xs lg:text-base"
      >
        <Search size={14} className="lg:w-4 lg:h-4" />
        {open ? "Hide" : "Change"}<span className="hidden lg:inline"> Poster</span>
      </button>

      {open && (
        <div className="space-y-2 max-h-48 lg:max-h-96 overflow-y-auto">
          <p className="text-xs text-shelf-muted lg:px-1">Select a poster:</p>
          {/* Custom URL input */}
          <div className="flex gap-2 items-center">
            <input
              type="url"
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              placeholder="Paste image URL"
              className="flex-1 min-w-0 rounded-lg border border-shelf-border bg-shelf-card px-2 lg:px-3 py-1.5 lg:py-2 text-xs lg:text-sm text-white placeholder-shelf-muted focus:outline-none focus:ring-2 focus:ring-[#8b5cf6]"
            />
            <button
              type="button"
              onClick={() => {
                if (customUrl.trim()) {
                  selectAndClose(customUrl.trim());
                  setCustomUrl("");
                }
              }}
              disabled={!customUrl.trim()}
              className="shrink-0 px-2 lg:px-3 py-1.5 lg:py-2 rounded-lg bg-shelf-card hover:bg-[#8b5cf6]/20 border border-shelf-border text-xs lg:text-sm text-white disabled:opacity-50"
            >
              Use URL
            </button>
          </div>
          {loadingImdb && <p className="text-xs text-shelf-muted">Loading IMDb poster…</p>}
          {imdbPosterUrl && !loadingImdb && (
            <button
              type="button"
              onClick={() => selectAndClose(imdbPosterUrl)}
              className="flex items-center gap-2 w-full rounded-lg border-2 border-shelf-border hover:border-[#8b5cf6]/50 p-2 text-left"
            >
              <img src={imdbPosterUrl} alt="IMDb poster" className="w-10 lg:w-12 h-14 lg:h-[4.5rem] object-cover rounded shrink-0" />
              <span className="text-xs lg:text-sm text-shelf-muted">Use IMDb poster</span>
            </button>
          )}
          {loading ? (
            <div className="text-center py-4 text-shelf-muted text-sm">Loading...</div>
          ) : (
            <div className="grid grid-cols-4 lg:grid-cols-2 gap-2">
              {results.slice(0, 10).map((poster) => (
                <button
                  key={poster.file_path}
                  onClick={() => selectAndClose(poster.file_path)}
                  className={`relative aspect-[2/3] rounded-lg overflow-hidden border-2 transition ${
                    selectedPoster === poster.file_path
                      ? "border-[#8b5cf6]"
                      : "border-shelf-border hover:border-[#8b5cf6]/50"
                  }`}
                >
                  <Image
                    src={posterUrl(poster.file_path, "w185")!}
                    alt="Poster option"
                    fill
                    className="object-cover"
                  />
                  {selectedPoster === poster.file_path && (
                    <div className="absolute top-0.5 right-0.5 lg:top-1 lg:right-1 rounded-full bg-[#8b5cf6] p-0.5 lg:p-1">
                      <Check size={10} className="lg:w-3 lg:h-3 text-white" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
