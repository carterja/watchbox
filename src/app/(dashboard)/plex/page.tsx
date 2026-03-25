"use client";

import { PlexIntegrationPanel } from "@/components/PlexIntegrationPanel";

export default function PlexPage() {
  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-4xl px-3 pt-2 pb-6 sm:px-4 md:p-6">
        <div className="overflow-hidden rounded-xl border border-shelf-border bg-shelf-bg/40 sm:rounded-2xl">
          <PlexIntegrationPanel />
        </div>
      </div>
    </div>
  );
}
