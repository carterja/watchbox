"use client";

import { useState, useRef, type ReactNode } from "react";

type Props = {
  content: string;
  children: ReactNode;
};

export function Tooltip({ content, children }: Props) {
  const [show, setShow] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const handleMouseEnter = () => {
    timeoutRef.current = setTimeout(() => setShow(true), 300);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setShow(false);
  };

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      {show && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-shelf-bg border border-shelf-border rounded text-xs text-white whitespace-nowrap pointer-events-none z-50 shadow-lg">
          {content}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-4 border-transparent border-t-shelf-border" />
        </div>
      )}
    </div>
  );
}
