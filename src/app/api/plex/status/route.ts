import { fetchPlex, isPlexConfigured } from "@/lib/plex";

/** GET /api/plex/status — whether Plex env is set and the server responds. */
export const dynamic = "force-dynamic";

export async function GET() {
  if (!isPlexConfigured()) {
    return Response.json({
      configured: false,
      reachable: false,
      message: "Set PLEX_SERVER_URL and PLEX_TOKEN in .env",
    });
  }
  try {
    await fetchPlex("/identity");
    return Response.json({ configured: true, reachable: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return Response.json(
      {
        configured: true,
        reachable: false,
        message,
      },
      { status: 200 }
    );
  }
}
