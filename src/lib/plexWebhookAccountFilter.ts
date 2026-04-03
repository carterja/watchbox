import type { Prisma } from "@prisma/client";

/**
 * Comma-separated Plex `Account.title` values (usernames) from webhooks.
 * When set, only those accounts are recorded and shown in playback logs / stats.
 * Example: `PLEX_WEBHOOK_ALLOWED_ACCOUNTS=carterja11`
 */
export function getAllowedPlexWebhookAccountTitles(): string[] | null {
  const raw = process.env.PLEX_WEBHOOK_ALLOWED_ACCOUNTS?.trim();
  if (!raw) return null;
  const parts = raw.split(",").map((s) => s.trim()).filter(Boolean);
  return parts.length > 0 ? parts : null;
}

export function plexWebhookAccountTitleAllowed(accountTitle: string | null | undefined): boolean {
  const allowed = getAllowedPlexWebhookAccountTitles();
  if (!allowed) return true;
  const t = accountTitle?.trim();
  if (!t) return false;
  const lower = t.toLowerCase();
  return allowed.some((a) => a.toLowerCase() === lower);
}

/** Exact-match variants for SQLite (no `mode: insensitive` on string fields). */
function accountTitleEqualsClauses(allowed: string[]): Prisma.PlaybackEventWhereInput[] {
  return allowed.flatMap((a) => {
    const t = a.trim();
    const variants = [...new Set([t, t.toLowerCase(), t.toUpperCase()])];
    return variants.map((v) => ({ accountTitle: { equals: v } }));
  });
}

/** Prisma fragment for PlaybackEvent queries when the allowlist is active. */
export function playbackEventWhereAllowedAccounts(): Prisma.PlaybackEventWhereInput | undefined {
  const allowed = getAllowedPlexWebhookAccountTitles();
  if (!allowed?.length) return undefined;
  return {
    OR: accountTitleEqualsClauses(allowed),
  };
}

/** Merges a base `where` with the account allowlist when `PLEX_WEBHOOK_ALLOWED_ACCOUNTS` is set. */
export function withPlaybackAccountFilter(
  where?: Prisma.PlaybackEventWhereInput
): Prisma.PlaybackEventWhereInput | undefined {
  const allowed = playbackEventWhereAllowedAccounts();
  if (!allowed) return where;
  const hasBase = where && Object.keys(where).length > 0;
  if (!hasBase) return allowed;
  return { AND: [where!, allowed] };
}
