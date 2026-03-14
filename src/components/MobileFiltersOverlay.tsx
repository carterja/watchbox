"use client";

import { useMobileFilters } from "@/contexts/MobileFiltersContext";

/**
 * Invisible overlay shown on mobile when the filter panel is open.
 * Covers the content below the header; clicking it closes the panel.
 * z-10 so it sits below the panel (z-20) and header (z-30).
 */
export function MobileFiltersOverlay() {
  const { open, close } = useMobileFilters();

  if (!open) return null;

  return (
    <button
      type="button"
      onClick={close}
      className="fixed inset-0 top-14 left-0 right-0 bottom-0 z-10 md:hidden cursor-default"
      aria-label="Close filters"
      tabIndex={-1}
    />
  );
}
