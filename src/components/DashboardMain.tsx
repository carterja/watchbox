"use client";

import type { ReactNode } from "react";
import { useSidebarCollapse } from "@/contexts/SidebarCollapseContext";

export function DashboardMain({ children }: { children: ReactNode }) {
  const { mainPaddingClass } = useSidebarCollapse();
  return (
    <main
      className={`min-h-screen pt-14 pb-20 md:pt-0 md:pb-0 transition-[padding] duration-200 ease-out ${mainPaddingClass}`}
    >
      {children}
    </main>
  );
}
