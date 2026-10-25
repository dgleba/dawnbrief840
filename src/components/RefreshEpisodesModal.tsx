import React, { useEffect, useRef } from 'react';
import { RefreshCw, Play, X, Radio } from 'lucide-react';

interface RefreshEpisodesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmRefreshAndPlay: () => void;
  isRefreshing: boolean;
  briefingCount?: number;
}

export const RefreshEpisodesModal: React.FC<RefreshEpisodesModalProps> = ({
  isOpen,
  onClose,
  onConfirmRefreshAndPlay,
  isRefreshing,
  briefingCount = 0,
}) => {
  const yesButtonRef = useRef<HTMLButtonElement | null>(null);

  // Focus the "Yes" button when the modal opens
  useEffect(() => {
    if (isOpen) {
      // Small timeout to allow DOM to render and focus
      const timer = setTimeout(() => {
        yesButtonRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Keyboard shortcut listener (Enter/Y for Yes, Esc/N for No)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isRefreshing) return;

      if (e.key === 'Escape' || e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'y' || e.key === 'Y') {
        e.preventDefault();
        onConfirmRefreshAndPlay();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isRefreshing, onClose, onConfirmRefreshAndPlay]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="refresh-episodes-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="bg-[#F9F7F2] border-2 border-[#DED9CE] w-full max-w-md rounded-[28px] shadow-2xl overflow-hidden p-6 sm:p-7 relative flex flex-col items-center animate-in zoom-in-95 duration-200">
        
        {/* Close "X" button at top right */}
        <button
          onClick={onClose}
          disabled={isRefreshing}
          aria-label="Close dialog"
          className="absolute top-4 right-4 p-2 rounded-xl text-[#4A4A3F]/60 hover:text-[#4A4A3F] hover:bg-[#EDE9DF] transition disabled:opacity-40"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Icon */}
        <div className="w-16 h-16 rounded-2xl bg-[#8C927B]/15 border border-[#8C927B]/30 flex items-center justify-center mb-4 text-[#6B705C] shadow-inner">
          <RefreshCw className={`w-8 h-8 ${isRefreshing ? 'animate-spin' : ''}`} />
        </div>

        {/* Title */}
        <h3
          id="refresh-episodes-title"
          className="text-xl sm:text-2xl font-bold text-[#4A4A3F] font-serif text-center tracking-tight"
        >
          Refresh episodes?
        </h3>

        {/* Description */}
        <p className="text-sm text-[#4A4A3F]/80 text-center mt-2.5 leading-relaxed max-w-sm">
          Check for the newest podcast episodes and automatically start playing your briefing updates.
        </p>

        {/* Queue badge if available */}
        {briefingCount > 0 && (
          <div className="mt-3.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EDE9DF] border border-[#DED9CE] text-xs font-semibold text-[#6B705C]">
            <Radio className="w-3.5 h-3.5" />
            <span>{briefingCount} {briefingCount === 1 ? 'podcast' : 'podcasts'} in queue</span>
          </div>
        )}

        {/* Action Buttons: Yes & No */}
        <div className="flex items-center gap-3 w-full mt-6">
          {/* No button */}
          <button
            type="button"
            onClick={onClose}
            disabled={isRefreshing}
            className="flex-1 py-3.5 px-5 rounded-2xl bg-[#EDE9DF] hover:bg-[#DED9CE] active:scale-[0.98] text-[#4A4A3F] font-bold text-base border border-[#DED9CE] shadow-xs transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <X className="w-5 h-5 text-[#6B705C]" />
            <span>No</span>
          </button>

          {/* Yes button */}
          <button
            ref={yesButtonRef}
            type="button"
            onClick={onConfirmRefreshAndPlay}
            disabled={isRefreshing}
            className="flex-1 py-3.5 px-5 rounded-2xl bg-[#8C927B] hover:bg-[#6B705C] active:scale-[0.98] text-white font-bold text-base shadow-md transition flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-60"
          >
            {isRefreshing ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span>Updating...</span>
              </>
            ) : (
              <>
                <Play className="w-5 h-5 fill-white" />
                <span>Yes</span>
              </>
            )}
          </button>
        </div>

        {/* Status text during refresh */}
        {isRefreshing && (
          <div className="mt-4 flex items-center gap-2 text-xs font-medium text-[#6B705C] animate-pulse">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            <span>Fetching latest RSS feeds and starting playback...</span>
          </div>
        )}

        {/* Shortcut hint */}
        {!isRefreshing && (
          <p className="text-[11px] text-[#4A4A3F]/50 text-center mt-3.5 font-medium">
            Press <kbd className="px-1.5 py-0.5 rounded bg-[#EDE9DF] text-[#4A4A3F] border border-[#DED9CE] text-[10px]">Enter</kbd> or <kbd className="px-1 py-0.5 rounded bg-[#EDE9DF] text-[#4A4A3F] border border-[#DED9CE] text-[10px]">Y</kbd> for Yes &bull; <kbd className="px-1.5 py-0.5 rounded bg-[#EDE9DF] text-[#4A4A3F] border border-[#DED9CE] text-[10px]">Esc</kbd> or <kbd className="px-1 py-0.5 rounded bg-[#EDE9DF] text-[#4A4A3F] border border-[#DED9CE] text-[10px]">N</kbd> for No
          </p>
        )}
      </div>
    </div>
  );
};
