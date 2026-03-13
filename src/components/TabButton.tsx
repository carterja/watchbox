"use client";

import { memo, type ButtonHTMLAttributes } from "react";

type TabButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean;
  variant?: "tab" | "category";
};

function TabButtonComponent({ 
  active = false, 
  variant = "tab",
  className = "", 
  children, 
  ...props 
}: TabButtonProps) {
  const baseClasses = "rounded-lg px-4 py-2 text-sm font-medium transition cursor-pointer";
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
