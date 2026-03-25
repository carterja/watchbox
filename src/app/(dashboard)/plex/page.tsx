import { redirect } from "next/navigation";

/** Old route — unified hub lives at /watching */
export default function PlexPageRedirect() {
  redirect("/watching");
}
