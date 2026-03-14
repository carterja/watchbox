"use client";

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";

type MobileFiltersContextValue = {
  open: boolean;
  toggle: () => void;
  close: () => void;
};

const MobileFiltersContext = createContext<MobileFiltersContextValue | null>(null);

export function MobileFiltersProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const toggle = useCallback(() => setOpen((prev) => !prev), []);
  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    const handleScroll = () => setOpen(false);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <MobileFiltersContext.Provider value={{ open, toggle, close }}>
      {children}
    </MobileFiltersContext.Provider>
  );
}

export function useMobileFilters(): MobileFiltersContextValue {
  const ctx = useContext(MobileFiltersContext);
  if (!ctx) {
    return {
      open: true,
      toggle: () => {},
      close: () => {},
    };
  }
  return ctx;
}
