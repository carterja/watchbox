import { Sidebar } from "@/components/Sidebar";
import { MobileFiltersOverlay } from "@/components/MobileFiltersOverlay";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { KeyboardShortcutsOverlay } from "@/components/KeyboardShortcutsOverlay";
import { MobileFiltersProvider } from "@/contexts/MobileFiltersContext";
import { MediaListProvider } from "@/contexts/MediaListContext";
import { DisplayModeProvider } from "@/contexts/DisplayModeContext";
import { ReorderModeProvider } from "@/contexts/ReorderModeContext";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <MobileFiltersProvider>
      <MediaListProvider>
      <DisplayModeProvider>
      <ReorderModeProvider>
      <div className="min-h-screen bg-shelf-bg">
        <Sidebar />
        <MobileFiltersOverlay />
        {/* Desktop: left padding for sidebar, Mobile: top/bottom padding for header/nav */}
        <main className="min-h-screen pt-14 pb-20 md:pt-0 md:pb-0 md:pl-56">
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </main>
        <KeyboardShortcutsOverlay />
      </div>
      </ReorderModeProvider>
      </DisplayModeProvider>
      </MediaListProvider>
    </MobileFiltersProvider>
  );
}
