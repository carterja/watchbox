"use client";

import { createContext, useContext, useState, useCallback, useEffect, useMemo, type ReactNode } from "react";
import { usePathname } from "next/navigation";

type MobileFiltersContextValue = {
  open: boolean;
  toggle: () => void;
  close: () => void;
};

const MobileFiltersContext = createContext<MobileFiltersContextValue | null>(null);

export function MobileFiltersProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const toggle = useCallback(() => setOpen((prev) => !prev), []);
  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    close();
  }, [pathname, close]);

  useEffect(() => {
    const handleScroll = () => setOpen(false);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const value = useMemo(() => ({ open, toggle, close }), [open, toggle, close]);

  return (
    <MobileFiltersContext.Provider value={value}>
      {children}
    </MobileFiltersContext.Provider>
  );
}

export function useMobileFilters(): MobileFiltersContextValue {
  const ctx = useContext(MobileFiltersContext);
  if (!ctx) {
    return {
      open: false,
      toggle: () => {},
      close: () => {},
    };
  }
  return ctx;
}
