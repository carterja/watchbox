"use client";

import { useState, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";

const SHORTCUTS = [
  { keys: "/", description: "Focus search (on Discover)" },
  { keys: "Esc", description: "Close modal or overlay" },
  { keys: "?", description: "Show this shortcut list" },
];

export function KeyboardShortcutsOverlay() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;
      if (e.key === "?" && !isInput) {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    },
    []
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={() => setOpen(false)}
      role="dialog"
      aria-label="Keyboard shortcuts"
    >
      <div
        className="rounded-xl border border-shelf-border bg-shelf-sidebar shadow-xl max-w-sm w-full p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-white">Keyboard shortcuts</h3>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="p-1.5 rounded-lg text-shelf-muted hover:bg-shelf-card hover:text-white transition"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
        <ul className="space-y-3 text-sm">
          {SHORTCUTS.map(({ keys, description }) => (
            <li key={keys} className="flex items-center justify-between gap-4">
              <kbd className="rounded bg-shelf-card px-2 py-1 text-xs font-mono text-white border border-shelf-border">
                {keys}
              </kbd>
              <span className="text-shelf-muted">{description}</span>
            </li>
          ))}
        </ul>
        {pathname === "/discover" && (
          <p className="mt-3 text-xs text-shelf-muted">
            Press / to jump to the search box.
          </p>
        )}
      </div>
    </div>
  );
}
