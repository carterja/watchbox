import { Sidebar } from "@/components/Sidebar";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { KeyboardShortcutsOverlay } from "@/components/KeyboardShortcutsOverlay";
import { BlurOverlay } from "@/components/BlurOverlay";
import { MobileFiltersProvider } from "@/contexts/MobileFiltersContext";
import { OverlayProvider } from "@/contexts/OverlayContext";
import { MediaListProvider } from "@/contexts/MediaListContext";
import { DisplayModeProvider } from "@/contexts/DisplayModeContext";
import { ReorderModeProvider } from "@/contexts/ReorderModeContext";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <OverlayProvider>
      <MobileFiltersProvider>
        <MediaListProvider>
          <DisplayModeProvider>
            <ReorderModeProvider>
              <div className="min-h-screen bg-shelf-bg">
                <Sidebar />
                <main className="min-h-screen pt-14 pb-20 md:pt-0 md:pb-0 md:pl-56">
                  <ErrorBoundary>
                    {children}
                  </ErrorBoundary>
                </main>
                <BlurOverlay />
                <div id="drawer-portal" className="fixed inset-x-0 top-14 bottom-0 z-50 pointer-events-none md:pointer-events-auto" aria-hidden />
                <KeyboardShortcutsOverlay />
              </div>
            </ReorderModeProvider>
          </DisplayModeProvider>
        </MediaListProvider>
      </MobileFiltersProvider>
    </OverlayProvider>
  );
}
