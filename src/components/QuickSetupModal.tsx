"use client";

import { useState, useEffect, useRef, useCallback, memo } from "react";
import { X, Save, Heart, UsersRound, User } from "lucide-react";
import type { MediaStatus, Viewer } from "@/types/media";
import { StreamingIcon } from "./StreamingIcon";

type Props = {
  mediaTitle: string;
  mediaType: "movie" | "tv";
  onClose: () => void;
  onSave: (data: {
    streamingService: string | null;
    viewer: Viewer | null;
    status: MediaStatus;
  }) => void;
};

const STATUS_OPTIONS: { value: MediaStatus; label: string }[] = [
  { value: "yet_to_start", label: "Unwatched" },
  { value: "in_progress", label: "In progress" },
  { value: "finished", label: "Finished" },
  { value: "rewatch", label: "Rewatch" },
];

const STREAMING_SERVICES = [
  "Theater",
  "Apple TV",
  "Netflix",
  "Plex",
  "HBO",
  "Prime",
  "Disney+",
  "Hulu",
  "Peacock",
  "Paramount+",
  "Comedy Specials",
];

const VIEWER_OPTIONS: { value: Viewer; label: string; Icon: typeof Heart }[] = [
  { value: "wife", label: "Wife", Icon: Heart },
  { value: "both", label: "Both", Icon: UsersRound },
  { value: "me", label: "Me", Icon: User },
];

function QuickSetupModalComponent({ mediaTitle, mediaType, onClose, onSave }: Props) {
  const [streamingService, setStreamingService] = useState<string | null>(null);
  const [viewer, setViewer] = useState<Viewer | null>("both");
  const [status, setStatus] = useState<MediaStatus>("in_progress");
  const [isClosing, setIsClosing] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const closeDoneRef = useRef(false);

  useEffect(() => {
    setIsMobile(typeof window !== "undefined" && window.innerWidth < 768);
  }, []);

  const handleClose = useCallback(() => {
    if (closeDoneRef.current) return;
    if (!isMobile) {
      onClose();
      return;
    }
    setIsClosing(true);
  }, [isMobile, onClose]);

  const handleAnimationEnd = (e: React.AnimationEvent<HTMLDivElement>) => {
    if (e.animationName !== "modal-slide-down") return;
    if (closeDoneRef.current) return;
    closeDoneRef.current = true;
    onClose();
  };

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [handleClose]);

  const handleSave = () => {
    onSave({ streamingService, viewer, status });
  };

  const handleSkip = () => {
    onSave({ streamingService: null, viewer: "both", status: "in_progress" });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center md:p-4 bg-black/80 backdrop-blur-sm"
      onClick={handleClose}
      role="dialog"
      aria-modal
      aria-labelledby="quick-setup-title"
    >
      <div
        className={`relative flex flex-col w-full max-w-md h-full md:h-auto md:max-h-[90vh] rounded-t-2xl md:rounded-2xl border-t md:border border-shelf-border bg-shelf-sidebar shadow-2xl overflow-hidden modal-slide-up ${isClosing ? "modal-slide-down" : ""}`}
        onClick={(e) => e.stopPropagation()}
        onAnimationEnd={handleAnimationEnd}
      >
        {/* Header */}
        <div className="shrink-0 p-4 md:p-6 border-b border-shelf-border bg-gradient-to-r from-shelf-sidebar to-shelf-card">
          <div className="flex items-center justify-between">
            <div>
              <h2 id="quick-setup-title" className="text-base md:text-lg font-bold text-white">Quick Setup</h2>
              <p className="text-xs md:text-sm text-shelf-muted mt-1 truncate">{mediaTitle}</p>
            </div>
            <button
              onClick={handleClose}
              className="p-2 rounded-lg hover:bg-shelf-card text-shelf-muted hover:text-white transition"
            >
              <X size={18} className="md:w-5 md:h-5" />
            </button>
          </div>
        </div>

        {/* Content - scrollable so footer always visible */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 md:p-6 space-y-4 md:space-y-6">
          {/* Streaming Service */}
          <div>
            <label className="block text-xs md:text-sm font-medium text-white mb-2 md:mb-3">
              Where are you watching?
            </label>
            <div className="grid grid-cols-2 gap-1.5 md:gap-2">
              {STREAMING_SERVICES.map((service) => (
                <button
                  key={service}
                  onClick={() => setStreamingService(service)}
                  className={`flex items-center gap-1.5 md:gap-2 px-2 md:px-3 py-1.5 md:py-2 rounded-lg text-xs md:text-sm font-medium transition ${
                    streamingService === service
                      ? "bg-[#8b5cf6] text-white shadow-lg shadow-[#8b5cf6]/20"
                      : "bg-shelf-card text-shelf-muted hover:text-white border border-shelf-border"
                  }`}
                >
                  <StreamingIcon service={service} className="w-3.5 h-3.5 md:w-4 md:h-4 shrink-0" />
                  <span className="truncate text-left">{service}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Viewer */}
          <div>
            <label className="block text-xs md:text-sm font-medium text-white mb-2 md:mb-3">Who&rsquo;s watching?</label>
            <div className="grid grid-cols-3 gap-1.5 md:gap-2">
              {VIEWER_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setViewer(option.value)}
                  className={`px-2 md:px-4 py-2 md:py-3 rounded-lg text-xs md:text-sm font-medium transition inline-flex flex-col items-center gap-1 md:gap-2 ${
                    viewer === option.value
                      ? option.value === "wife"
                        ? "bg-red-500/20 border-red-500/50 text-red-300 border-2"
                        : option.value === "both"
                        ? "bg-purple-500/20 border-purple-500/50 text-purple-300 border-2"
                        : "bg-sky-500/20 border-sky-500/50 text-sky-300 border-2"
                      : "bg-shelf-card text-shelf-muted hover:text-white border border-shelf-border"
                  }`}
                >
                  <option.Icon size={22} className="shrink-0" strokeWidth={2} />
                  <span className="text-xs">{option.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-xs md:text-sm font-medium text-white mb-2 md:mb-3">Current status?</label>
            <div className="flex gap-1.5 md:gap-2">
              {STATUS_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setStatus(option.value)}
                  className={`flex-1 px-2 md:px-3 py-1.5 md:py-2 rounded-lg text-[10px] md:text-xs font-medium transition ${
                    status === option.value
                      ? "bg-[#8b5cf6] text-white"
                      : "bg-shelf-card text-shelf-muted hover:text-white border border-shelf-border"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer - always visible, safe area on mobile */}
        <div className="shrink-0 flex items-center justify-between gap-2 md:gap-3 p-4 md:p-6 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] border-t border-shelf-border bg-shelf-card">
          <button
            onClick={handleSkip}
            className="px-3 md:px-4 py-2 rounded-lg text-shelf-muted hover:text-white transition text-xs md:text-sm"
          >
            Skip for now
          </button>
          <button
            onClick={handleSave}
            className="px-4 md:px-6 py-2 rounded-lg bg-[#8b5cf6] text-white text-sm md:text-base font-medium hover:bg-[#a78bfa] transition inline-flex items-center gap-2"
          >
            <Save size={14} className="md:w-4 md:h-4" />
            Save & Continue
          </button>
        </div>
      </div>
    </div>
  );
}

export const QuickSetupModal = memo(QuickSetupModalComponent);