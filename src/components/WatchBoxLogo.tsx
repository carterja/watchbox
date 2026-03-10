"use client";

import { memo } from "react";

function WatchBoxLogoComponent({ className = "w-10 h-10" }: { className?: string }) {
  return (
    <div className={`${className} neon-glow`}>
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Outer box frame */}
        <rect 
          x="10" 
          y="15" 
          width="80" 
          height="70" 
          rx="8"
          stroke="currentColor" 
          strokeWidth="4" 
          fill="none"
          className="text-[#8b5cf6]"
        />
        
        {/* Film reel holes on sides */}
        <circle cx="15" cy="25" r="3" fill="currentColor" className="text-[#8b5cf6]" />
        <circle cx="15" cy="40" r="3" fill="currentColor" className="text-[#8b5cf6]" />
        <circle cx="15" cy="55" r="3" fill="currentColor" className="text-[#8b5cf6]" />
        <circle cx="15" cy="70" r="3" fill="currentColor" className="text-[#8b5cf6]" />
        
        <circle cx="85" cy="25" r="3" fill="currentColor" className="text-[#8b5cf6]" />
        <circle cx="85" cy="40" r="3" fill="currentColor" className="text-[#8b5cf6]" />
        <circle cx="85" cy="55" r="3" fill="currentColor" className="text-[#8b5cf6]" />
        <circle cx="85" cy="70" r="3" fill="currentColor" className="text-[#8b5cf6]" />
        
        {/* Play button in center */}
        <path 
          d="M 40 35 L 40 65 L 65 50 Z" 
          fill="currentColor"
          className="text-[#a78bfa]"
        />
      </svg>
    </div>
  );
}

export const WatchBoxLogo = memo(WatchBoxLogoComponent);