"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";

type ReorderModeContextValue = {
  reorderMode: boolean;
  setReorderMode: (value: boolean | ((prev: boolean) => boolean)) => void;
};

const ReorderModeContext = createContext<ReorderModeContextValue | null>(null);

export function ReorderModeProvider({ children }: { children: ReactNode }) {
  const [reorderMode, setReorderModeState] = useState(false);
  const setReorderMode = useCallback((value: boolean | ((prev: boolean) => boolean)) => {
    setReorderModeState((prev) => (typeof value === "function" ? value(prev) : value));
  }, []);

  const value: ReorderModeContextValue = { reorderMode, setReorderMode };
  return (
    <ReorderModeContext.Provider value={value}>
      {children}
    </ReorderModeContext.Provider>
  );
}

export function useReorderMode(): ReorderModeContextValue {
  const ctx = useContext(ReorderModeContext);
  if (!ctx) {
    return {
      reorderMode: false,
      setReorderMode: () => {},
    };
  }
  return ctx;
}
