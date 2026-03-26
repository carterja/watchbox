"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";

type OverlayContextValue = {
  /** Show the shared blur overlay; when user clicks it or presses Escape, onClose is called. */
  showOverlay: (onClose: () => void) => void;
  hideOverlay: () => void;
  /** Call from overlay onClick to close (runs registered onClose). */
  handleBackdropClick: () => void;
  isOpen: boolean;
};

const OverlayContext = createContext<OverlayContextValue | null>(null);

export function OverlayProvider({ children }: { children: ReactNode }) {
  const [onClose, setOnClose] = useState<(() => void) | null>(null);
  const isOpen = onClose !== null;

  const showOverlay = useCallback((closeCb: () => void) => {
    setOnClose(() => closeCb);
  }, []);

  const hideOverlay = useCallback(() => {
    if (onClose) {
      onClose();
      setOnClose(null);
    }
  }, [onClose]);

  const handleBackdropClick = useCallback(() => {
    hideOverlay();
  }, [hideOverlay]);

  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") hideOverlay();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, hideOverlay]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const value = useMemo(
    () => ({ showOverlay, hideOverlay, handleBackdropClick, isOpen }),
    [showOverlay, hideOverlay, handleBackdropClick, isOpen]
  );

  return (
    <OverlayContext.Provider value={value}>
      {children}
    </OverlayContext.Provider>
  );
}

export function useOverlay(): OverlayContextValue {
  const ctx = useContext(OverlayContext);
  if (!ctx) {
    return {
      showOverlay: () => {},
      hideOverlay: () => {},
      handleBackdropClick: () => {},
      isOpen: false,
    };
  }
  return ctx;
}
