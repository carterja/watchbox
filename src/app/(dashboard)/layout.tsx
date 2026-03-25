import { Sidebar } from "@/components/Sidebar";
import { DashboardMain } from "@/components/DashboardMain";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { KeyboardShortcutsOverlay } from "@/components/KeyboardShortcutsOverlay";
import { BlurOverlay } from "@/components/BlurOverlay";
import { MobileFiltersProvider } from "@/contexts/MobileFiltersContext";
import { OverlayProvider } from "@/contexts/OverlayContext";
import { MediaListProvider } from "@/contexts/MediaListContext";
import { WhatNextCacheProvider } from "@/contexts/WhatNextCacheContext";
import { DisplayModeProvider } from "@/contexts/DisplayModeContext";
import { ReorderModeProvider } from "@/contexts/ReorderModeContext";
import { SidebarCollapseProvider } from "@/contexts/SidebarCollapseContext";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <OverlayProvider>
      <MobileFiltersProvider>
        <MediaListProvider>
          <WhatNextCacheProvider>
            <DisplayModeProvider>
              <ReorderModeProvider>
                <SidebarCollapseProvider>
                  <div className="min-h-screen bg-shelf-bg">
                    <Sidebar />
                    <DashboardMain>
                      <ErrorBoundary>{children}</ErrorBoundary>
                    </DashboardMain>
                    <BlurOverlay />
                    <div
                      id="drawer-portal"
                      className="fixed inset-x-0 top-14 bottom-0 z-50 pointer-events-none"
                      aria-hidden
                    />
                    <KeyboardShortcutsOverlay />
                  </div>
                </SidebarCollapseProvider>
              </ReorderModeProvider>
            </DisplayModeProvider>
          </WhatNextCacheProvider>
        </MediaListProvider>
      </MobileFiltersProvider>
    </OverlayProvider>
  );
}
