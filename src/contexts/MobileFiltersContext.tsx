"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

type MobileFiltersContextValue = {
  open: boolean;
  toggle: () => void;
};

const MobileFiltersContext = createContext<MobileFiltersContextValue | null>(null);

export function MobileFiltersProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const toggle = useCallback(() => setOpen((prev) => !prev), []);
  return (
    <MobileFiltersContext.Provider value={{ open, toggle }}>
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
    };
  }
  return ctx;
}
