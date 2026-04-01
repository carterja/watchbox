"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Film, Settings, Tv, X } from "lucide-react";
import { PlexMarkIcon } from "@/components/icons/PlexMarkIcon";

const MORE_LINKS = [
  { href: "/movies", label: "Movies", icon: Film, description: "Movies in your library" },
  { href: "/series", label: "Series", icon: Tv, description: "TV in your library" },
  { href: "/settings", label: "Settings", icon: Settings, description: "Theme, Plex, data" },
  { href: "/plex", label: "Plex sync", description: "On Deck & webhooks", plexIcon: true as const },
] as const;

type Props = {
  open: boolean;
  onClose: () => void;
};

/**
 * Slide-up sheet for secondary routes on mobile (Movies, Series, Settings, Plex)
 * so the bottom tab bar stays at five tappable items.
 */
export function MobileMoreSheet({ open, onClose }: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!mounted || !open) return null;

  return createPortal(
    <div
      id="mobile-more-sheet"
      className="md:hidden fixed inset-0 z-[100] flex flex-col justify-end"
      role="dialog"
      aria-modal
      aria-label="More navigation"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
        aria-label="Close menu"
        onClick={onClose}
      />
      <div className="relative rounded-t-2xl border border-shelf-border border-b-0 bg-shelf-sidebar shadow-2xl safe-area-pb">
        <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-shelf-border/80">
          <p className="text-sm font-semibold text-white">More</p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-shelf-muted hover:bg-shelf-card hover:text-white"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>
        <nav className="p-3 grid grid-cols-1 gap-1.5 max-h-[min(60vh,420px)] overflow-y-auto">
          {MORE_LINKS.map((item) => {
            const Icon = "plexIcon" in item ? null : item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={true}
                onClick={onClose}
                className="flex items-center gap-3 rounded-xl border border-transparent px-3 py-3 text-left transition hover:bg-shelf-card hover:border-shelf-border active:scale-[0.99]"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-shelf-card border border-shelf-border">
                  {Icon ? (
                    <Icon size={20} className="text-[#8b5cf6]" />
                  ) : (
                    <PlexMarkIcon className="text-cyan-400" size={20} />
                  )}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-white">{item.label}</span>
                  <span className="block text-xs text-shelf-muted">{item.description}</span>
                </span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>,
    document.body
  );
}
