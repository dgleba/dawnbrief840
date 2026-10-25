import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Episode } from '../types';
import { formatEpisodeDateTime } from '../lib/dateUtils';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Volume2, 
  VolumeX, 
  RotateCcw, 
  RotateCw, 
  ChevronUp, 
  ChevronDown, 
  Gauge, 
  ListOrdered,
  Radio,
  Clock,
  Calendar,
  Loader2
} from 'lucide-react';

interface AudioPlayerProps {
  currentEpisode: Episode | null;
  isPlaying: boolean;
  setIsPlaying: (val: boolean) => void;
  onPlayPause: () => void;
  onNextTrack: () => void;
  onPrevTrack: () => void;
  hasNext: boolean;
  hasPrev: boolean;
  autoAdvance: boolean;
  setAutoAdvance: (val: boolean) => void;
  playbackRate: number;
  setPlaybackRate: (rate: number) => void;
}

const SPEED_OPTIONS = [0.8, 1.0, 1.25, 1.5, 1.75, 2.0];

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  currentEpisode,
  isPlaying,
  setIsPlaying,
  onPlayPause,
  onNextTrack,
  onPrevTrack,
  hasNext,
  hasPrev,
  autoAdvance,
  setAutoAdvance,
  playbackRate,
  setPlaybackRate,
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const stallTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Screen WakeLock to prevent mobile CPU throttling during active playback
  useEffect(() => {
    let wakeLock: any = null;

    const requestWakeLock = async () => {
      if ('wakeLock' in navigator && isPlaying && document.visibilityState === 'visible') {
        try {
          wakeLock = await (navigator as any).wakeLock.request('screen');
        } catch {
          // WakeLock denied or unavailable on current device/battery state
        }
      }
    };

    if (isPlaying) {
      requestWakeLock();
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isPlaying) {
        requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (wakeLock) {
        wakeLock.release().catch(() => {});
      }
    };
  }, [isPlaying]);

  // Synchronize audio source and handle track transitions
  useEffect(() => {
    if (!audioRef.current || !currentEpisode) return;

    if (audioRef.current.src !== currentEpisode.audioUrl) {
      audioRef.current.src = currentEpisode.audioUrl;
      audioRef.current.playbackRate = playbackRate;
      setCurrentTime(0);

      if (isPlaying) {
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch((err) => {
            console.warn("Audio play transition caught:", err);
            // On mobile background transitions, retry immediately when data is ready
            const onCanPlayOnce = () => {
              if (isPlaying && audioRef.current) {
                audioRef.current.play().catch(() => {});
              }
              audioRef.current?.removeEventListener('canplay', onCanPlayOnce);
            };
            audioRef.current?.addEventListener('canplay', onCanPlayOnce);
          });
        }
      }
    }
  }, [currentEpisode]);

  // Synchronize play/pause state safely with promise protection
  useEffect(() => {
    if (!audioRef.current) return;

    if (isPlaying) {
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn("Audio playback play() error:", err);
        });
      }
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying]);

  // Synchronize playback speed
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  // Skip helper
  const handleSkip = useCallback((seconds: number) => {
    if (audioRef.current) {
      const targetTime = Math.min(Math.max(0, audioRef.current.currentTime + seconds), duration || 9999);
      audioRef.current.currentTime = targetTime;
      setCurrentTime(targetTime);
    }
  }, [duration]);

  // Setup MediaSession API for Pixel Android lockscreen, Bluetooth, and headphone media controls
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;

    if (!currentEpisode) {
      navigator.mediaSession.playbackState = 'none';
      return;
    }

    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentEpisode.title,
        artist: currentEpisode.podcastTitle,
        album: 'Dawnbrief News',
        artwork: [
          { src: currentEpisode.podcastArtwork || '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: currentEpisode.podcastArtwork || '/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      });

      // Keep Android system playback notification synchronized
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';

      // Explicit Play / Pause actions (avoids toggle flip desyncs on lockscreen)
      navigator.mediaSession.setActionHandler('play', () => {
        setIsPlaying(true);
        if (audioRef.current) {
          audioRef.current.play().catch(() => {});
        }
      });

      navigator.mediaSession.setActionHandler('pause', () => {
        setIsPlaying(false);
        if (audioRef.current) {
          audioRef.current.pause();
        }
      });

      navigator.mediaSession.setActionHandler('stop', () => {
        setIsPlaying(false);
        if (audioRef.current) {
          audioRef.current.pause();
        }
      });

      navigator.mediaSession.setActionHandler('previoustrack', hasPrev ? () => onPrevTrack() : null);
      navigator.mediaSession.setActionHandler('nexttrack', hasNext ? () => onNextTrack() : null);
      navigator.mediaSession.setActionHandler('seekbackward', () => handleSkip(-15));
      navigator.mediaSession.setActionHandler('seekforward', () => handleSkip(30));

      if ('seekto' in navigator.mediaSession) {
        navigator.mediaSession.setActionHandler('seekto', (details) => {
          if (details.seekTime !== undefined && audioRef.current) {
            audioRef.current.currentTime = details.seekTime;
            setCurrentTime(details.seekTime);
          }
        });
      }
    } catch (e) {
      console.warn("MediaSession API setup error:", e);
    }
  }, [currentEpisode, isPlaying, hasNext, hasPrev, setIsPlaying, onNextTrack, onPrevTrack, handleSkip]);

  // Synchronize MediaSession position state for Android lockscreen scrubber
  useEffect(() => {
    if (!('mediaSession' in navigator) || !('setPositionState' in navigator.mediaSession)) return;

    if (duration > 0 && !isNaN(duration) && !isNaN(currentTime) && currentTime <= duration) {
      try {
        navigator.mediaSession.setPositionState({
          duration: Math.max(1, duration),
          playbackRate: playbackRate || 1,
          position: Math.max(0, Math.min(currentTime, duration)),
        });
      } catch {
        // Ignored if position slightly exceeds duration on track boundaries
      }
    }
  }, [currentTime, duration, playbackRate]);

  // Formatting seconds into MM:SS or HH:MM:SS
  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '0:00';
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    const sStr = s < 10 ? `0${s}` : `${s}`;

    if (h > 0) {
      const mStr = m < 10 ? `0${m}` : `${m}`;
      return `${h}:${mStr}:${sStr}`;
    }
    return `${m}:${sStr}`;
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      if (audioRef.current.duration && !isNaN(audioRef.current.duration)) {
        setDuration(audioRef.current.duration);
      }
    }
  };

  // Native Audio Event Handlers for rock-solid Android mobile lifecycle
  const handleNativePlay = () => {
    setIsBuffering(false);
    if (!isPlaying) {
      setIsPlaying(true);
    }
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = 'playing';
    }
  };

  const handleNativePause = () => {
    // If paused natively (e.g. system interrupt / headphone disconnect)
    if (isPlaying && audioRef.current && !audioRef.current.seeking && audioRef.current.readyState > 2) {
      setIsPlaying(false);
    }
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = 'paused';
    }
  };

  const handleWaiting = () => {
    setIsBuffering(true);
  };

  const handlePlaying = () => {
    setIsBuffering(false);
    if (stallTimerRef.current) {
      clearTimeout(stallTimerRef.current);
      stallTimerRef.current = null;
    }
  };

  // Auto-recover from stalls and buffering hangs on mobile network drops
  const handleStalled = () => {
    if (!isPlaying || !audioRef.current) return;
    if (stallTimerRef.current) clearTimeout(stallTimerRef.current);

    stallTimerRef.current = setTimeout(() => {
      if (isPlaying && audioRef.current && (audioRef.current.paused || audioRef.current.readyState < 3)) {
        console.log("Auto-resuming stalled mobile playback...");
        audioRef.current.play().catch(() => {});
      }
    }, 1500);
  };

  // Auto-recover from network errors without losing playback progress
  const handleError = () => {
    if (!isPlaying || !audioRef.current || !currentEpisode) return;
    console.warn("Audio playback error encountered, attempting auto-recovery...");
    const savedTime = audioRef.current.currentTime;
    setTimeout(() => {
      if (audioRef.current && isPlaying) {
        audioRef.current.src = currentEpisode.audioUrl;
        audioRef.current.currentTime = savedTime;
        audioRef.current.play().catch((e) => console.error("Recovery retry failed:", e));
      }
    }, 1000);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    setIsMuted(val === 0);
    if (audioRef.current) {
      audioRef.current.volume = val;
    }
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    if (isMuted) {
      audioRef.current.volume = volume || 1;
      setIsMuted(false);
    } else {
      audioRef.current.volume = 0;
      setIsMuted(true);
    }
  };

  // Episode ended callback -> Auto Advance to next news podcast in queue
  const handleEnded = () => {
    if (autoAdvance && hasNext) {
      onNextTrack();
    } else {
      setIsPlaying(false);
    }
  };

  if (!currentEpisode) return null;

  return (
    <>
      {/* HTML5 Audio element configured for Android PWA background playback */}
      <audio
        ref={audioRef}
        preload="auto"
        playsInline
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        onLoadedMetadata={handleTimeUpdate}
        onPlay={handleNativePlay}
        onPause={handleNativePause}
        onWaiting={handleWaiting}
        onPlaying={handlePlaying}
        onStalled={handleStalled}
        onError={handleError}
      />

      {/* Persistent Audio Player Container */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#6B705C] text-white shadow-2xl transition-all">
        
        {/* Progress Scrubber Bar & Timestamps */}
        <div className="w-full bg-white/10 pt-2 pb-1 px-4 sm:px-6 flex flex-col gap-1">
          <div className="w-full bg-white/20 h-2 relative group cursor-pointer rounded-full overflow-hidden">
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={currentTime}
              onChange={handleSeek}
              aria-label="Audio progress slider"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            <div
              className="h-full bg-white rounded-r-full transition-all duration-100"
              style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono text-white/90 font-medium px-0.5">
            <div className="flex items-center gap-1">
              <span className="text-white/70 text-[10px] uppercase tracking-wider font-sans font-semibold">Played:</span>
              <span className="font-bold text-white">{formatTime(currentTime)}</span>
              {isBuffering && (
                <span className="flex items-center gap-1 text-[10px] text-amber-200 ml-1 font-sans">
                  <Loader2 className="w-2.5 h-2.5 animate-spin" />
                  <span>Buffering</span>
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <span className="text-white/70 text-[10px] uppercase tracking-wider font-sans font-semibold">Total:</span>
              <span className="font-bold text-white">{formatTime(duration)}</span>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 py-2.5 flex items-center justify-between gap-4">
          
          {/* Track Info (Left) */}
          <div 
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer group"
          >
            <div className="relative w-12 h-12 rounded-xl bg-white/10 overflow-hidden flex-shrink-0 border border-white/20 shadow-sm">
              {currentEpisode.podcastArtwork ? (
                <img
                  src={currentEpisode.podcastArtwork}
                  alt={currentEpisode.podcastTitle}
                  className="w-full h-full object-cover group-hover:scale-105 transition"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white/60">
                  <Radio className="w-5 h-5" />
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold tracking-wider text-white uppercase bg-white/20 px-2 py-0.5 rounded-full border border-white/30">
                  Now Playing
                </span>
                <span className="text-xs text-white/80 font-medium truncate">
                  {currentEpisode.podcastTitle}
                </span>
              </div>
              <h4 className="font-bold text-sm text-white line-clamp-1 group-hover:text-white/90 transition">
                {currentEpisode.title}
              </h4>
            </div>

            <button className="sm:hidden text-white/80 p-1" aria-label="Toggle expanded player">
              {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
            </button>
          </div>

          {/* Main Controls (Center) */}
          <div className="hidden sm:flex flex-col items-center gap-1">
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Skip Back 15s */}
              <button
                onClick={() => handleSkip(-15)}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-white/90 hover:text-white bg-white/10 hover:bg-white/20 transition rounded-xl border border-white/20 shadow-xs"
                title="Skip back 15 seconds"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>-15s</span>
              </button>

              {/* Prev Track */}
              <button
                onClick={onPrevTrack}
                disabled={!hasPrev}
                className="p-2 text-white/80 hover:text-white disabled:opacity-30 transition rounded-xl hover:bg-white/10"
                title="Previous podcast episode"
              >
                <SkipBack className="w-5 h-5" />
              </button>

              {/* Play / Pause Primary Button */}
              <button
                onClick={onPlayPause}
                className="w-11 h-11 rounded-full bg-white text-[#6B705C] font-bold flex items-center justify-center shadow-md hover:bg-[#F9F7F2] transition transform active:scale-95 relative"
                aria-label={isPlaying ? "Pause" : "Play"}
              >
                {isBuffering ? (
                  <Loader2 className="w-5 h-5 animate-spin text-[#6B705C]" />
                ) : isPlaying ? (
                  <Pause className="w-5 h-5 fill-[#6B705C]" />
                ) : (
                  <Play className="w-5 h-5 fill-[#6B705C] ml-0.5" />
                )}
              </button>

              {/* Next Track */}
              <button
                onClick={onNextTrack}
                disabled={!hasNext}
                className="p-2 text-white/80 hover:text-white disabled:opacity-30 transition rounded-xl hover:bg-white/10"
                title="Next podcast episode"
              >
                <SkipForward className="w-5 h-5" />
              </button>

              {/* Skip Forward 15s */}
              <button
                onClick={() => handleSkip(15)}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-white/90 hover:text-white bg-white/10 hover:bg-white/20 transition rounded-xl border border-white/20 shadow-xs"
                title="Skip forward 15 seconds"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>+15s</span>
              </button>

              {/* Skip Forward 30s */}
              <button
                onClick={() => handleSkip(30)}
                className="hidden lg:flex items-center gap-1 px-2 py-1 text-xs font-semibold text-white/70 hover:text-white transition rounded-lg hover:bg-white/10"
                title="Skip forward 30 seconds"
              >
                <span>+30s</span>
              </button>
            </div>

            {/* Time Stamp */}
            <div className="text-[11px] font-mono text-white/70 flex items-center gap-1.5">
              <span>{formatTime(currentTime)}</span>
              <span>/</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Right Tools (Speed, Auto-Advance, Volume) */}
          <div className="flex items-center gap-3">
            {/* Mobile Collapsed Quick Skip & Play/Pause */}
            <div className="flex sm:hidden items-center gap-1.5">
              <button
                onClick={() => handleSkip(-15)}
                className="px-2 py-1 rounded-lg text-xs font-bold text-white bg-white/10 hover:bg-white/20 border border-white/20 active:scale-95 transition"
                title="Skip back 15s"
              >
                -15s
              </button>
              <button
                onClick={onPlayPause}
                className="w-10 h-10 rounded-full bg-white text-[#6B705C] font-bold flex items-center justify-center shadow"
                aria-label={isPlaying ? "Pause" : "Play"}
              >
                {isBuffering ? (
                  <Loader2 className="w-4 h-4 animate-spin text-[#6B705C]" />
                ) : isPlaying ? (
                  <Pause className="w-4 h-4 fill-current" />
                ) : (
                  <Play className="w-4 h-4 fill-current ml-0.5" />
                )}
              </button>
              <button
                onClick={() => handleSkip(15)}
                className="px-2 py-1 rounded-lg text-xs font-bold text-white bg-white/10 hover:bg-white/20 border border-white/20 active:scale-95 transition"
                title="Skip forward 15s"
              >
                +15s
              </button>
            </div>

            {/* Speed Multiplier */}
            <div className="hidden lg:flex items-center gap-1 bg-white/10 p-1 rounded-xl border border-white/20 text-xs">
              <Gauge className="w-3.5 h-3.5 text-white ml-1" />
              {SPEED_OPTIONS.map((rate) => (
                <button
                  key={rate}
                  onClick={() => setPlaybackRate(rate)}
                  className={`px-2 py-0.5 rounded-lg font-bold transition ${
                    playbackRate === rate
                      ? 'bg-white text-[#6B705C]'
                      : 'text-white/70 hover:text-white'
                  }`}
                >
                  {rate}x
                </button>
              ))}
            </div>

            {/* Auto-Advance Toggle */}
            <button
              onClick={() => setAutoAdvance(!autoAdvance)}
              title="Auto-play next podcast in queue"
              className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                autoAdvance
                  ? 'bg-white/20 border-white/40 text-white'
                  : 'bg-white/10 border-white/20 text-white/60'
              }`}
            >
              <ListOrdered className="w-3.5 h-3.5" />
              <span>Auto-Play Queue</span>
            </button>

            {/* Volume Control */}
            <div className="hidden md:flex items-center gap-2">
              <button
                onClick={toggleMute}
                className="text-white/80 hover:text-white transition"
              >
                {isMuted ? <VolumeX className="w-4 h-4 text-rose-300" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-16 h-1 bg-white/30 rounded-lg accent-white cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Mobile Full Screen Expanded Player Card */}
        {isExpanded && (
          <div className="sm:hidden border-t border-white/20 p-6 bg-[#6B705C] space-y-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white uppercase tracking-widest">
                Playing News Briefing
              </span>
              <button
                onClick={() => setIsExpanded(false)}
                className="p-1 rounded-lg text-white/80"
              >
                <ChevronDown className="w-6 h-6" />
              </button>
            </div>

            {/* Artwork */}
            <div className="w-48 h-48 rounded-2xl mx-auto overflow-hidden bg-white/10 border border-white/20 shadow-2xl">
              <img
                src={currentEpisode.podcastArtwork}
                alt={currentEpisode.podcastTitle}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Episode Meta */}
            <div className="text-center space-y-1.5">
              <h3 className="font-bold text-lg text-white line-clamp-2">
                {currentEpisode.title}
              </h3>
              <p className="text-sm font-medium text-white/80">
                {currentEpisode.podcastTitle}
              </p>
              {currentEpisode.pubDate && (
                <div className="flex items-center justify-center gap-1.5 text-xs text-white/70 font-mono">
                  <Calendar className="w-3.5 h-3.5 text-white/60" />
                  <span>{formatEpisodeDateTime(currentEpisode.pubDate).fullDateTime}</span>
                  <span className="px-1.5 py-0.5 rounded bg-white/15 text-[10px] font-sans font-bold text-white">
                    {formatEpisodeDateTime(currentEpisode.pubDate).timeAgo}
                  </span>
                </div>
              )}
            </div>

            {/* Mobile Expanded Progress Bar & Min/Sec Timestamps */}
            <div className="space-y-1.5 px-2">
              <div className="w-full bg-white/20 h-2.5 relative rounded-full overflow-hidden cursor-pointer">
                <input
                  type="range"
                  min={0}
                  max={duration || 100}
                  value={currentTime}
                  onChange={handleSeek}
                  aria-label="Audio progress slider"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div
                  className="h-full bg-white rounded-r-full transition-all duration-100"
                  style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-xs font-mono text-white/90">
                <div className="flex items-center gap-1">
                  <span className="text-white/70 text-[10px] font-sans uppercase font-medium">Played:</span>
                  <span className="font-bold">{formatTime(currentTime)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-white/70 text-[10px] font-sans uppercase font-medium">Total:</span>
                  <span className="font-bold">{formatTime(duration)}</span>
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => handleSkip(-15)}
                className="flex items-center gap-1 px-3 py-2 text-xs font-bold text-white bg-white/10 hover:bg-white/20 rounded-xl border border-white/20 transition active:scale-95"
                title="Skip back 15 seconds"
              >
                <RotateCcw className="w-4 h-4" />
                <span>-15s</span>
              </button>

              <button
                onClick={onPrevTrack}
                disabled={!hasPrev}
                className="p-2 text-white/80 hover:text-white disabled:opacity-30 transition"
                title="Previous episode"
              >
                <SkipBack className="w-6 h-6" />
              </button>

              <button
                onClick={onPlayPause}
                className="w-14 h-14 rounded-full bg-white text-[#6B705C] font-bold flex items-center justify-center shadow-lg transition transform active:scale-95"
              >
                {isBuffering ? (
                  <Loader2 className="w-7 h-7 animate-spin text-[#6B705C]" />
                ) : isPlaying ? (
                  <Pause className="w-7 h-7 fill-current" />
                ) : (
                  <Play className="w-7 h-7 fill-current ml-0.5" />
                )}
              </button>

              <button
                onClick={onNextTrack}
                disabled={!hasNext}
                className="p-2 text-white/80 hover:text-white disabled:opacity-30 transition"
                title="Next episode"
              >
                <SkipForward className="w-6 h-6" />
              </button>

              <button
                onClick={() => handleSkip(15)}
                className="flex items-center gap-1 px-3 py-2 text-xs font-bold text-white bg-white/10 hover:bg-white/20 rounded-xl border border-white/20 transition active:scale-95"
                title="Skip forward 15 seconds"
              >
                <RotateCw className="w-4 h-4" />
                <span>+15s</span>
              </button>
            </div>

            {/* Speed selection on mobile */}
            <div className="flex items-center justify-center gap-2 pt-2">
              <span className="text-xs text-white/80">Speed:</span>
              <div className="flex items-center gap-1.5">
                {SPEED_OPTIONS.map((rate) => (
                  <button
                    key={rate}
                    onClick={() => setPlaybackRate(rate)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                      playbackRate === rate
                        ? 'bg-white text-[#6B705C]'
                        : 'bg-white/10 text-white'
                    }`}
                  >
                    {rate}x
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

    </>
  );
};
