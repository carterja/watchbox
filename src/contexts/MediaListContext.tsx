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

type UpdatePatch = Partial<
  Pick<
    Media,
    | "status"
    | "progressNote"
    | "totalSeasons"
    | "seasonEpisodeCounts"
    | "seasonProgress"
    | "manualLastWatchedSeason"
    | "manualLastWatchedEpisode"
    | "streamingService"
    | "viewer"
    | "posterPath"
    | "sortOrder"
  >
>;

type MediaListContextValue = {
  list: Media[];
  loading: boolean;
  refetch: () => Promise<void>;
  optimisticUpdate: (id: string, patch: UpdatePatch) => void;
  optimisticRemove: (id: string) => void;
  optimisticAdd: (media: Media) => void;
  /** Move one item to the front of the list (until refetch replaces sort order). */
  optimisticMoveToFront: (id: string) => void;
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

  const optimisticUpdate = useCallback((id: string, patch: UpdatePatch) => {
    setList((prev) =>
      prev.map((m) => (m.id !== id ? m : { ...m, ...patch }))
    );
  }, []);

  const optimisticRemove = useCallback((id: string) => {
    setList((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const optimisticAdd = useCallback((media: Media) => {
    setList((prev) => [...prev, media]);
  }, []);

  const optimisticMoveToFront = useCallback((id: string) => {
    setList((prev) => {
      const m = prev.find((x) => x.id === id);
      if (!m) return prev;
      return [m, ...prev.filter((x) => x.id !== id)];
    });
  }, []);

  useEffect(() => {
    refetch().finally(() => setLoading(false));
  }, [refetch]);

  const value = useMemo(
    () => ({
      list,
      loading,
      refetch,
      optimisticUpdate,
      optimisticRemove,
      optimisticAdd,
      optimisticMoveToFront,
    }),
    [list, loading, refetch, optimisticUpdate, optimisticRemove, optimisticAdd, optimisticMoveToFront]
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
      optimisticUpdate: () => {},
      optimisticRemove: () => {},
      optimisticAdd: () => {},
      optimisticMoveToFront: () => {},
    };
  }
  return ctx;
}
