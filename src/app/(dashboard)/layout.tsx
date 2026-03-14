import { Sidebar } from "@/components/Sidebar";
import { MobileFiltersProvider } from "@/contexts/MobileFiltersContext";
import { MobileFiltersOverlay } from "@/components/MobileFiltersOverlay";
import { DisplayModeProvider } from "@/contexts/DisplayModeContext";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <MobileFiltersProvider>
      <DisplayModeProvider>
      <div className="min-h-screen bg-shelf-bg">
        <Sidebar />
        <MobileFiltersOverlay />
        {/* Desktop: left padding for sidebar, Mobile: top/bottom padding for header/nav */}
        <main className="min-h-screen pt-14 pb-20 md:pt-0 md:pb-0 md:pl-56">
          {children}
        </main>
      </div>
      </DisplayModeProvider>
    </MobileFiltersProvider>
  );
}
