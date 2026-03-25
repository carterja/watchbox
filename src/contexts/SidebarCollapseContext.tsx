"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const STORAGE_KEY = "watchbox-sidebar-collapsed";

type SidebarCollapseContextValue = {
  collapsed: boolean;
  setCollapsed: (value: boolean) => void;
  toggleCollapsed: () => void;
  mainPaddingClass: string;
};

const SidebarCollapseContext = createContext<SidebarCollapseContextValue | null>(null);

export function SidebarCollapseProvider({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsedState] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      setCollapsedState(localStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      /* ignore */
    }
    setMounted(true);
  }, []);

  const persist = useCallback((next: boolean) => {
    try {
      localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, []);

  const setCollapsed = useCallback(
    (value: boolean) => {
      setCollapsedState(value);
      persist(value);
    },
    [persist]
  );

  const toggleCollapsed = useCallback(() => {
    setCollapsedState((c) => {
      const next = !c;
      persist(next);
      return next;
    });
  }, [persist]);

  const mainPaddingClass = collapsed ? "md:pl-16" : "md:pl-56";

  const value = useMemo(
    () => ({
      collapsed: mounted ? collapsed : false,
      setCollapsed,
      toggleCollapsed,
      mainPaddingClass: mounted ? mainPaddingClass : "md:pl-56",
    }),
    [collapsed, mounted, mainPaddingClass, setCollapsed, toggleCollapsed]
  );

  return (
    <SidebarCollapseContext.Provider value={value}>{children}</SidebarCollapseContext.Provider>
  );
}

export function useSidebarCollapse(): SidebarCollapseContextValue {
  const ctx = useContext(SidebarCollapseContext);
  if (!ctx) {
    throw new Error("useSidebarCollapse must be used within SidebarCollapseProvider");
  }
  return ctx;
}
