import Image from "next/image";
import Link from "next/link";
import { Calendar, CheckCircle2, ExternalLink, Tv } from "lucide-react";
import type { WhatNextRow } from "@/lib/whatNext";
import { posterUrl } from "@/lib/tmdb";

export function WhatNextQueueRow({ row }: { row: WhatNextRow }) {
  const href = `/series?open=${encodeURIComponent(row.mediaId)}`;
  const next = row.next;

  return (
    <li>
      <Link
        href={href}
        prefetch={true}
        className="flex gap-3 rounded-xl border border-shelf-border bg-shelf-card/40 p-3 transition hover:border-shelf-accent/40 hover:bg-shelf-card/60"
      >
        <div className="relative h-[72px] w-[48px] shrink-0 overflow-hidden rounded-lg border border-shelf-border bg-shelf-card">
          {row.posterPath ? (
            <Image
              src={posterUrl(row.posterPath)!}
              alt=""
              fill
              className="object-cover"
              sizes="48px"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-shelf-muted">
              <Tv size={22} />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-white truncate">{row.title}</p>
          {row.caughtUp ? (
            <p className="text-xs text-emerald-300/90 flex items-center gap-1 mt-0.5">
              <CheckCircle2 size={14} /> Caught up (or awaiting next season)
            </p>
          ) : next ? (
            <p className="text-sm text-cyan-200/90 mt-0.5">
              Next: S{next.season} E{next.episode}
              {next.name ? ` · ${next.name}` : ""}
            </p>
          ) : (
            <p className="text-xs text-shelf-muted mt-0.5">Set progress to see what&apos;s next</p>
          )}
          {next?.airDate && (
            <p className="text-[11px] text-shelf-muted mt-1 flex items-center gap-1">
              <Calendar size={12} className="shrink-0" />
              Air {next.airDate}
            </p>
          )}
        </div>
        <span className="self-center shrink-0 inline-flex items-center gap-1 rounded-lg border border-shelf-border px-2.5 py-1.5 text-xs text-shelf-accent">
          Manage
          <ExternalLink size={12} />
        </span>
      </Link>
    </li>
  );
}
