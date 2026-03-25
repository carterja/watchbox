"use client";

/**
 * Background prefetch for GET /api/what-next while the user is anywhere in the dashboard.
 *
 * Gate: only prefetch when MediaList has at least one TV item with status in_progress (no wasted TMDB work).
 * Schedule: requestIdleCallback (fallback setTimeout) so first paint stays fast.
 * Invalidate: call refresh() after mark-watched, set position, or anything that changes next-episode resolution.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Media } from "@/types/media";
import type { WhatNextRow } from "@/lib/whatNext";
import { useMediaList } from "@/contexts/MediaListContext";

export type WhatNextCacheStatus = "idle" | "loading" | "success" | "error";

export function shouldPrefetchWhatNext(list: Media[]): boolean {
  return list.some((m) => m.type === "tv" && m.status === "in_progress");
}

type WhatNextCacheValue = {
  rows: WhatNextRow[] | null;
  status: WhatNextCacheStatus;
  error: string | null;
  fetchedAt: number | null;
  /** Fetch what-next and update cache. Use silent: true to avoid clearing UI during revalidation. */
  refresh: (opts?: { silent?: boolean }) => Promise<void>;
  /** Idempotent prefetch (silent); skips if already success or in flight. */
  prefetch: () => Promise<void>;
  /** Clear cache so the next refresh loads fresh (e.g. rare edge cases). */
  invalidate: () => void;
  /** Patch one row (e.g. after mark-watched) without refetching the full list. */
  mergeRow: (row: WhatNextRow) => void;
};

const WhatNextCacheContext = createContext<WhatNextCacheValue | null>(null);

function WhatNextPrefetchScheduler({
  prefetch,
  rows,
  status,
}: {
  prefetch: () => Promise<void>;
  rows: WhatNextRow[] | null;
  status: WhatNextCacheStatus;
}) {
  const { list, loading: mediaLoading } = useMediaList();

  useEffect(() => {
    if (mediaLoading) return;
    if (!shouldPrefetchWhatNext(list)) return;
    if (status === "success" && rows !== null) return;

    const run = () => {
      void prefetch();
    };

    if (typeof requestIdleCallback !== "undefined") {
      const id = requestIdleCallback(run, { timeout: 3000 });
      return () => cancelIdleCallback(id);
    }
    const t = window.setTimeout(run, 1500);
    return () => clearTimeout(t);
  }, [mediaLoading, list, prefetch, rows, status]);

  return null;
}

export function WhatNextCacheProvider({ children }: { children: ReactNode }) {
  const [rows, setRows] = useState<WhatNextRow[] | null>(null);
  const [status, setStatus] = useState<WhatNextCacheStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [fetchedAt, setFetchedAt] = useState<number | null>(null);
  const rowsRef = useRef<WhatNextRow[] | null>(null);
  const inFlightRef = useRef<Promise<void> | null>(null);

  rowsRef.current = rows;

  const fetchWhatNext = useCallback(async (opts?: { silent?: boolean }): Promise<void> => {
    const silent = opts?.silent ?? false;

    if (!silent) {
      setStatus("loading");
    } else if (rowsRef.current === null) {
      setStatus("loading");
    }

    try {
      const res = await fetch("/api/what-next");
      if (!res.ok) throw new Error("load failed");
      const data = (await res.json()) as WhatNextRow[];
      const next = Array.isArray(data) ? data : [];
      setRows(next);
      setStatus("success");
      setError(null);
      setFetchedAt(Date.now());
    } catch {
      if (silent && rowsRef.current !== null) {
        return;
      }
      setStatus("error");
      setError("Could not load What next");
      if (!silent) {
        setRows([]);
      }
    }
  }, []);

  const refresh = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (inFlightRef.current) {
        await inFlightRef.current;
        return;
      }
      const p = fetchWhatNext(opts).finally(() => {
        inFlightRef.current = null;
      });
      inFlightRef.current = p;
      await p;
    },
    [fetchWhatNext]
  );

  const prefetch = useCallback(async () => {
    if (status === "success" && rowsRef.current !== null) return;
    if (inFlightRef.current) {
      await inFlightRef.current;
      return;
    }
    await refresh({ silent: true });
  }, [refresh, status]);

  const invalidate = useCallback(() => {
    setRows(null);
    setStatus("idle");
    setError(null);
    setFetchedAt(null);
  }, []);

  const mergeRow = useCallback((row: WhatNextRow) => {
    setRows((prev) => {
      if (!prev) return [row];
      const rest = prev.filter((r) => r.mediaId !== row.mediaId);
      return [row, ...rest];
    });
    setStatus("success");
    setError(null);
    setFetchedAt(Date.now());
  }, []);

  const value = useMemo(
    () => ({
      rows,
      status,
      error,
      fetchedAt,
      refresh,
      prefetch,
      invalidate,
      mergeRow,
    }),
    [rows, status, error, fetchedAt, refresh, prefetch, invalidate, mergeRow]
  );

  return (
    <WhatNextCacheContext.Provider value={value}>
      <WhatNextPrefetchScheduler prefetch={prefetch} rows={rows} status={status} />
      {children}
    </WhatNextCacheContext.Provider>
  );
}

export function useWhatNextCache(): WhatNextCacheValue {
  const ctx = useContext(WhatNextCacheContext);
  if (!ctx) {
    throw new Error("useWhatNextCache must be used within WhatNextCacheProvider");
  }
  return ctx;
}
