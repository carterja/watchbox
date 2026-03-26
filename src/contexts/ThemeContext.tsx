"use client";

import { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import { Toaster } from "sonner";

export const THEMES = [
  { id: "default", name: "WatchBox Purple", accent: "#8b5cf6" },
  { id: "one-dark", name: "One Dark", accent: "#61afef" },
  { id: "dracula", name: "Dracula", accent: "#bd93f9" },
  { id: "monokai", name: "Monokai", accent: "#fd971f" },
  { id: "github-dark", name: "GitHub Dark", accent: "#58a6ff" },
  { id: "solarized", name: "Solarized Dark", accent: "#b58900" },
] as const;

export type ThemeId = (typeof THEMES)[number]["id"];

const STORAGE_KEY = "watchbox-theme";

type ThemeContextValue = {
  themeId: ThemeId;
  setThemeId: (id: ThemeId) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeId, setThemeIdState] = useState<ThemeId>("default");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as ThemeId | null;
    if (stored && THEMES.some((t) => t.id === stored)) {
      setThemeIdState(stored);
      document.documentElement.setAttribute("data-theme", stored);
    }
    setMounted(true);
  }, []);

  const setThemeId = useCallback((id: ThemeId) => {
    setThemeIdState(id);
    document.documentElement.setAttribute("data-theme", id);
    localStorage.setItem(STORAGE_KEY, id);
  }, []);

  useEffect(() => {
    if (mounted) {
      document.documentElement.setAttribute("data-theme", themeId);
    }
  }, [mounted, themeId]);

  const value = useMemo(() => ({ themeId, setThemeId }), [themeId, setThemeId]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
      <Toaster
        position="bottom-center"
        toastOptions={{
          className: "!bg-shelf-card !border-shelf-border !text-white",
          style: { background: "var(--color-shelf-card)", borderColor: "var(--color-shelf-border)" },
        }}
      />
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
