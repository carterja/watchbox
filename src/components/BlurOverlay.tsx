"use client";

import { useEffect, useState } from "react";
import { useOverlay } from "@/contexts/OverlayContext";

const OVERLAY_Z = 40;

/**
 * Shared full-screen blur overlay. Shown when drawer or a modal is open.
 * Renders behind drawer/modal content (z-40). Click or Escape closes via context.
 */
export function BlurOverlay() {
  const { isOpen, handleBackdropClick } = useOverlay();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const t = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(t);
    }
    setVisible(false);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      role="presentation"
      aria-hidden
      className={`fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-200 ease-out md:hidden ${
        visible ? "opacity-100" : "opacity-0"
      }`}
      style={{ zIndex: OVERLAY_Z }}
      onClick={handleBackdropClick}
    />
  );
}
