"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import type { Media, SeasonProgressItem, SeasonStatus } from "@/types/media";

type Props = {
  media: Media;
  onClose: () => void;
  onSave: (totalSeasons: number, seasonProgress: SeasonProgressItem[]) => void;
};

const STATUSES: SeasonStatus[] = ["not_started", "in_progress", "completed"];

function statusLabel(s: SeasonStatus): string {
  if (s === "not_started") return "Not started";
  if (s === "in_progress") return "In progress";
  return "Completed";
}

function nextStatus(s: SeasonStatus): SeasonStatus {
  if (s === "not_started") return "in_progress";
  if (s === "in_progress") return "completed";
  return "not_started";
}

export function SeasonProgressEditor({ media, onClose, onSave }: Props) {
  const total = media.totalSeasons ?? 1;
  const existing = media.seasonProgress ?? [];

  const [totalSeasons, setTotalSeasons] = useState(Math.max(1, total));
  const [seasons, setSeasons] = useState<SeasonProgressItem[]>(() => {
    const map = new Map(existing.map((s) => [s.season, s.status]));
    return Array.from({ length: Math.max(totalSeasons, 1) }, (_, i) => ({
      season: i + 1,
      status: (map.get(i + 1) ?? "not_started") as SeasonStatus,
    }));
  });

  useEffect(() => {
    setSeasons((prev) => {
      const next: SeasonProgressItem[] = [];
      for (let i = 0; i < totalSeasons; i++) {
        const s = i + 1;
        const existingItem = prev.find((p) => p.season === s);
        next.push({
          season: s,
          status: (existingItem?.status ?? "not_started") as SeasonStatus,
        });
      }
      return next;
    });
  }, [totalSeasons]);

  const cycleSeason = (season: number) => {
    setSeasons((prev) =>
      prev.map((s) =>
        s.season === season ? { ...s, status: nextStatus(s.status as SeasonStatus) } : s
      )
    );
  };

  const handleSave = () => {
    onSave(totalSeasons, seasons);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-shelf-border bg-shelf-card shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-shelf-border">
          <h2 className="text-lg font-semibold text-white">Season progress — {media.title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-shelf-muted hover:bg-shelf-border hover:text-white"
          >
            <X size={20} />
          </button>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <label htmlFor="total-seasons-input" className="block text-sm font-medium text-shelf-muted mb-2">
              Total seasons
            </label>
            <input
              id="total-seasons-input"
              type="number"
              min={1}
              max={50}
              value={totalSeasons}
              onChange={(e) => setTotalSeasons(Math.max(1, parseInt(e.target.value, 10) || 1))}
              className="w-full rounded-lg border border-shelf-border bg-shelf-bg px-3 py-2 text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-shelf-muted mb-2">
              Per season
            </label>
            <p className="text-xs text-shelf-muted mb-2">
              Click a season to cycle: Not started → In progress → Completed
            </p>
            <div className="flex flex-wrap gap-2">
              {seasons.map((s) => (
                <button
                  key={s.season}
                  type="button"
                  onClick={() => cycleSeason(s.season)}
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                    s.status === "completed"
                      ? "bg-green-600/80 text-white"
                      : s.status === "in_progress"
                        ? "bg-shelf-accent text-white"
                        : "bg-shelf-border text-shelf-muted hover:bg-shelf-border/80 hover:text-white"
                  }`}
                  title={statusLabel(s.status as SeasonStatus)}
                >
                  S{s.season} {s.status === "completed" ? "✓" : s.status === "in_progress" ? "●" : "○"}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 p-4 border-t border-shelf-border">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-shelf-muted hover:text-white"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="rounded-lg bg-shelf-accent px-4 py-2 text-white font-medium hover:bg-shelf-accent-hover"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
