"use client";

import { useState, useRef, useLayoutEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";

type Props = {
  content: string;
  children: ReactNode;
  /** Default "top" shows above; "bottom" shows below (e.g. for controls in top header). */
  placement?: "top" | "bottom";
};

export function Tooltip({ content, children, placement = "top" }: Props) {
  const [show, setShow] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const triggerRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = () => {
    timeoutRef.current = setTimeout(() => setShow(true), 300);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setShow(false);
  };

  useLayoutEffect(() => {
    if (!show || typeof document === "undefined" || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const gap = 8;
    const isBottom = placement === "bottom";
    setCoords({
      top: isBottom ? rect.bottom + gap : rect.top - gap,
      left: rect.left + rect.width / 2,
    });
  }, [show, placement]);

  const isBottom = placement === "bottom";

  const tooltipContent = show && typeof document !== "undefined" && (
    <div
      className="fixed px-2 py-1 bg-shelf-bg border border-shelf-border rounded text-xs text-white whitespace-nowrap pointer-events-none z-[100] shadow-lg -translate-x-1/2"
      style={{
        left: coords.left,
        ...(isBottom ? { top: coords.top } : { bottom: window.innerHeight - coords.top }),
      }}
    >
      {content}
      <div
        className={`absolute left-1/2 -translate-x-1/2 border-4 border-transparent ${
          isBottom ? "bottom-full border-b-shelf-border" : "top-full -mt-px border-t-shelf-border"
        }`}
      />
    </div>
  );

  return (
    <>
      <div
        ref={triggerRef}
        className="inline-flex"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {children}
      </div>
      {typeof document !== "undefined" && tooltipContent && createPortal(tooltipContent, document.body)}
    </>
  );
}
