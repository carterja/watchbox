"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useMobileFilters } from "@/contexts/MobileFiltersContext";
import { useOverlay } from "@/contexts/OverlayContext";

const SLIDE_DURATION_MS = 280;

/**
 * On desktop (md+): renders filter/section content in flow.
 * On mobile: when burger is open, shows shared blur overlay and portaled drawer
 * that slides down from below the header, with the same content.
 */
export function MobileFiltersPanel({ children }: { children: React.ReactNode }) {
  const { open, close } = useMobileFilters();
  const { showOverlay, hideOverlay } = useOverlay();
  const [mounted, setMounted] = useState(false);
  const [animatingIn, setAnimatingIn] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Sync overlay with drawer open state (e.g. close on scroll)
  useEffect(() => {
    if (!open) hideOverlay();
  }, [open, hideOverlay]);

  // When opening on mobile, show overlay and start slide-in
  useEffect(() => {
    if (open) {
      showOverlay(close);
      const t = requestAnimationFrame(() => setAnimatingIn(true));
      return () => cancelAnimationFrame(t);
    }
    setAnimatingIn(false);
  }, [open, showOverlay, close]);

  const drawerPortalTarget = mounted ? document.getElementById("drawer-portal") : null;

  const drawerContent = (
    <div
      className="pointer-events-auto flex flex-col bg-shelf-sidebar border-b border-shelf-border shadow-xl md:hidden"
      style={{
        maxHeight: "70vh",
        transition: `transform ${SLIDE_DURATION_MS}ms cubic-bezier(0.32, 0.72, 0, 1)`,
        transform: animatingIn ? "translateY(0)" : "translateY(-100%)",
      }}
    >
      <div className="overflow-y-auto overflow-x-auto flex-1 min-h-0">
        {children}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop: always visible in flow */}
      <div className="hidden md:block">
        {children}
      </div>

      {/* Mobile: when open, render into drawer portal with slide-down animation */}
      {mounted &&
        drawerPortalTarget &&
        open &&
        createPortal(
          drawerContent,
          drawerPortalTarget
        )}
    </>
  );
}
