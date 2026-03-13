"use client";

import { useState } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { Check, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export default function SettingsPage() {
  const { themeId, setThemeId } = useTheme();
  const [syncingSeasons, setSyncingSeasons] = useState(false);
  const syncSeasons = async () => {
    setSyncingSeasons(true);
    try {
      const res = await fetch("/api/sync-seasons", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Sync failed");
        return;
      }
      if (data.total === 0) {
        toast.success("All series already have season counts.");
      } else {
        toast.success(
          `Updated ${data.updated} series.${data.failed > 0 ? ` ${data.failed} failed.` : ""}`
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
      <div className="p-4 md:p-6 max-w-2xl">
        <section>
          <h2 className="text-sm font-medium text-shelf-muted uppercase tracking-wide mb-3">
            Theme
          </h2>
          <p className="text-sm text-shelf-muted mb-4">
            Choose an accent theme. Inspired by popular IDE color schemes.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { id: "default" as const, name: "WatchBox Purple", accent: "#8b5cf6" },
              { id: "one-dark" as const, name: "One Dark", accent: "#61afef" },
              { id: "dracula" as const, name: "Dracula", accent: "#bd93f9" },
              { id: "monokai" as const, name: "Monokai", accent: "#fd971f" },
              { id: "github-dark" as const, name: "GitHub Dark", accent: "#58a6ff" },
              { id: "solarized" as const, name: "Solarized Dark", accent: "#b58900" },
            ].map((theme) => {
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
            Sync season counts from TMDB for TV series that are missing them. New series get this when added; use this to backfill older entries.
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
            {syncingSeasons ? "Syncing…" : "Sync season counts from TMDB"}
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
