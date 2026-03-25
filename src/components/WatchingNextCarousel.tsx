"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  PlayCircle,
  Tv,
} from "lucide-react";
import { StreamingIcon } from "@/components/StreamingIcon";
import type { Swiper as SwiperType } from "swiper";
import { EffectCoverflow, Pagination } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";
import type { WhatNextRow } from "@/lib/whatNext";
import { posterUrl } from "@/lib/tmdb";

function formatAirDate(iso: string | null): string | null {
  if (!iso) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso.trim());
  if (!m) return iso;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { dateStyle: "medium" });
}

import "swiper/css";
import "swiper/css/effect-coverflow";
import "swiper/css/pagination";

type Props = {
  rows: WhatNextRow[];
  marking: string | null;
  onMarkWatched: (mediaId: string) => void;
  onOpenSetPosition: (row: WhatNextRow) => void;
  /** Library streaming label for badge (optional). */
  resolveStreaming?: (mediaId: string) => string | null;
};

export function WatchingNextCarousel({
  rows,
  marking,
  onMarkWatched,
  onOpenSetPosition,
  resolveStreaming,
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
  const primaryVisualIsStill = Boolean(episodeStillSrc);
  const nextAirLabel = activeRow?.next?.airDate != null ? formatAirDate(activeRow.next.airDate) : null;

  const onSlideChange = useCallback((swiper: SwiperType) => {
    setActiveIndex(swiper.realIndex);
  }, []);

  if (rows.length === 0) return null;

  return (
    <div className="space-y-6">
      <div className="relative -mx-4 px-4 md:mx-0 md:px-0">
        <div
          className="pointer-events-none absolute inset-x-0 -top-px h-32 bg-gradient-to-b from-[#8b5cf6]/[0.07] to-transparent rounded-t-[2rem]"
          aria-hidden
        />
        <Swiper
          key={rowsKey}
          modules={[EffectCoverflow, Pagination]}
          effect={useCoverflow ? "coverflow" : "slide"}
          grabCursor
          centeredSlides
          slidesPerView="auto"
          spaceBetween={useCoverflow ? 0 : 18}
          slideToClickedSlide
          pagination={{ clickable: true, dynamicBullets: true }}
          onSwiper={(s) => {
            swiperRef.current = s;
          }}
          onSlideChange={onSlideChange}
          coverflowEffect={
            useCoverflow
              ? {
                  rotate: 32,
                  stretch: 0,
                  depth: 160,
                  modifier: 1,
                  slideShadows: true,
                }
              : undefined
          }
          className="watching-swiper !pb-12 !pt-2"
        >
          {rows.map((row, index) => {
            const src = row.posterPath ? posterUrl(row.posterPath, "w342") : null;
            const isActive = index === clampedIndex;
            return (
              <SwiperSlide
                key={row.mediaId}
                className="!w-[min(72vw,220px)] sm:!w-[200px] md:!w-[220px]"
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
                        sizes="(max-width: 768px) 72vw, 220px"
                        priority={index === 0}
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-shelf-muted">
                        <Tv size={40} />
                      </div>
                    )}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent pt-12 pb-3 px-3">
                      <p className="text-sm font-semibold text-white line-clamp-2 leading-snug drop-shadow">
                        {row.title}
                      </p>
                    </div>
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
            className="relative mx-auto max-w-3xl overflow-hidden rounded-2xl border border-white/[0.08] bg-shelf-card/90 shadow-[0_24px_48px_-12px_rgba(0,0,0,0.45)] ring-1 ring-white/[0.04] backdrop-blur-sm"
          >
            <div
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_55%_at_100%_0%,rgba(139,92,246,0.14),transparent_55%)]"
              aria-hidden
            />
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#8b5cf6]/35 to-transparent" />

            <div className="relative flex flex-col gap-5 p-4 sm:flex-row sm:items-start sm:gap-6 sm:p-5 md:p-6">
              <div className="flex w-full shrink-0 justify-center sm:w-auto sm:max-w-[min(100%,280px)] sm:justify-start">
                <div
                  className={`relative w-full max-w-[280px] overflow-hidden rounded-xl border border-white/10 bg-shelf-border shadow-inner sm:max-w-none sm:w-[13.5rem] ${
                    primaryVisualIsStill ? "aspect-video" : "aspect-[2/3]"
                  }`}
                >
                  {primaryVisualSrc ? (
                    <Image
                      src={primaryVisualSrc}
                      alt=""
                      fill
                      className="object-cover"
                      sizes={primaryVisualIsStill ? "(max-width:640px) 100vw, 280px" : "128px"}
                    />
                  ) : (
                    <div className="flex h-full min-h-[9rem] items-center justify-center text-shelf-muted/80">
                      <Tv size={36} strokeWidth={1.25} />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex min-w-0 flex-1 flex-col justify-between gap-5">
                <div className="space-y-3 text-center sm:text-left">
                  <div className="flex flex-col items-center gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-start sm:gap-2.5">
                    {activeStream ? (
                      <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 text-xs font-medium text-shelf-muted">
                        <StreamingIcon service={activeStream} className="h-4 w-4 rounded-[3px]" />
                        {activeStream}
                      </span>
                    ) : null}
                    <h2 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">
                      {activeRow.title}
                    </h2>
                  </div>

                  {activeRow.lastFinished && (
                    <p className="text-[11px] text-shelf-muted/90">
                      Last finished{" "}
                      <span className="tabular-nums text-shelf-muted">
                        S{activeRow.lastFinished.season}E{activeRow.lastFinished.episode}
                      </span>
                    </p>
                  )}

                  {activeRow.caughtUp && !activeRow.next ? (
                    <div className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200/95 sm:justify-start">
                      <CheckCircle2 size={17} className="shrink-0 text-emerald-400/90" />
                      Caught up with aired episodes
                    </div>
                  ) : activeRow.next ? (
                    <div className="space-y-3">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-shelf-muted">
                          Next episode
                        </p>
                        <div className="mt-1.5 flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-3">
                          <span className="inline-flex w-fit shrink-0 rounded-lg bg-[#8b5cf6]/15 px-2.5 py-1 font-mono text-sm font-semibold tabular-nums text-[#c4b5fd] ring-1 ring-[#8b5cf6]/25">
                            S{activeRow.next.season}E{activeRow.next.episode}
                          </span>
                          <p className="min-w-0 text-[15px] font-medium leading-snug text-white">
                            {activeRow.next.name}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                        {nextAirLabel && (
                          <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.07] bg-white/[0.03] px-2.5 py-1.5 text-xs text-shelf-muted">
                            <Calendar size={13} className="shrink-0 text-shelf-muted/80" aria-hidden />
                            <span className="text-white/85">{nextAirLabel}</span>
                          </span>
                        )}
                        {activeRow.next.runtimeMinutes != null && (
                          <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.07] bg-white/[0.03] px-2.5 py-1.5 text-xs text-shelf-muted">
                            <Clock size={13} className="shrink-0 text-shelf-muted/80" aria-hidden />
                            <span className="tabular-nums text-white/85">
                              {activeRow.next.runtimeMinutes} min
                            </span>
                          </span>
                        )}
                      </div>

                      {activeRow.next.overview ? (
                        <p className="text-sm leading-relaxed text-shelf-muted line-clamp-6 sm:line-clamp-none">
                          {activeRow.next.overview}
                        </p>
                      ) : null}
                    </div>
                  ) : (
                    <p className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-sm text-amber-100/90">
                      Could not resolve next episode (TMDB).
                    </p>
                  )}
                </div>

                <motion.div
                  className="flex flex-col gap-2 border-t border-white/[0.06] pt-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-3 sm:border-t-0 sm:pt-0"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.06, type: "spring", stiffness: 440, damping: 32 }}
                >
                  <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                    {activeRow.next && (
                      <button
                        type="button"
                        onClick={() => void onMarkWatched(activeRow.mediaId)}
                        disabled={marking === activeRow.mediaId}
                        className="inline-flex items-center gap-2 rounded-xl bg-[#8b5cf6] px-4 py-2.5 text-sm font-medium text-white shadow-md shadow-[#8b5cf6]/20 transition hover:bg-[#9b7df0] disabled:opacity-50 active:scale-[0.98]"
                      >
                        {marking === activeRow.mediaId ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <PlayCircle size={17} strokeWidth={2} />
                        )}
                        Mark watched
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onOpenSetPosition(activeRow)}
                      className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-shelf-muted transition hover:border-white/15 hover:bg-white/[0.07] hover:text-white"
                    >
                      <MapPin size={16} />
                      Set position
                    </button>
                  </div>
                  <Link
                    href="/series"
                    className="group inline-flex items-center justify-center gap-1 self-center text-sm font-medium text-[#a78bfa] transition hover:text-white sm:self-auto"
                  >
                    Series list
                    <ChevronRight
                      size={16}
                      className="transition group-hover:translate-x-0.5"
                    />
                  </Link>
                </motion.div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
