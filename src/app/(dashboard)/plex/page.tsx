import { redirect } from "next/navigation";

export default function PlexPageRedirect() {
  redirect("/settings#plex");
}
