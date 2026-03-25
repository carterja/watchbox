"use client";

import { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { useMobileFilters } from "@/contexts/MobileFiltersContext";
import { useOverlay } from "@/contexts/OverlayContext";
import { useIsMobileViewport } from "@/hooks/useIsMobileViewport";

const SLIDE_DURATION_MS = 280;

/**
 * On desktop (md+): renders filter/section content in flow.
 * On mobile: when burger is open, shows shared blur overlay and portaled drawer
 * that slides down from below the header; on close it slides up smoothly.
 */
export function MobileFiltersPanel({ children }: { children: React.ReactNode }) {
  const { open, close } = useMobileFilters();
  const { showOverlay, hideOverlay } = useOverlay();
  const isMobileViewport = useIsMobileViewport();
  const [mounted, setMounted] = useState(false);
  const [animatingIn, setAnimatingIn] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const startClosing = useCallback(() => {
    setIsClosing(true);
  }, []);

  // Sync overlay only on mobile (drawer + blur are md:hidden on larger screens).
  useEffect(() => {
    if (!open) {
      hideOverlay();
      setIsClosing(false);
      setAnimatingIn(false);
      return;
    }
    if (!isMobileViewport) {
      hideOverlay();
      setIsClosing(false);
      setAnimatingIn(false);
      return;
    }
    showOverlay(startClosing);
    const t = requestAnimationFrame(() => setAnimatingIn(true));
    return () => cancelAnimationFrame(t);
  }, [open, isMobileViewport, hideOverlay, showOverlay, startClosing]);

  const handleTransitionEnd = useCallback(
    (e: React.TransitionEvent<HTMLDivElement>) => {
      if (e.propertyName !== "transform" || !isClosing) return;
      close();
    },
    [isClosing, close]
  );

  const drawerPortalTarget = mounted ? document.getElementById("drawer-portal") : null;

  const drawerContent = (
    <div
      className="pointer-events-auto flex flex-col bg-shelf-sidebar border-b border-shelf-border shadow-xl md:hidden"
      style={{
        maxHeight: "70vh",
        transition: `transform ${SLIDE_DURATION_MS}ms cubic-bezier(0.32, 0.72, 0, 1)`,
        transform: isClosing || !animatingIn ? "translateY(-100%)" : "translateY(0)",
      }}
      onTransitionEnd={handleTransitionEnd}
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

      {/* Mobile: when open (or closing), render into drawer portal with slide animation */}
      {mounted &&
        drawerPortalTarget &&
        open &&
        isMobileViewport &&
        createPortal(
          drawerContent,
          drawerPortalTarget
        )}
    </>
  );
}
