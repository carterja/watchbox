"use client";

import { useState } from "react";
import Link from "next/link";
import { useTheme, THEMES } from "@/contexts/ThemeContext";
import { Check, ChevronRight, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { PlexMarkIcon } from "@/components/icons/PlexMarkIcon";

export default function SettingsPage() {
  const { themeId, setThemeId } = useTheme();
  const [syncingSeasons, setSyncingSeasons] = useState(false);
  const syncSeasons = async () => {
    setSyncingSeasons(true);
    try {
      const res = await fetch("/api/sync-seasons", { method: "POST" });
      const data = (await res.json()) as { error?: string; details?: string; updated?: number; failed?: number; total?: number };
      if (!res.ok) {
        const extra = typeof data.details === "string" ? ` ${data.details}` : "";
        toast.error((data.error || "Sync failed") + extra);
        return;
      }
      const total = data.total ?? 0;
      const updated = data.updated ?? 0;
      const failed = data.failed ?? 0;
      if (total === 0) {
        toast.success("All series already have season and episode counts.");
      } else {
        toast.success(
          `Updated ${updated} series.${failed > 0 ? ` ${failed} failed.` : ""}`
        );
      }
    } catch {
      toast.error("Sync failed");
    } finally {
      setSyncingSeasons(false);
    }
  };

  return (
    <div className="min-h-screen">
      <header className="sticky top-14 md:top-0 z-20 border-b border-shelf-border bg-shelf-bg/95 backdrop-blur">
        <div className="px-4 md:px-6 py-3 md:py-4">
          <h1 className="text-xl md:text-2xl font-semibold text-shelf-accent">Settings</h1>
        </div>
      </header>
      <div className="p-4 md:p-6 max-w-4xl">
        <section>
          <h2 className="text-sm font-medium text-shelf-muted uppercase tracking-wide mb-3">
            Integrations
          </h2>
          <p className="text-sm text-shelf-muted mb-3">
            Connect your Plex server and compare On Deck with your WatchBox library.
          </p>
          <Link
            href="/plex"
            className="flex items-center gap-3 rounded-xl border border-shelf-border bg-shelf-card/60 px-4 py-3.5 transition hover:border-shelf-accent/50 hover:bg-shelf-card"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-shelf-border bg-gradient-to-br from-cyan-500/20 to-[#8b5cf6]/20">
              <PlexMarkIcon className="text-cyan-400" size={22} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white">Plex & library sync</p>
              <p className="text-xs text-shelf-muted">Status, On Deck overlap, and progress sync</p>
            </div>
            <ChevronRight className="h-5 w-5 shrink-0 text-shelf-muted" aria-hidden />
          </Link>
        </section>

        <section className="mt-10">
          <h2 className="text-sm font-medium text-shelf-muted uppercase tracking-wide mb-3">
            Theme
          </h2>
          <p className="text-sm text-shelf-muted mb-4">
            Choose an accent theme. Inspired by popular IDE color schemes.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {THEMES.map((theme) => {
              const isActive = themeId === theme.id;
              return (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => setThemeId(theme.id)}
                  className={`relative rounded-xl border-2 p-4 text-left transition ${
                    isActive
                      ? "border-shelf-accent bg-shelf-card"
                      : "border-shelf-border bg-shelf-card/50 hover:border-shelf-border hover:bg-shelf-card"
                  }`}
                >
                  <div
                    className="w-full h-8 rounded-lg mb-2"
                    style={{ backgroundColor: theme.accent }}
                  />
                  <p className="text-sm font-medium text-white">{theme.name}</p>
                  {isActive && (
                    <div className="absolute top-2 right-2 rounded-full bg-shelf-accent p-1">
                      <Check size={12} className="text-white" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        <section className="mt-10">
          <h2 className="text-sm font-medium text-shelf-muted uppercase tracking-wide mb-3">
            Library
          </h2>
          <p className="text-sm text-shelf-muted mb-4">
            Fetches TMDB season totals and per-season episode counts (for dropdowns and progress). Runs for series missing that data; new series also get counts the first time you open “Set last watched” or run this sync.
          </p>
          <button
            type="button"
            onClick={syncSeasons}
            disabled={syncingSeasons}
            className="inline-flex items-center gap-2 rounded-lg bg-shelf-accent px-4 py-2.5 text-sm font-medium text-white hover:bg-shelf-accent-hover disabled:opacity-50"
          >
            {syncingSeasons ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <RefreshCw size={18} />
            )}
            {syncingSeasons ? "Syncing…" : "Sync seasons & episode counts from TMDB"}
          </button>
        </section>

        <section className="mt-10 pt-10 border-t border-shelf-border">
          <h2 className="text-sm font-medium text-shelf-muted uppercase tracking-wide mb-3">
            Attribution
          </h2>
          <p className="text-sm text-shelf-muted">
            Streaming service icons made by{" "}
            <a
              href="https://www.flaticon.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-shelf-accent hover:underline"
            >
              Flaticon
            </a>
          </p>
        </section>
      </div>
    </div>
  );
}
