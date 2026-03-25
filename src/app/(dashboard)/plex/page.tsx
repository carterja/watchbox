"use client";

import { PlexIntegrationPanel } from "@/components/PlexIntegrationPanel";

export default function PlexPage() {
  return (
    <div className="min-h-screen">
      <div className="p-4 md:p-6 max-w-4xl mx-auto">
        <div className="rounded-2xl border border-shelf-border bg-shelf-bg/40 overflow-hidden">
          <PlexIntegrationPanel />
        </div>
      </div>
    </div>
  );
}
