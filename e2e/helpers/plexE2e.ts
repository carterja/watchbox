import type { APIRequestContext } from "@playwright/test";

/** Matches route + optional ?secret= for POST /api/plex/webhook (server must get same env). */
export function plexWebhookPath(): string {
  const s = process.env.PLEX_WEBHOOK_SECRET?.trim();
  return s ? `/api/plex/webhook?secret=${encodeURIComponent(s)}` : "/api/plex/webhook";
}

/**
 * Plex `Account.title` for webhook payloads. When `PLEX_WEBHOOK_ALLOWED_ACCOUNTS` is set in `.env.local`,
 * use the first allowlisted name so playback is recorded in e2e.
 */
export function plexAccountTitleForE2E(): string {
  const raw = process.env.PLEX_WEBHOOK_ALLOWED_ACCOUNTS?.trim();
  if (!raw) return "e2e_plex_account";
  return raw.split(",")[0]!.trim();
}

export async function postPlexWebhook(
  request: APIRequestContext,
  payload: Record<string, unknown>
) {
  const merged = {
    ...payload,
    Account: payload.Account ?? { title: plexAccountTitleForE2E() },
  };
  return request.post(plexWebhookPath(), {
    multipart: { payload: JSON.stringify(merged) },
  });
}
