"use client";

import { useTheme } from "@/contexts/ThemeContext";
import { Check } from "lucide-react";

export default function SettingsPage() {
  const { themeId, setThemeId } = useTheme();

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
      </div>
    </div>
  );
}
