/**
 * Original mark: vertical bar + forward triangle (Plex-evocative “play / next” shape),
 * filled like Lucide icons at 20px — not the Plex trademark artwork.
 */
export function PlexMarkIcon({
  className,
  size = 20,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <path
        fill="currentColor"
        d="M5 5.5h3v13H5v-13zm5.5 0L19 12l-8.5 6.5z"
      />
    </svg>
  );
}
