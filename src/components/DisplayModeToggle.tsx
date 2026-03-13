"use client";

import { List, LayoutGrid, ImageIcon } from "lucide-react";
import { useDisplayMode, type DisplayMode } from "@/contexts/DisplayModeContext";
import { Tooltip } from "./Tooltip";

// Order: Compact (list) → Mid → Poster (large), left to right
const MODES: { mode: DisplayMode; label: string; Icon: typeof List }[] = [
  { mode: "compact", label: "Compact", Icon: List },
  { mode: "mid", label: "Mid", Icon: LayoutGrid },
  { mode: "poster", label: "Poster", Icon: ImageIcon },
];

export function DisplayModeToggle() {
  const { displayMode, setDisplayMode } = useDisplayMode();

  return (
    <div className="flex items-center rounded-lg border border-shelf-border bg-shelf-card/50 p-0.5">
      {MODES.map(({ mode, label, Icon }) => {
        const isActive = displayMode === mode;
        return (
          <Tooltip key={mode} content={label} placement="bottom">
            <button
              type="button"
              onClick={() => setDisplayMode(mode)}
              className={`flex items-center justify-center rounded-md p-1.5 transition ${
                isActive
                  ? "bg-shelf-accent text-white"
                  : "text-shelf-muted hover:bg-shelf-card hover:text-white"
              }`}
              aria-label={`${label} display`}
              aria-pressed={isActive}
            >
              <Icon size={18} />
            </button>
          </Tooltip>
        );
      })}
    </div>
  );
}
