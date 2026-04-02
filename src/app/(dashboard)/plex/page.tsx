import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { PlexHubClient } from "@/components/plex/PlexHubClient";

export default function PlexPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-shelf-muted" aria-hidden />
        </div>
      }
    >
      <PlexHubClient />
    </Suspense>
  );
}
