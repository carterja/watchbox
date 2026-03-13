"use client";

import { memo } from "react";
import Image from "next/image";

type StreamingIconProps = {
  service: string;
  className?: string;
};

const svgProps = {
  viewBox: "0 0 24 24" as const,
  fill: "currentColor" as const,
  preserveAspectRatio: "xMidYMid meet" as const,
};

function StreamingIconComponent({ service, className = "w-5 h-5" }: StreamingIconProps) {
  const cls = `shrink-0 ${className}`;

  // Preferred: use Flaticon-based image if present. This lets your custom
  // icons automatically override the built-in SVGs.
  const iconMap: Record<string, string> = {
    "Apple TV": "appletv.png",
    "Netflix": "netflix.png",
    "HBO": "hbo.png",
    "Max": "max.png",
    "Prime": "prime.png",
    "Plex": "plex.png",
    "Disney+": "disney.svg",
    "Hulu": "hulu.png",
    "Peacock": "peacock.svg",
    "Paramount+": "paramount.svg",
  };

  const iconFile = iconMap[service];
  if (iconFile) {
    return (
      <Image
        src={`/icons/streaming/${iconFile}`}
        alt={service}
        width={24}
        height={24}
        className={cls}
      />
    );
  }

  // Fallback: built‑in SVGs so things look good even before
  // Flaticon assets are added.
  switch (service) {
    case "Apple TV":
      return (
        <svg {...svgProps} className={cls}>
          <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
        </svg>
      );
    case "Netflix":
      return (
        <svg {...svgProps} className={cls} style={{ color: "#E50914" }}>
          <path d="m5.398 0 8.348 23.602c2.346.059 4.856.398 4.856.398L10.113 0H5.398zm8.489 0v9.172l4.715 13.33V0h-4.715zM5.398 1.5V24c1.873-.225 2.81-.312 4.715-.398V14.83L5.398 1.5z" />
        </svg>
      );
    case "HBO":
    case "Max":
      return (
        <svg {...svgProps} className={cls}>
          <path d="M7.042 16.896H4.414v-3.754H2.708v3.754H.01L0 7.22h2.708v3.6h1.706v-3.6h2.628zm12.043.046C21.795 16.94 24 14.689 24 11.978a4.89 4.89 0 0 0-4.915-4.92c-2.707-.002-4.09 1.991-4.432 2.795.003-1.207-1.187-2.632-2.58-2.634H7.59v9.674l4.181.001c1.686 0 2.886-1.46 2.888-2.713.385.788 1.72 2.762 4.427 2.76zm-7.665-3.936c.387 0 .692.382.692.817 0 .435-.305.817-.692.817h-1.33v-1.634zm.005-3.633c.387 0 .692.382.692.817 0 .436-.305.818-.692.818h-1.33V9.373zm1.77 2.607c.305-.039.813-.387.992-.61-.063.276-.068 1.074.006 1.35-.204-.314-.688-.701-.998-.74zm3.43 0a2.462 2.462 0 1 1 4.924 0 2.462 2.462 0 0 1-4.925 0zm2.462 1.936a1.936 1.936 0 1 0 0-3.872 1.936 1.936 0 0 0 0 3.872Z" />
        </svg>
      );
    case "Prime":
      return (
        <svg {...svgProps} className={cls}>
          <path d="M21.6 15.2c-3.1 2.3-7.6 3.6-11.5 3.6-2.7 0-5.4-.5-7.6-1.6-.4-.2-.1-.8.3-.6 2.2 1.3 4.9 1.8 7.3 1.8 3.7 0 7.3-1.2 10-3.4.4-.3.8.2.5.6zM23 13.7c-.4-.5-2.5-.2-3.5-.1-.3 0-.3-.2-.1-.4.3-.2.8-.6 1.1-.8.2-.2.4-.4.3-.6-.1-.2-.5-.1-.7 0-1.9 1.1-3.1 3.2-3.2 3.3-.1.2 0 .3.2.3.2 0 3.4-.4 3.8-.3.4.1.6.2.9.3.1 0 .3.1.3-.1 0-.2-.2-.4-.4-.6zM9.5 16.9H7.3l1.4-8.5h2.2l-1.4 8.5zm-3.9-8.5L3.8 13 3.6 12c-.4-1.2-1.6-2.5-2.9-3.1l2.1 8h2.5l3.7-8h-2.4zM13.4 11c-.9 0-1.5.3-1.9.9l.3-1.7H9.8l-1 6.7h2.2l.4-2.7c.2-.9.8-1.5 1.3-1.5.7 0 .9.5.8 1.1l-.5 3.1h2.2l.5-3.3c.2-1.4-.6-2.6-2.3-2.6z" />
        </svg>
      );
    case "Plex":
      return (
        <svg {...svgProps} className={cls}>
          <path d="M3.987 8.409c-.96 0-1.587.28-2.12.933v-.72H0v8.88s.038.018.127.037c.138.03.821.187 1.331-.249.441-.377.542-.814.542-1.318v-1.283c.533.573 1.147.813 2 .813 1.84 0 3.253-1.493 3.253-3.48 0-2.12-1.36-3.613-3.266-3.613Zm16.748 5.595.406.591c.391.614.894.906 1.492.908.621-.012 1.064-.562 1.226-.755 0 0-.307-.27-.686-.72-.517-.614-1.214-1.755-1.24-1.803l-1.198 1.779Zm-3.205-1.955c0-2.08-1.52-3.64-3.52-3.64s-3.467 1.587-3.467 3.573a3.48 3.48 0 0 0 3.507 3.52c1.413 0 2.626-.84 3.253-2.293h-2.04l-.093.093c-.427.4-.72.533-1.227.533-.787 0-1.373-.506-1.453-1.266h4.986c.04-.214.054-.307.054-.52Zm-7.671-.219c0 .769.11 1.701.868 2.722l.056.069c-.306.526-.742.88-1.248.88-.399 0-.814-.211-1.138-.579a2.177 2.177 0 0 1-.538-1.441V6.409H9.86l-.001 5.421Zm9.283 3.46h-2.39l2.247-3.332-2.247-3.335h2.39l2.248 3.335-2.248 3.332Zm1.593-1.286Zm-17.162-.342c-.933 0-1.68-.773-1.68-1.72s.76-1.666 1.68-1.666c.92 0 1.68.733 1.68 1.68 0 .946-.733 1.706-1.68 1.706Zm18.361-1.974L24 8.622h-2.391l-.87 1.293 1.195 1.773Zm-9.404-.466c.16-.706.72-1.133 1.493-1.133.773 0 1.373.467 1.507 1.133h-3Z" />
        </svg>
      );
    case "Disney+":
      return (
        <svg {...svgProps} className={cls}>
          <path d="M4.5 12.5c1.8-4 6.4-6.4 11.2-5.6-.2-.6-.4-1.1-.7-1.6C10.3 5 6.2 7.4 4.1 11.3c.1.4.3.8.4 1.2z" />
        </svg>
      );
    case "Hulu":
      return (
        <svg {...svgProps} className={cls} style={{ color: "#1CE783" }}>
          <path d="M19.5 12.8V22H14.7V13.9C14.7 13.2 14.1 12.6 13.4 12.6H10.5C9.8 12.6 9.2 13.2 9.2 13.9V22H4.5V2H9.3V8.4C9.6 8.3 9.9 8.2 10.2 8.2H15C17.5 8.2 19.5 10.3 19.5 12.8Z" />
        </svg>
      );
    case "Peacock":
      return (
        <svg {...svgProps} className={cls}>
          <circle cx="7" cy="12" r="1.5" />
          <circle cx="10" cy="10" r="1.5" />
          <circle cx="10" cy="14" r="1.5" />
          <circle cx="13" cy="9" r="1.5" />
          <circle cx="13" cy="15" r="1.5" />
          <circle cx="16" cy="10" r="1.5" />
          <circle cx="16" cy="14" r="1.5" />
        </svg>
      );
    case "Paramount+":
      return (
        <svg {...svgProps} className={cls}>
          <path d="M12 5 5 17h14L12 5z" opacity="0.9" />
          <circle cx="16.5" cy="16.5" r="1" />
          <rect x="14.5" y="15.5" width="4" height="1" rx="0.5" />
        </svg>
      );
    case "Comedy Specials":
      return (
        <svg {...svgProps} className={cls}>
          <circle cx="9" cy="10" r="1.8" />
          <circle cx="15" cy="10" r="1.8" />
          <path
            d="M8 15.5c.5 1.5 2 2.5 4 2.5s3.5-1 4-2.5"
            stroke="currentColor"
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
          />
        </svg>
      );
    case "Theater":
      return (
        <svg {...svgProps} className={cls}>
          <path d="M4 6h16l-1.5 10H5.5L4 6z" fill="currentColor" opacity={0.9} />
          <path d="M4 6l3-2h3l-3 2H4zm6 0l3-2h3l-3 2h-3zm6 0l3-2h1l-2 2h-2z" fill="currentColor" />
          <rect x="6" y="9" width="2" height="1.5" rx="0.3" fill="currentColor" opacity="0.3" />
          <rect x="10" y="9" width="2" height="1.5" rx="0.3" fill="currentColor" opacity="0.3" />
          <rect x="14" y="9" width="2" height="1.5" rx="0.3" fill="currentColor" opacity="0.3" />
        </svg>
      );
    default:
      return (
        <svg {...svgProps} className={cls}>
          <rect x="4" y="6" width="16" height="12" rx="1.5" opacity="0.3" />
          <rect x="6" y="8" width="12" height="8" rx="1" />
          <circle cx="12" cy="12" r="1.5" />
        </svg>
      );
  }
}

export const StreamingIcon = memo(StreamingIconComponent);
