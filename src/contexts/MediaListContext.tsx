"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import type { Media } from "@/types/media";

type MediaListContextValue = {
  list: Media[];
  loading: boolean;
  refetch: () => Promise<void>;
};

const MediaListContext = createContext<MediaListContextValue | null>(null);

export function MediaListProvider({ children }: { children: ReactNode }) {
  const [list, setList] = useState<Media[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    const res = await fetch("/api/media");
    const data = await res.json();
    setList(Array.isArray(data) ? data : []);
  }, []);

  useEffect(() => {
    refetch().finally(() => setLoading(false));
  }, [refetch]);

  const value = useMemo(
    () => ({ list, loading, refetch }),
    [list, loading, refetch]
  );

  return (
    <MediaListContext.Provider value={value}>
      {children}
    </MediaListContext.Provider>
  );
}

export function useMediaList(): MediaListContextValue {
  const ctx = useContext(MediaListContext);
  if (!ctx) {
    return {
      list: [],
      loading: false,
      refetch: async () => {},
    };
  }
  return ctx;
}
