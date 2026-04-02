"use client";

import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { DiscoverPageContent } from "./DiscoverPageContent";

export default function DiscoverPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center px-4">
          <Loader2 className="h-8 w-8 animate-spin text-shelf-muted" aria-label="Loading" />
        </div>
      }
    >
      <DiscoverPageContent />
    </Suspense>
  );
}
