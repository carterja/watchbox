import { Sidebar } from "@/components/Sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-shelf-bg">
      <Sidebar />
      <main className="pl-56 min-h-screen">
        {children}
      </main>
    </div>
  );
}
