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
import { toast } from "sonner";
import type { Media, MediaUpdatePatch } from "@/types/media";

type MediaListContextValue = {
  list: Media[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  optimisticUpdate: (id: string, patch: MediaUpdatePatch) => void;
  optimisticRemove: (id: string) => void;
  optimisticAdd: (media: Media) => void;
  /** Move one item to the front of the list (until refetch replaces sort order). */
  optimisticMoveToFront: (id: string) => void;
  /** Reorder list by id (full library order). Used when saving drag-and-drop before refetch. */
  optimisticReorder: (orderedIds: string[]) => void;
};

const MediaListContext = createContext<MediaListContextValue | null>(null);

export function MediaListProvider({ children }: { children: ReactNode }) {
  const [list, setList] = useState<Media[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    try {
      const res = await fetch("/api/media");
      const data = await res.json();
      if (!res.ok) {
        throw new Error(typeof data.error === "string" ? data.error : "Failed to load library");
      }
      setList(Array.isArray(data) ? data : []);
      setError(null);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Could not load library";
      setError(message);
      toast.error(message);
    }
  }, []);

  const optimisticUpdate = useCallback((id: string, patch: MediaUpdatePatch) => {
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

  const optimisticReorder = useCallback((orderedIds: string[]) => {
    setList((prev) => {
      const byId = new Map(prev.map((m) => [m.id, m]));
      const next: Media[] = [];
      for (const id of orderedIds) {
        const m = byId.get(id);
        if (m) next.push(m);
      }
      if (next.length !== prev.length) return prev;
      return next;
    });
  }, []);

  useEffect(() => {
    refetch().finally(() => setLoading(false));
  }, [refetch]);

  const value = useMemo(
    () => ({
      list,
      loading,
      error,
      refetch,
      optimisticUpdate,
      optimisticRemove,
      optimisticAdd,
      optimisticMoveToFront,
      optimisticReorder,
    }),
    [list, loading, error, refetch, optimisticUpdate, optimisticRemove, optimisticAdd, optimisticMoveToFront, optimisticReorder]
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
      error: null,
      refetch: async () => {},
      optimisticUpdate: () => {},
      optimisticRemove: () => {},
      optimisticAdd: () => {},
      optimisticMoveToFront: () => {},
      optimisticReorder: () => {},
    };
  }
  return ctx;
}
