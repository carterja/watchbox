"use client";

import { createContext, useContext, useEffect, useState, useCallback, useMemo, type ReactNode } from "react";

export type DisplayMode = "compact" | "mid" | "poster";

const STORAGE_KEY = "watchbox-display-mode";

type DisplayModeContextValue = {
  displayMode: DisplayMode;
  setDisplayMode: (mode: DisplayMode) => void;
};

const DisplayModeContext = createContext<DisplayModeContextValue | null>(null);

export function DisplayModeProvider({ children }: { children: ReactNode }) {
  const [displayMode, setDisplayModeState] = useState<DisplayMode>("mid");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as DisplayMode | null;
    if (stored && ["compact", "mid", "poster"].includes(stored)) {
      setDisplayModeState(stored);
    }
    setMounted(true);
  }, []);

  const setDisplayMode = useCallback((mode: DisplayMode) => {
    setDisplayModeState(mode);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, mode);
    }
  }, []);

  const resolvedMode = mounted ? displayMode : "mid";
  const value = useMemo(
    () => ({ displayMode: resolvedMode, setDisplayMode }),
    [resolvedMode, setDisplayMode]
  );

  return (
    <DisplayModeContext.Provider value={value}>
      {children}
    </DisplayModeContext.Provider>
  );
}

export function useDisplayMode(): DisplayModeContextValue {
  const ctx = useContext(DisplayModeContext);
  if (!ctx) {
    return {
      displayMode: "mid",
      setDisplayMode: () => {},
    };
  }
  return ctx;
}

/**
 * Container class for media lists. Compact = list/row layout; mid/poster = grid.
 * - compact: list view (rows)
 * - mid: smaller poster grid (more columns)
 * - poster: large poster grid (fewer columns)
 */
export function getMediaListContainerClass(mode: DisplayMode): string {
  switch (mode) {
    case "compact":
      return "flex flex-col gap-2";
    case "poster":
      return "grid gap-3 md:gap-4 grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6";
    case "mid":
    default:
      return "grid gap-3 md:gap-4 grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8";
  }
}

