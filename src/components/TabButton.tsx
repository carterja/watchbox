"use client";

import { memo, type ButtonHTMLAttributes } from "react";

type TabButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean;
  variant?: "tab" | "category";
  /** Use "sm" for compact tabs (e.g. mobile filter bar). */
  size?: "sm" | "md";
};

function TabButtonComponent({
  active = false,
  variant = "tab",
  size = "md",
  className = "",
  children,
  ...props
}: TabButtonProps) {
  const sizeClasses =
    size === "sm"
      ? "rounded-md px-2 py-1 text-xs font-medium"
      : "rounded-lg px-4 py-2 text-sm font-medium";
  const baseClasses = `${sizeClasses} transition cursor-pointer`;
  const activeClasses = active
    ? "bg-shelf-accent text-white"
    : "text-shelf-muted hover:bg-shelf-card hover:text-white";

  return (
    <button
      type="button"
      className={`${baseClasses} ${activeClasses} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export const TabButton = memo(TabButtonComponent);
