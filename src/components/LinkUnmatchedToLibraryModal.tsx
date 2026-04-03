"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { Loader2, Search, Tv, Film } from "lucide-react";
import { toast } from "sonner";
import { useMediaList } from "@/contexts/MediaListContext";
import type { UnmatchedPlaybackItem } from "@/types/unmatchedPlayback";
import { posterUrl } from "@/lib/tmdb";

type Props = {
  item: UnmatchedPlaybackItem;
  onClose: () => void;
  onLinked: () => void;
};

export function LinkUnmatchedToLibraryModal({ item, onClose, onLinked }: Props) {
  const { list } = useMediaList();
  const [q, setQ] = useState("");
  const [scope, setScope] = useState<"single" | "fingerprint">(
    item.fingerprintAvailable ? "fingerprint" : "single"
  );
  const [linkingId, setLinkingId] = useState<string | null>(null);

  const candidates = useMemo(() => {
    const t = item.mediaKind;
    return list.filter((m) => m.type === t && (!q.trim() || m.title.toLowerCase().includes(q.trim().toLowerCase())));
  }, [list, item.mediaKind, q]);

  const linkTo = async (mediaId: string) => {
    setLinkingId(mediaId);
    try {
      const res = await fetch("/api/plex/playback-events/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: item.representativeEventId,
          mediaId,
          scope: item.fingerprintAvailable ? scope : "single",
        }),
      });
      const data = (await res.json()) as { error?: string; updated?: number };
      if (!res.ok) {
        toast.error(data.error || "Could not link");
        return;
      }
      const n = data.updated ?? 1;
      toast.success(
        n > 1
          ? `Linked ${n} playback events to your library`
          : "Linked to your library — future Plex events for this show should match too."
      );
      onLinked();
      onClose();
    } catch {
      toast.error("Network error");
    } finally {
      setLinkingId(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/75"
      role="dialog"
      aria-modal
      aria-labelledby="link-unmatched-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-shelf-border bg-shelf-card p-5 shadow-xl max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="link-unmatched-title" className="text-lg font-semibold text-white">
          Link to library
        </h2>
        <p className="text-xs text-shelf-muted mt-1 line-clamp-2">
          Plex: <span className="text-white/90">{item.displayTitle}</span>
          {item.mediaKind === "tv" ? " (series)" : " (movie)"}
        </p>
        <p className="text-[11px] text-shelf-muted mt-2">
          Pick the WatchBox title that is the same show or movie. This sets <code className="text-[10px]">mediaId</code>{" "}
          on the webhook row so logs and stats attach correctly.
        </p>

        {item.fingerprintAvailable ? (
          <fieldset className="mt-4 space-y-2">
            <legend className="text-[11px] text-shelf-muted uppercase tracking-wide">Scope</legend>
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="radio"
                name="scope"
                checked={scope === "fingerprint"}
                onChange={() => setScope("fingerprint")}
                className="mt-1"
              />
              <span className="text-sm text-white/90">
                All unmatched events for this Plex {item.mediaKind === "tv" ? "show" : "movie"} (recommended)
              </span>
            </label>
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="radio"
                name="scope"
                checked={scope === "single"}
                onChange={() => setScope("single")}
                className="mt-1"
              />
              <span className="text-sm text-shelf-muted">This playback row only</span>
            </label>
          </fieldset>
        ) : null}

        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-shelf-muted" size={16} />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Filter your library…"
            className="w-full rounded-lg border border-shelf-border bg-shelf-bg px-3 py-2.5 pl-9 text-sm text-white placeholder-shelf-muted"
          />
        </div>

        <ul className="mt-3 overflow-y-auto flex-1 min-h-[120px] max-h-[40vh] space-y-1 pr-1">
          {candidates.length === 0 ? (
            <li className="text-sm text-shelf-muted py-6 text-center">
              No {item.mediaKind === "tv" ? "series" : "movies"} in your library yet.
            </li>
          ) : (
            candidates.map((m) => {
              const busy = linkingId === m.id;
              return (
                <li key={m.id}>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void linkTo(m.id)}
                    className="w-full flex items-center gap-3 rounded-lg border border-shelf-border/80 bg-shelf-bg/50 px-2 py-2 text-left hover:bg-shelf-card disabled:opacity-50"
                  >
                    <div className="relative h-11 w-8 shrink-0 overflow-hidden rounded border border-shelf-border">
                      {m.posterPath ? (
                        <Image src={posterUrl(m.posterPath)!} alt="" fill className="object-cover" sizes="32px" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-shelf-muted">
                          {m.type === "tv" ? <Tv size={16} /> : <Film size={16} />}
                        </div>
                      )}
                    </div>
                    <span className="text-sm text-white truncate flex-1">{m.title}</span>
                    {busy ? <Loader2 size={16} className="animate-spin text-shelf-muted shrink-0" /> : null}
                  </button>
                </li>
              );
            })
          )}
        </ul>

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-2 text-sm text-shelf-muted hover:text-white"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
