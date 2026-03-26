"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  Loader2,
  MapPin,
  Tv,
} from "lucide-react";
import { StreamingIcon } from "@/components/StreamingIcon";
import type { Swiper as SwiperType } from "swiper";
import { EffectCoverflow, Pagination } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";
import type { WhatNextRow } from "@/lib/whatNext";
import { posterUrl } from "@/lib/tmdb";
import type { Media } from "@/types/media";

function formatAirDate(iso: string | null): string | null {
  if (!iso) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso.trim());
  if (!m) return iso;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { dateStyle: "medium" });
}

/** Completed seasons vs total (from Series season checklist). No bar if data is missing. */
function seasonChecklistProgress(media: Media | null): {
  pct: number;
  completed: number;
  total: number;
} | null {
  if (!media || media.type !== "tv") return null;
  const total = media.totalSeasons;
  const sp = media.seasonProgress;
  if (total == null || total < 1 || !sp?.length) return null;
  const completed = sp.filter((s) => s.status === "completed").length;
  const pct = Math.min(100, Math.round((completed / total) * 100));
  return { pct, completed, total };
}

import "swiper/css";
import "swiper/css/effect-coverflow";
import "swiper/css/pagination";

const SWIPER_MODULES = [EffectCoverflow, Pagination];
const SWIPER_PAGINATION = { clickable: true, dynamicBullets: true } as const;
const COVERFLOW_EFFECT = {
  rotate: 32,
  stretch: 0,
  depth: 160,
  modifier: 1,
  slideShadows: true,
} as const;

type Props = {
  rows: WhatNextRow[];
  marking: string | null;
  onMarkWatched: (mediaId: string) => void;
  onOpenSetPosition: (row: WhatNextRow) => void;
  /** Library streaming label for badge (optional). */
  resolveStreaming?: (mediaId: string) => string | null;
  /** For status-style hero badge (e.g. S4 ongoing). */
  resolveMedia?: (mediaId: string) => Media | null;
};

export function WatchingNextCarousel({
  rows,
  marking,
  onMarkWatched,
  onOpenSetPosition,
  resolveStreaming,
  resolveMedia,
}: Props) {
  const swiperRef = useRef<SwiperType | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const useCoverflow = rows.length >= 3;

  const rowsKey = rows.map((r) => r.mediaId).join("|");

  useEffect(() => {
    setActiveIndex(0);
    swiperRef.current?.slideTo(0, 0);
  }, [rowsKey]);

  const clampedIndex = Math.min(activeIndex, Math.max(0, rows.length - 1));
  const activeRow = rows[clampedIndex] ?? null;
  const activeStream =
    activeRow && resolveStreaming ? resolveStreaming(activeRow.mediaId) : null;
  const detailPosterSrc =
    activeRow?.posterPath != null ? posterUrl(activeRow.posterPath, "w342") : null;
  const episodeStillSrc =
    activeRow?.next?.stillPath != null ? posterUrl(activeRow.next.stillPath, "w500") : null;
  const primaryVisualSrc = episodeStillSrc ?? detailPosterSrc;
  const nextAirLabel = activeRow?.next?.airDate != null ? formatAirDate(activeRow.next.airDate) : null;
  const activeMedia = activeRow && resolveMedia ? resolveMedia(activeRow.mediaId) : null;
  const checklistProgress = seasonChecklistProgress(activeMedia);

  const onSlideChange = useCallback((swiper: SwiperType) => {
    setActiveIndex(swiper.realIndex);
  }, []);

  const handleSwiper = useCallback((s: SwiperType) => {
    swiperRef.current = s;
  }, []);

  const coverflowEffect = useMemo(
    () => (useCoverflow ? COVERFLOW_EFFECT : undefined),
    [useCoverflow]
  );

  if (rows.length === 0) return null;

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="relative -mx-4 px-4 md:mx-0 md:px-0">
        <div
          className="pointer-events-none absolute inset-x-0 -top-px h-32 bg-gradient-to-b from-[#8b5cf6]/[0.07] to-transparent rounded-t-[2rem]"
          aria-hidden
        />
        <Swiper
          key={rowsKey}
          modules={SWIPER_MODULES}
          effect={useCoverflow ? "coverflow" : "slide"}
          grabCursor
          centeredSlides
          slidesPerView="auto"
          spaceBetween={useCoverflow ? 0 : 18}
          slideToClickedSlide
          pagination={SWIPER_PAGINATION}
          onSwiper={handleSwiper}
          onSlideChange={onSlideChange}
          coverflowEffect={coverflowEffect}
          className="watching-swiper !pb-9 !pt-1 md:!pb-12 md:!pt-2"
        >
          {rows.map((row, index) => {
            const src = row.posterPath ? posterUrl(row.posterPath, "w342") : null;
            const isActive = index === clampedIndex;
            return (
              <SwiperSlide
                key={row.mediaId}
                className="!w-[min(56vw,168px)] sm:!w-[188px] md:!w-[220px]"
              >
                <button
                  type="button"
                  onClick={() => {
                    swiperRef.current?.slideTo(index);
                    setActiveIndex(index);
                  }}
                  className="group relative block w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8b5cf6] focus-visible:ring-offset-2 focus-visible:ring-offset-shelf-bg rounded-2xl"
                >
                  <motion.div
                    animate={{
                      scale: isActive ? 1 : 0.92,
                      opacity: isActive ? 1 : 0.55,
                    }}
                    transition={{ type: "spring", stiffness: 380, damping: 28 }}
                    className="relative aspect-[2/3] overflow-hidden rounded-2xl border border-shelf-border bg-shelf-card shadow-xl shadow-black/40"
                  >
                    {isActive && (
                      <motion.span
                        layoutId="watching-active-ring"
                        className="pointer-events-none absolute inset-0 z-10 rounded-2xl ring-2 ring-[#8b5cf6] ring-offset-2 ring-offset-shelf-bg"
                        transition={{ type: "spring", stiffness: 400, damping: 35 }}
                      />
                    )}
                    {src ? (
                      <Image
                        src={src}
                        alt={row.title}
                        fill
                        className="object-cover transition duration-300 group-hover:scale-[1.03]"
                        sizes="(max-width: 768px) 56vw, 188px"
                        priority={index === 0}
                      />
                    ) : (
                      <div className="flex h-full flex-col items-center justify-center gap-2 p-3 text-center">
                        <Tv className="text-shelf-muted" size={40} />
                        <p className="text-xs font-medium leading-snug text-white/90 line-clamp-4">{row.title}</p>
                      </div>
                    )}
                  </motion.div>
                </button>
              </SwiperSlide>
            );
          })}
        </Swiper>
      </div>

      <AnimatePresence mode="wait">
        {activeRow && (
          <motion.div
            key={activeRow.mediaId}
            initial={{ opacity: 0, y: 20, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.99 }}
            transition={{ type: "spring", stiffness: 420, damping: 34 }}
            className="relative mx-auto max-w-3xl overflow-hidden rounded-2xl border border-white/[0.08] bg-[#121218] shadow-[0_24px_48px_-12px_rgba(0,0,0,0.55)] ring-1 ring-white/[0.04]"
          >
            <div
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_55%_at_100%_0%,rgba(139,92,246,0.14),transparent_55%)]"
              aria-hidden
            />

            {/* Hero (reference: full-width still/poster, badge, title on gradient) */}
            <div className="relative aspect-[16/9] w-full max-h-[min(52vw,280px)] sm:max-h-[320px] sm:aspect-[2.1/1]">
              {primaryVisualSrc ? (
                <Image
                  src={primaryVisualSrc}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 720px"
                />
              ) : (
                <div className="flex h-full items-center justify-center bg-shelf-border text-shelf-muted/80">
                  <Tv size={40} strokeWidth={1.25} />
                </div>
              )}
              {activeRow.next && (
                <div className="absolute left-3 top-3">
                  <span className="inline-flex rounded-full bg-fuchsia-400 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-black shadow-lg">
                    {activeMedia?.status === "finished"
                      ? `S${activeRow.next.season} complete`
                      : `S${activeRow.next.season} ongoing`}
                  </span>
                </div>
              )}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/75 to-transparent px-4 pb-4 pt-20 sm:pt-24 sm:pb-5">
                <h2 className="text-xl font-bold leading-tight tracking-tight text-white drop-shadow-md sm:text-2xl md:text-3xl">
                  {activeRow.title}
                </h2>
              </div>
            </div>

            <div className="relative space-y-4 p-4 sm:p-5 md:p-6">
              <div className="flex flex-wrap items-center gap-2">
                {activeStream ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] font-medium text-shelf-muted">
                    <StreamingIcon service={activeStream} className="h-3.5 w-3.5 rounded-[2px]" />
                    {activeStream}
                  </span>
                ) : null}
                {activeRow.lastFinished && (
                  <p className="text-[11px] text-shelf-muted/90">
                    Last finished{" "}
                    <span className="tabular-nums text-shelf-muted">
                      S{activeRow.lastFinished.season}E{activeRow.lastFinished.episode}
                    </span>
                  </p>
                )}
              </div>

              {activeRow.next && (
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-shelf-muted">
                  {nextAirLabel && (
                    <span className="inline-flex items-center gap-1.5">
                      <Calendar size={14} className="shrink-0 text-shelf-muted/70" aria-hidden />
                      <span className="text-white/85">{nextAirLabel}</span>
                    </span>
                  )}
                  {activeRow.next.runtimeMinutes != null && (
                    <span className="inline-flex items-center gap-1.5">
                      <Clock size={14} className="shrink-0 text-shelf-muted/70" aria-hidden />
                      <span className="tabular-nums text-white/85">{activeRow.next.runtimeMinutes} min</span>
                    </span>
                  )}
                </div>
              )}

              {activeRow.caughtUp && !activeRow.next ? (
                <div className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200/95">
                  <CheckCircle2 size={17} className="shrink-0 text-emerald-400/90" />
                  Caught up with aired episodes
                </div>
              ) : activeRow.next ? (
                <div className="rounded-2xl border border-white/[0.08] bg-shelf-card/80 p-4 shadow-inner">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#a78bfa]">
                      Next episode
                    </p>
                    <p className="shrink-0 text-xs tabular-nums text-shelf-muted">
                      S{activeRow.next.season} · E{activeRow.next.episode}
                    </p>
                  </div>
                  <h3 className="mt-2 text-lg font-bold leading-snug text-white sm:text-xl md:text-2xl">
                    {activeRow.next.name}
                  </h3>
                  {activeRow.next.overview ? (
                    <p className="mt-2 text-[13px] leading-relaxed text-shelf-muted line-clamp-4 sm:text-sm sm:line-clamp-none">
                      {activeRow.next.overview}
                    </p>
                  ) : null}
                  {checklistProgress != null && (
                    <div
                      className="mt-4 space-y-1.5"
                      role="group"
                      aria-label={`Season checklist: ${checklistProgress.completed} of ${checklistProgress.total} seasons marked complete`}
                    >
                      <div className="flex items-center justify-between gap-2 text-[10px] text-shelf-muted">
                        <span>Season checklist</span>
                        <span className="tabular-nums text-white/90">
                          {checklistProgress.completed}/{checklistProgress.total} seasons
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.08]">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[#8b5cf6] to-[#c4b5fd]"
                          style={{ width: `${checklistProgress.pct}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-sm text-amber-100/90">
                  Could not resolve next episode (TMDB).
                </p>
              )}

              <motion.div
                className="flex flex-col gap-3 border-t border-white/[0.08] pt-4"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.06, type: "spring", stiffness: 440, damping: 32 }}
              >
                <div className="flex flex-wrap items-stretch justify-center gap-2 sm:justify-start">
                  {activeRow.next && (
                    <button
                      type="button"
                      onClick={() => void onMarkWatched(activeRow.mediaId)}
                      disabled={marking === activeRow.mediaId}
                      className="inline-flex min-h-[44px] min-w-0 flex-1 items-center justify-center gap-2 rounded-xl bg-[#8b5cf6] px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-[#8b5cf6]/25 transition hover:bg-[#9b7df0] disabled:opacity-50 active:scale-[0.98] sm:min-h-0 sm:flex-initial sm:px-5"
                    >
                      {marking === activeRow.mediaId ? (
                        <Loader2 size={17} className="animate-spin" />
                      ) : (
                        <CheckCircle2 size={18} strokeWidth={2} className="shrink-0 text-white" />
                      )}
                      Mark watched
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onOpenSetPosition(activeRow)}
                    className="inline-flex min-h-[44px] min-w-0 flex-1 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-white/90 transition hover:border-white/25 hover:bg-white/[0.08] sm:min-h-0 sm:flex-initial sm:px-5"
                  >
                    <MapPin size={17} className="shrink-0 text-white/70" />
                    Set position
                  </button>
                </div>
                <Link
                  href="/series"
                  className="group flex w-full items-center justify-center gap-1 self-center text-[10px] font-semibold uppercase tracking-[0.2em] text-shelf-muted transition hover:text-[#a78bfa] sm:text-xs"
                >
                  Series list
                  <ChevronRight
                    size={14}
                    className="h-3.5 w-3.5 transition group-hover:translate-x-0.5 sm:h-4 sm:w-4"
                  />
                </Link>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
