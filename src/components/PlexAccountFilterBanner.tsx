import Link from "next/link";

/** Shown when PLEX_WEBHOOK_ALLOWED_ACCOUNTS is not set — other home users’ plays are stored and visible. */
export function PlexAccountFilterBanner({ className = "" }: { className?: string }) {
  return (
    <div
      className={`rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2.5 text-xs text-amber-100/95 leading-snug ${className}`}
    >
      <strong className="text-amber-50">All Plex accounts</strong> are recorded on this server. To only keep{" "}
      <em>your</em> plays and scrobbles, set{" "}
      <code className="rounded bg-black/30 px-1 py-0.5 text-[10px] font-mono">PLEX_WEBHOOK_ALLOWED_ACCOUNTS</code> to
      your Plex username (e.g. <code className="text-[10px]">carterja11</code>) in the app env and restart. See{" "}
      <Link href="/overview" className="text-amber-200 underline hover:text-white">
        Overview
      </Link>{" "}
      ·{" "}
      <Link href="/plex?tab=activity" className="text-amber-200 underline hover:text-white">
        Plex hub → Activity
      </Link>
      .
    </div>
  );
}
