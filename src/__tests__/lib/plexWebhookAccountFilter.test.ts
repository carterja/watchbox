import { afterEach, describe, expect, it } from "vitest";
import {
  getAllowedPlexWebhookAccountTitles,
  plexWebhookAccountTitleAllowed,
  withPlaybackAccountFilter,
} from "@/lib/plexWebhookAccountFilter";

const KEY = "PLEX_WEBHOOK_ALLOWED_ACCOUNTS";

describe("plexWebhookAccountFilter", () => {
  const prev = process.env[KEY];

  afterEach(() => {
    if (prev === undefined) delete process.env[KEY];
    else process.env[KEY] = prev;
  });

  it("returns null when unset", () => {
    delete process.env[KEY];
    expect(getAllowedPlexWebhookAccountTitles()).toBeNull();
  });

  it("parses comma-separated titles", () => {
    process.env[KEY] = " alice , bob ";
    expect(getAllowedPlexWebhookAccountTitles()).toEqual(["alice", "bob"]);
  });

  it("allows any account when allowlist unset", () => {
    delete process.env[KEY];
    expect(plexWebhookAccountTitleAllowed("anyone")).toBe(true);
    expect(plexWebhookAccountTitleAllowed(undefined)).toBe(true);
  });

  it("matches account title case-insensitively", () => {
    process.env[KEY] = "Carter";
    expect(plexWebhookAccountTitleAllowed("carter")).toBe(true);
    expect(plexWebhookAccountTitleAllowed("other")).toBe(false);
    expect(plexWebhookAccountTitleAllowed(undefined)).toBe(false);
  });

  it("withPlaybackAccountFilter passes through when unset", () => {
    delete process.env[KEY];
    const w = { event: "media.scrobble" as const };
    expect(withPlaybackAccountFilter(w)).toEqual(w);
  });

  /** SQLite-compatible Prisma filters: OR of equals (trim + lower/upper variants), no `mode: insensitive`. */
  const accountOrForMe = {
    OR: [{ accountTitle: { equals: "me" } }, { accountTitle: { equals: "ME" } }],
  };

  it("withPlaybackAccountFilter merges allowlist", () => {
    process.env[KEY] = "me";
    expect(withPlaybackAccountFilter({ event: "media.scrobble" })).toEqual({
      AND: [{ event: "media.scrobble" }, accountOrForMe],
    });
  });

  it("withPlaybackAccountFilter returns only allowlist when base empty", () => {
    process.env[KEY] = "me";
    expect(withPlaybackAccountFilter()).toEqual(accountOrForMe);
  });
});
