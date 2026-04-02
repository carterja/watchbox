import { XMLParser } from "fast-xml-parser";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
  isArray: (name) => name === "Video" || name === "Directory" || name === "Hub",
});

export type PlexOnDeckItem = {
  ratingKey: string;
  type: string;
  title: string;
  /** On Deck is a short list; library = scanned partially watched items; watchboxSearch = hubs match by TMDB. */
  source?: "onDeck" | "library" | "watchboxSearch";
  /** For episodes: show’s library key (for optional metadata fetch). */
  grandparentRatingKey?: string;
  /** Show or movie title context */
  grandparentTitle?: string;
  /** Season number (TV episode) */
  parentIndex?: number;
  /** Episode number (TV episode) */
  index?: number;
  /** TV series: episode counts from library metadata */
  leafCount?: number;
  viewedLeafCount?: number;
  year?: number;
  viewOffset?: number;
  duration?: number;
  guid?: string;
  /** Parsed TMDB id when guid uses the TMDB agent */
  tmdbId?: number;
  tmdbType?: "movie" | "tv";
};

/** Stable id for a Plex on-deck row (same item can appear from on-deck vs library). */
export function plexOnDeckRowKey(item: PlexOnDeckItem): string {
  return `${item.ratingKey}-${item.source ?? "x"}`;
}

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, "");
}

export function isPlexConfigured(): boolean {
  return Boolean(process.env.PLEX_SERVER_URL?.trim() && process.env.PLEX_TOKEN?.trim());
}

/** Extract TMDB movie/tv id from Plex guid (The Movie Database agent). */
export function parseTmdbFromGuid(guid: string | undefined): { type: "movie" | "tv"; id: number } | null {
  if (!guid) return null;
  const m = guid.match(/(?:com\.plexapp\.agents\.)?themoviedb:\/\/(movie|tv)\/(\d+)/i);
  if (m) {
    const kind = m[1].toLowerCase() === "movie" ? "movie" : "tv";
    return { type: kind, id: parseInt(m[2], 10) };
  }
  // Plex internal guids look like plex://movie/5d7768... (hex) — only treat numeric-only ids as TMDB.
  const m2 = guid.match(/plex:\/\/movie\/(\d+)(?:\?|#|$)/i);
  if (m2) return { type: "movie", id: parseInt(m2[1], 10) };
  const m3 = guid.match(/plex:\/\/show\/(\d+)(?:\?|#|$)/i);
  if (m3) return { type: "tv", id: parseInt(m3[1], 10) };
  return null;
}

export type FetchPlexOpts = {
  /** Pagination for `/library/sections/.../all` */
  containerStart?: number;
  containerSize?: number;
};

/** Fetch a path from your Plex server (requires env). */
export async function fetchPlex(path: string, opts?: FetchPlexOpts): Promise<string> {
  const base = process.env.PLEX_SERVER_URL?.trim();
  const token = process.env.PLEX_TOKEN?.trim();
  if (!base || !token) {
    throw new Error("PLEX_SERVER_URL and PLEX_TOKEN must be set");
  }
  const url = `${normalizeBaseUrl(base)}${path.startsWith("/") ? path : `/${path}`}`;
  const headers: Record<string, string> = {
    Accept: "application/xml",
    "X-Plex-Token": token,
  };
  if (opts?.containerStart != null) headers["X-Plex-Container-Start"] = String(opts.containerStart);
  if (opts?.containerSize != null) headers["X-Plex-Container-Size"] = String(opts.containerSize);
  const res = await fetch(url, {
    headers,
    cache: "no-store",
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Plex HTTP ${res.status}${errText ? `: ${errText.slice(0, 200)}` : ""}`);
  }
  return res.text();
}

function attrs(node: Record<string, unknown> | undefined): Record<string, string> {
  if (!node || typeof node !== "object") return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(node)) {
    if (v != null && typeof v !== "object") out[k] = String(v);
  }
  return out;
}

function toNum(v: string | undefined): number | undefined {
  if (v == null || v === "") return undefined;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : undefined;
}

/** Parse `/library/onDeck` XML into a flat list of in-progress items. */
export function parseOnDeckXml(xml: string): PlexOnDeckItem[] {
  const doc = parser.parse(xml) as Record<string, unknown>;
  const root = doc.MediaContainer as Record<string, unknown> | undefined;
  if (!root) return [];
  const videos = root.Video;
  if (!videos) return [];
  const list = Array.isArray(videos) ? videos : [videos];
  const items: PlexOnDeckItem[] = [];
  for (const v of list) {
    const a = attrs(v as Record<string, unknown>);
    const guid = a.guid;
    const tmdb = parseTmdbFromGuid(guid);
    items.push({
      ratingKey: a.ratingKey ?? "",
      type: a.type ?? "unknown",
      title: a.title ?? a.grandparentTitle ?? "Unknown",
      source: "onDeck",
      grandparentRatingKey: a.grandparentRatingKey,
      grandparentTitle: a.grandparentTitle,
      parentIndex: toNum(a.parentIndex),
      index: toNum(a.index),
      year: toNum(a.year),
      viewOffset: toNum(a.viewOffset),
      duration: toNum(a.duration),
      guid,
      tmdbId: tmdb?.id,
      tmdbType: tmdb?.type,
    });
  }
  return items;
}

/**
 * Plex stores TMDB on metadata as `<Guid id="tmdb://12345" />`, not in the primary `guid="plex://..."` string.
 */
export function parseLibraryMetadataForTmdb(xml: string): { type: "movie" | "tv"; id: number } | null {
  const m = xml.match(/<Guid[^>]+id="tmdb:\/\/(\d+)"/);
  if (!m) return null;
  const id = parseInt(m[1], 10);
  const typeMatch = xml.match(/<(?:Directory|Video)[^>]*type="(movie|show)"/);
  const t = typeMatch?.[1];
  if (t === "movie") return { type: "movie", id };
  if (t === "show") return { type: "tv", id };
  return { type: "tv", id };
}

/** If an episode has no TMDB in its guid, fetch the show’s metadata to resolve show-level TMDB id. */
export async function enrichOnDeckWithShowTmdb(items: PlexOnDeckItem[]): Promise<PlexOnDeckItem[]> {
  const cache = new Map<string, string | undefined>();
  const metaCache = new Map<string, string>();
  const out = items.map((item) => ({ ...item }));

  const extractFirstGuid = (xml: string): string | undefined => {
    const m = xml.match(/<(?:Directory|Video)[^>]*\bguid="([^"]+)"/);
    return m?.[1];
  };

  for (let i = 0; i < out.length; i++) {
    const item = out[i];
    if (item.tmdbId != null) continue;
    const metaKey =
      item.grandparentRatingKey ?? (item.type === "show" ? item.ratingKey : undefined);
    if (!metaKey) continue;
    let xmlStr = metaCache.get(metaKey);
    if (xmlStr === undefined) {
      try {
        xmlStr = await fetchPlex(`/library/metadata/${metaKey}`);
        metaCache.set(metaKey, xmlStr);
      } catch {
        metaCache.set(metaKey, "");
        continue;
      }
    }
    if (!xmlStr) continue;

    const fromGuidEl = parseLibraryMetadataForTmdb(xmlStr);
    if (fromGuidEl) {
      out[i] = { ...item, tmdbId: fromGuidEl.id, tmdbType: fromGuidEl.type };
      continue;
    }

    let guid = cache.get(metaKey);
    if (guid === undefined) {
      guid = extractFirstGuid(xmlStr);
      cache.set(metaKey, guid);
    }
    const tmdb = parseTmdbFromGuid(guid);
    if (tmdb && tmdb.type === "tv") {
      out[i] = { ...item, tmdbId: tmdb.id, tmdbType: "tv" };
    }
  }
  return out;
}

export type PlexLibrarySection = { key: string; type: string; title: string };

/** Parse `/library/sections` — top-level libraries (movie, show, etc.). */
export function parseLibrarySectionsXml(xml: string): PlexLibrarySection[] {
  const doc = parser.parse(xml) as Record<string, unknown>;
  const root = doc.MediaContainer as Record<string, unknown> | undefined;
  if (!root) return [];
  const dirs = root.Directory;
  if (!dirs) return [];
  const list = Array.isArray(dirs) ? dirs : [dirs];
  const out: PlexLibrarySection[] = [];
  for (const d of list) {
    const a = attrs(d as Record<string, unknown>);
    if (a.key && a.type) out.push({ key: a.key, type: a.type, title: a.title ?? a.key });
  }
  return out;
}

function parseSectionAllPage(xml: string): {
  directories: Record<string, string>[];
  videos: Record<string, string>[];
  totalSize?: number;
  pageSize?: number;
} {
  const doc = parser.parse(xml) as Record<string, unknown>;
  const root = doc.MediaContainer as Record<string, unknown> | undefined;
  if (!root) return { directories: [], videos: [] };
  const dirs = root.Directory;
  const vids = root.Video;
  const dirsList = !dirs ? [] : Array.isArray(dirs) ? dirs : [dirs];
  const vidsList = !vids ? [] : Array.isArray(vids) ? vids : [vids];
  return {
    directories: dirsList.map((d) => attrs(d as Record<string, unknown>)),
    videos: vidsList.map((v) => attrs(v as Record<string, unknown>)),
    totalSize: toNum(root.totalSize as string | undefined),
    pageSize: toNum(root.size as string | undefined),
  };
}

/** Started but not fully caught up (Plex metadata). Some agents omit viewedLeafCount; use viewCount / lastViewedAt when present. */
function isPartialTvShow(a: Record<string, string>): boolean {
  const v = toNum(a.viewedLeafCount);
  const l = toNum(a.leafCount);
  const plays = toNum(a.viewCount);
  const hasLast = Boolean(a.lastViewedAt && a.lastViewedAt !== "0");

  if (l != null && l > 0 && v != null && v >= l) return false;

  if (v != null && v > 0 && l != null && l > 0 && v < l) return true;

  if (plays != null && plays > 0 && l != null && l > 0 && (v == null || v < l)) return true;

  if (hasLast && l != null && l > 0 && (v == null || v < l)) return true;

  return false;
}

function isPartialMovie(a: Record<string, string>): boolean {
  const vo = toNum(a.viewOffset);
  const dur = toNum(a.duration);
  if (!vo || !dur || dur <= 0) return false;
  return vo / dur < 0.95;
}

const PAGE = 100;
const MAX_PAGES = 40;

/**
 * Scan movie + TV libraries for partially watched items (not limited like On Deck).
 * Can be heavy on very large libraries; uses pagination with a page cap.
 */
export async function fetchLibraryPartialItems(): Promise<PlexOnDeckItem[]> {
  const sectionsXml = await fetchPlex("/library/sections");
  const sections = parseLibrarySectionsXml(sectionsXml);
  const out: PlexOnDeckItem[] = [];

  for (const sec of sections) {
    if (sec.type === "show") {
      let start = 0;
      for (let p = 0; p < MAX_PAGES; p++) {
        const xml = await fetchPlex(`/library/sections/${encodeURIComponent(sec.key)}/all`, {
          containerStart: start,
          containerSize: PAGE,
        });
        const page = parseSectionAllPage(xml);
        for (const a of page.directories) {
          if ((a.type ?? "").toLowerCase() !== "show") continue;
          if (!isPartialTvShow(a)) continue;
          const guid = a.guid;
          const tmdb = parseTmdbFromGuid(guid);
          out.push({
            ratingKey: a.ratingKey ?? "",
            type: "show",
            title: a.title ?? "Unknown",
            source: "library",
            year: toNum(a.year),
            guid,
            leafCount: toNum(a.leafCount),
            viewedLeafCount: toNum(a.viewedLeafCount),
            tmdbId: tmdb?.id,
            tmdbType: tmdb?.type === "tv" ? "tv" : tmdb?.type === "movie" ? "movie" : undefined,
          });
        }
        const total = page.totalSize ?? 0;
        const got = page.pageSize ?? page.directories.length + page.videos.length;
        if (got === 0) break;
        if (got < PAGE) break;
        if (total > 0 && start + got >= total) break;
        start += got;
      }
    } else if (sec.type === "movie") {
      let start = 0;
      for (let p = 0; p < MAX_PAGES; p++) {
        const xml = await fetchPlex(`/library/sections/${encodeURIComponent(sec.key)}/all`, {
          containerStart: start,
          containerSize: PAGE,
        });
        const page = parseSectionAllPage(xml);
        for (const a of page.videos) {
          if ((a.type ?? "").toLowerCase() !== "movie") continue;
          if (!isPartialMovie(a)) continue;
          const guid = a.guid;
          const tmdb = parseTmdbFromGuid(guid);
          out.push({
            ratingKey: a.ratingKey ?? "",
            type: "movie",
            title: a.title ?? "Unknown",
            source: "library",
            year: toNum(a.year),
            viewOffset: toNum(a.viewOffset),
            duration: toNum(a.duration),
            guid,
            tmdbId: tmdb?.id,
            tmdbType: tmdb?.type === "movie" ? "movie" : undefined,
          });
        }
        const total = page.totalSize ?? 0;
        const got = page.pageSize ?? page.directories.length + page.videos.length;
        if (got === 0) break;
        if (got < PAGE) break;
        if (total > 0 && start + got >= total) break;
        start += got;
      }
    }
  }

  return out;
}

/** Prefer On Deck rows; add library-only matches (same TMDB) so started shows still match WatchBox. */
export function mergeOnDeckWithLibrary(
  onDeck: PlexOnDeckItem[],
  library: PlexOnDeckItem[]
): PlexOnDeckItem[] {
  const byTmdb = new Set<string>();
  for (const item of onDeck) {
    const k =
      item.tmdbId != null && item.tmdbType
        ? `${item.tmdbType}:${item.tmdbId}`
        : null;
    if (k) byTmdb.add(k);
  }
  const merged = onDeck.map((i) => ({ ...i, source: i.source ?? "onDeck" as const }));
  for (const lib of library) {
    const k =
      lib.tmdbId != null && lib.tmdbType ? `${lib.tmdbType}:${lib.tmdbId}` : null;
    if (k && byTmdb.has(k)) continue;
    if (k) byTmdb.add(k);
    merged.push({ ...lib, source: "library" });
  }
  return merged;
}

/** Parse `/hubs/search` — show + movie candidates (not episodes). */
export function parseHubsSearchXml(xml: string): PlexOnDeckItem[] {
  const doc = parser.parse(xml) as Record<string, unknown>;
  const root = doc.MediaContainer as Record<string, unknown> | undefined;
  if (!root) return [];
  const hubs = root.Hub;
  const hubList = !hubs ? [] : Array.isArray(hubs) ? hubs : [hubs];
  const out: PlexOnDeckItem[] = [];
  for (const hub of hubList) {
    const h = hub as Record<string, unknown>;
    const dirs = h.Directory;
    const vids = h.Video;
    const dList = !dirs ? [] : Array.isArray(dirs) ? dirs : [dirs];
    const vList = !vids ? [] : Array.isArray(vids) ? vids : [vids];
    for (const d of dList) {
      const a = attrs(d as Record<string, unknown>);
      if ((a.type ?? "").toLowerCase() !== "show") continue;
      const tmdb = parseTmdbFromGuid(a.guid);
      out.push({
        ratingKey: a.ratingKey ?? "",
        type: "show",
        title: a.title ?? "Unknown",
        guid: a.guid,
        leafCount: toNum(a.leafCount),
        viewedLeafCount: toNum(a.viewedLeafCount),
        year: toNum(a.year),
        viewOffset: toNum(a.viewOffset),
        duration: toNum(a.duration),
        tmdbId: tmdb?.id,
        tmdbType: tmdb?.type === "tv" ? "tv" : undefined,
      });
    }
    for (const v of vList) {
      const a = attrs(v as Record<string, unknown>);
      if ((a.type ?? "").toLowerCase() !== "movie") continue;
      const tmdb = parseTmdbFromGuid(a.guid);
      out.push({
        ratingKey: a.ratingKey ?? "",
        type: "movie",
        title: a.title ?? "Unknown",
        guid: a.guid,
        viewOffset: toNum(a.viewOffset),
        duration: toNum(a.duration),
        year: toNum(a.year),
        tmdbId: tmdb?.id,
        tmdbType: tmdb?.type === "movie" ? "movie" : undefined,
      });
    }
  }
  return out;
}

/**
 * When Plex’s show list has no watch state (viewedLeafCount=0) but WatchBox says in progress,
 * resolve the library item by title search + TMDB Guid on full metadata.
 */
export async function findPlexMatchByTmdb(
  title: string,
  tmdbId: number,
  mediaType: "movie" | "tv"
): Promise<PlexOnDeckItem | null> {
  const xml = await fetchPlex(`/hubs/search?query=${encodeURIComponent(title)}&limit=15`);
  const candidates = parseHubsSearchXml(xml);
  for (const c of candidates) {
    if (mediaType === "tv" && c.type !== "show") continue;
    if (mediaType === "movie" && c.type !== "movie") continue;
    if (!c.ratingKey) continue;
    let metaXml: string;
    try {
      metaXml = await fetchPlex(`/library/metadata/${c.ratingKey}`);
    } catch {
      continue;
    }
    const parsed = parseLibraryMetadataForTmdb(metaXml);
    if (parsed && parsed.id === tmdbId && parsed.type === mediaType) {
      return {
        ...c,
        tmdbId,
        tmdbType: mediaType,
        source: "watchboxSearch",
      };
    }
  }
  return null;
}

export type PlexWebhookGuidItem = { id?: string };

export type PlexWebhookMetadata = {
  type?: string;
  ratingKey?: string;
  grandparentRatingKey?: string;
  parentIndex?: number;
  index?: number;
  title?: string;
  grandparentTitle?: string;
  parentTitle?: string;
  year?: number;
  guid?: string;
  /** Plex JSON may send one object or an array */
  Guid?: PlexWebhookGuidItem | PlexWebhookGuidItem[];
};

export type PlexWebhookPayload = {
  event?: string;
  Metadata?: PlexWebhookMetadata;
  Account?: { id?: number; title?: string };
  Player?: { title?: string };
};

function normalizeGuidItems(g: PlexWebhookMetadata["Guid"]): PlexWebhookGuidItem[] {
  if (g == null) return [];
  return Array.isArray(g) ? g : [g];
}

/** First `tmdb://123` in Plex `Guid` array (order is agent-dependent). */
export function firstTmdbIdFromGuidArray(Guid: PlexWebhookMetadata["Guid"]): number | null {
  for (const item of normalizeGuidItems(Guid)) {
    const id = item?.id;
    if (typeof id !== "string") continue;
    const m = id.match(/^tmdb:\/\/(\d+)$/i);
    if (m) {
      const n = parseInt(m[1], 10);
      if (Number.isFinite(n)) return n;
    }
  }
  return null;
}

/** First `imdb://tt…` in Plex `Guid` array (used to resolve TV **series** id from an episode webhook). */
export function firstImdbIdFromGuidArray(Guid: PlexWebhookMetadata["Guid"]): string | null {
  for (const item of normalizeGuidItems(Guid)) {
    const id = item?.id;
    if (typeof id !== "string") continue;
    const m = id.match(/^imdb:\/\/(tt\d+)$/i);
    if (m) return m[1];
  }
  return null;
}

/**
 * Resolve TMDB id for webhook Metadata: prefers agent `guid` (show/movie id), then `<Guid id="tmdb://…">`.
 */
export function extractTmdbFromWebhookMetadata(
  meta: PlexWebhookMetadata | undefined
): { type: "movie" | "tv"; id: number } | null {
  if (!meta) return null;
  const kind = (meta.type ?? "").toLowerCase();
  const fromMainGuid = parseTmdbFromGuid(meta.guid);

  if (kind === "movie") {
    if (fromMainGuid?.type === "movie") return fromMainGuid;
    const n = firstTmdbIdFromGuidArray(meta.Guid);
    if (n != null) return { type: "movie", id: n };
    return null;
  }

  if (kind === "episode" || kind === "show") {
    if (fromMainGuid?.type === "tv") return fromMainGuid;
    const n = firstTmdbIdFromGuidArray(meta.Guid);
    if (n != null) return { type: "tv", id: n };
    return null;
  }

  return null;
}

/** Parse Plex webhook body (multipart form field `payload` is JSON). */
export function parseWebhookPayload(formData: FormData): PlexWebhookPayload | null {
  const raw = formData.get("payload");
  if (typeof raw !== "string" || !raw.trim()) return null;
  try {
    return JSON.parse(raw) as PlexWebhookPayload;
  } catch {
    return null;
  }
}
