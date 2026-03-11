"use client";

import { memo } from "react";

/**
 * Animated WatchBox logo: builds the watchbox (box → film reels → play) with a
 * neon gradient and glow, similar to LunchBox's logo animation.
 */
function WatchBoxLogoComponent({ className = "w-10 h-10" }: { className?: string }) {
  return (
    <div className={className}>
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="block w-full h-full">
        <defs>
          <linearGradient id="watchbox-neon-gradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#a78bfa" />
          </linearGradient>
          <filter id="watchbox-neon-glow" x="-50%" y="-50%" width="200%" height="200%" colorInterpolationFilters="sRGB">
            <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor="#8b5cf6" floodOpacity="0.8" />
            <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#a78bfa" floodOpacity="0.5" />
          </filter>
        </defs>

        {/* Outer box frame – draws on first */}
        <rect
          x="10"
          y="15"
          width="80"
          height="70"
          rx="8"
          fill="none"
          stroke="url(#watchbox-neon-gradient)"
          strokeWidth="4"
          filter="url(#watchbox-neon-glow)"
          style={{
            strokeDasharray: 300,
            strokeDashoffset: 300,
            animation: "watchbox-draw-box 1s ease-out forwards",
          }}
        />

        {/* Film reel holes – appear after box */}
        {[
          [15, 25],
          [15, 40],
          [15, 55],
          [15, 70],
          [85, 25],
          [85, 40],
          [85, 55],
          [85, 70],
        ].map(([cx, cy], i) => (
          <circle
            key={`${cx}-${cy}`}
            cx={cx}
            cy={cy}
            r="3"
            fill="url(#watchbox-neon-gradient)"
            filter="url(#watchbox-neon-glow)"
            style={{
              opacity: 0,
              animation: "watchbox-fade-in 0.25s ease-out forwards",
              animationDelay: `${1 + i * 0.06}s`,
            }}
          />
        ))}

        {/* Play triangle – draws on last */}
        <path
          d="M 40 35 L 40 65 L 65 50 Z"
          fill="url(#watchbox-neon-gradient)"
          filter="url(#watchbox-neon-glow)"
          style={{
            opacity: 0,
            animation: "watchbox-fade-in 0.5s ease-out forwards",
            animationDelay: "1.55s",
          }}
        />
      </svg>
    </div>
  );
}

export const WatchBoxLogo = memo(WatchBoxLogoComponent);
