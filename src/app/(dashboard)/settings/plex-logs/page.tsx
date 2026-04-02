import { redirect } from "next/navigation";

/** Bookmark-friendly redirect — webhook log lives under Plex hub. */
export default function PlexLogsSettingsRedirectPage() {
  redirect("/plex?tab=logs");
}
