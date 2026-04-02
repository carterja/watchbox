import { prisma } from "@/lib/db";
import {
  extractTmdbFromWebhookMetadata,
  firstImdbIdFromGuidArray,
  parseWebhookPayload,
} from "@/lib/plex";
import { getTvShowIdFromImdbFind } from "@/lib/tmdb";
import {
  applyEpisodeWatchedFromPlexWebhook,
  applyMovieScrobbleFromPlexWebhook,
} from "@/lib/seasonProgress";

/**
 * POST /api/plex/webhook — Plex Pass webhooks (Settings → Webhooks on the server).
 * Add a shared secret in the URL: /api/plex/webhook?secret=YOUR_SECRET and set PLEX_WEBHOOK_SECRET.
 *
 * Records `PlaybackEvent` for: `media.scrobble`, `media.play`, `media.stop`, `media.pause` (so you can
 * see activity in the title’s Plex log). Only `media.scrobble` updates WatchBox media (finished episode / movie).
 *
 * Set `PLEX_WEBHOOK_LOG_RAW=true` to print the raw multipart `payload` JSON to stdout (docker logs).
 */
export const dynamic = "force-dynamic";

function shouldLogRawPlexWebhook(): boolean {
  const v = process.env.PLEX_WEBHOOK_LOG_RAW?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

/** Persisted to PlaybackEvent — play/stop/pause are logged only; scrobble also updates Media. */
const RECORD_PLAYBACK_EVENTS = new Set([
  "media.scrobble",
  "media.play",
  "media.stop",
  "media.pause",
]);

function num(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return Math.trunc(v);
  if (typeof v === "string" && v.trim()) {
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

export async function POST(request: Request) {
  const expected = process.env.PLEX_WEBHOOK_SECRET?.trim();
  if (expected) {
    const url = new URL(request.url);
    if (url.searchParams.get("secret") !== expected) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json({ error: "Expected multipart form data" }, { status: 400 });
  }

  if (shouldLogRawPlexWebhook()) {
    const raw = formData.get("payload");
    console.info(
      "[plex webhook] raw payload:",
      typeof raw === "string" ? raw : `(no payload field: ${String(raw)})`
    );
  }

  const payload = parseWebhookPayload(formData);
  if (!payload) {
    return Response.json({ ok: true, ignored: true });
  }

  const ev = payload.event;
  if (!ev || !RECORD_PLAYBACK_EVENTS.has(ev)) {
    return Response.json({
      ok: true,
      ignored: true,
      event: ev ?? null,
    });
  }

  const meta = payload.Metadata;
  if (!meta) {
    return Response.json({ ok: true, ignored: true, reason: "no_metadata" });
  }

  const kind = (meta.type ?? "").toLowerCase();
  if (kind !== "movie" && kind !== "episode") {
    return Response.json({
      ok: true,
      ignored: true,
      reason: "metadata_type",
      metadataType: meta.type ?? null,
    });
  }

  let tmdb = extractTmdbFromWebhookMetadata(meta);
  let mediaId: string | null = null;
  if (tmdb) {
    let row = await prisma.media.findFirst({
      where: {
        tmdbId: tmdb.id,
        type: tmdb.type === "movie" ? "movie" : "tv",
      },
      select: { id: true },
    });
    // Episode webhooks often send the **episode** TMDB id in Guid; WatchBox rows use the **series** id.
    if (!row && kind === "episode" && tmdb.type === "tv") {
      const imdb = firstImdbIdFromGuidArray(meta.Guid);
      if (imdb) {
        const showId = await getTvShowIdFromImdbFind(imdb);
        if (showId != null) {
          tmdb = { type: "tv", id: showId };
          row = await prisma.media.findFirst({
            where: { tmdbId: showId, type: "tv" },
            select: { id: true },
          });
        }
      }
    }
    mediaId = row?.id ?? null;
  }

  try {
    await prisma.playbackEvent.create({
      data: {
        event: ev,
        mediaId,
        tmdbId: tmdb?.id ?? null,
        mediaKind: tmdb ? (tmdb.type === "movie" ? "movie" : "tv") : null,
        title: meta.title ?? null,
        showTitle: meta.grandparentTitle ?? null,
        season: num(meta.parentIndex),
        episode: num(meta.index),
        year: num(meta.year),
        ratingKey: meta.ratingKey != null ? String(meta.ratingKey) : null,
        grandparentRatingKey:
          meta.grandparentRatingKey != null ? String(meta.grandparentRatingKey) : null,
        guid: meta.guid ?? null,
        accountTitle: payload.Account?.title ?? null,
        playerTitle: payload.Player?.title ?? null,
      },
    });
  } catch (e) {
    console.error("playbackEvent create failed:", e);
    return Response.json({ ok: false, error: "persist_failed" }, { status: 500 });
  }

  if (mediaId && ev === "media.scrobble") {
    try {
      if (kind === "episode") {
        const season = num(meta.parentIndex);
        const episode = num(meta.index);
        if (season != null && episode != null) {
          await applyEpisodeWatchedFromPlexWebhook(mediaId, season, episode);
        }
      } else if (kind === "movie") {
        await applyMovieScrobbleFromPlexWebhook(mediaId);
      }
    } catch (e) {
      console.error("plex webhook media sync failed:", e);
    }
  }

  return Response.json({
    ok: true,
    event: ev,
    metadataType: meta.type ?? null,
    recorded: true,
  });
}
