"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from "react";

type OverlayContextValue = {
  /** Show the shared blur overlay; when user clicks it or presses Escape, onClose is called. */
  showOverlay: (onClose: () => void) => void;
  hideOverlay: () => void;
  /** Call from overlay or modal backdrop onClick; ignores the first click after opening (avoids open-tap closing). */
  handleBackdropClick: () => void;
  isOpen: boolean;
};

const OverlayContext = createContext<OverlayContextValue | null>(null);

export function OverlayProvider({ children }: { children: ReactNode }) {
  const [onClose, setOnClose] = useState<(() => void) | null>(null);
  const isOpen = onClose !== null;
  const ignoreNextBackdropClickRef = useRef(false);

  const showOverlay = useCallback((closeCb: () => void) => {
    ignoreNextBackdropClickRef.current = true;
    setOnClose(() => closeCb);
  }, []);

  const hideOverlay = useCallback(() => {
    if (onClose) {
      onClose();
      setOnClose(null);
    }
  }, [onClose]);

  const handleBackdropClick = useCallback(() => {
    if (ignoreNextBackdropClickRef.current) {
      ignoreNextBackdropClickRef.current = false;
      return;
    }
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

  return (
    <OverlayContext.Provider
      value={{ showOverlay, hideOverlay, handleBackdropClick, isOpen }}
    >
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
