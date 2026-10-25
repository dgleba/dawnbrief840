import React, { useEffect, useState, useCallback } from 'react';
import { Podcast, Episode, BriefingItem, BriefingPreset, ExecutiveSummary, SmallTextSize } from './types';
import { POPULAR_NEWS_PODCASTS, PRESET_BRIEFINGS } from './data/presets';
import { DEFAULT_BRIEFING_ITEMS, DEFAULT_SETTINGS, DEFAULT_PLAYBACK_STATE } from './data/defaultData';
import { Navbar } from './components/Navbar';
import { MyBriefing } from './components/MyBriefing';
import { PodcastSearch } from './components/PodcastSearch';
import { EpisodeListModal } from './components/EpisodeListModal';
import { AudioPlayer } from './components/AudioPlayer';
import { AISummaryView } from './components/AISummaryView';
import { BackupModal } from './components/BackupModal';
import { RefreshEpisodesModal } from './components/RefreshEpisodesModal';
import {
  loadBriefingItemsFromStorage,
  saveBriefingItemsToStorage,
  loadSettingsFromStorage,
  saveSettingsToStorage,
  loadAISummaryFromStorage,
  saveAISummaryToStorage,
  loadPlaybackStateFromStorage,
  savePlaybackStateToStorage,
  applySmallTextSize,
} from './lib/storage';

export default function App() {
  const [activeTab, setActiveTab] = useState<'briefing' | 'search' | 'summary'>(DEFAULT_SETTINGS.activeTab || 'briefing');
  const [briefingItems, setBriefingItems] = useState<BriefingItem[]>(DEFAULT_BRIEFING_ITEMS);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [isRefreshModalOpen, setIsRefreshModalOpen] = useState(true);
  const [smallTextSize, setSmallTextSize] = useState<SmallTextSize>(DEFAULT_SETTINGS.smallTextSize || 'larger');

  // Selected episode modal state
  const [selectedPodcastForEpisodes, setSelectedPodcastForEpisodes] = useState<{ id: string; obj?: Podcast } | null>(null);

  // Audio Player state
  const [currentTrackIndex, setCurrentTrackIndex] = useState<number | null>(DEFAULT_PLAYBACK_STATE.trackIndex ?? 6);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState<number>(DEFAULT_SETTINGS.playbackRate || 1.25);
  const [autoAdvance, setAutoAdvance] = useState<boolean>(DEFAULT_SETTINGS.autoAdvance ?? true);
  const [sessionAddPosition, setSessionAddPosition] = useState<'top' | 'bottom'>(DEFAULT_SETTINGS.addPosition || 'bottom');

  // AI Summary State
  const [executiveSummary, setExecutiveSummary] = useState<ExecutiveSummary | null>(null);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);

  // 1. Initial Load from Permanent LocalStorage
  useEffect(() => {
    // Load Settings
    const savedSettings = loadSettingsFromStorage();
    setPlaybackRate(savedSettings.playbackRate);
    setAutoAdvance(savedSettings.autoAdvance);
    setActiveTab(savedSettings.activeTab || 'briefing');
    if (savedSettings.addPosition) {
      setSessionAddPosition(savedSettings.addPosition);
    }
    const activeSmallText = savedSettings.smallTextSize || 'larger';
    setSmallTextSize(activeSmallText);
    applySmallTextSize(activeSmallText);

    // Load AI Executive Summary
    const savedSummary = loadAISummaryFromStorage();
    if (savedSummary) {
      setExecutiveSummary(savedSummary);
    }

    // Load Briefing Items Queue
    const storedItems = loadBriefingItemsFromStorage();
    if (storedItems && storedItems.length > 0) {
      setBriefingItems(storedItems.map((i) => ({ ...i, isLoadingEpisode: false })));
    } else {
      setBriefingItems(DEFAULT_BRIEFING_ITEMS);
      saveBriefingItemsToStorage(DEFAULT_BRIEFING_ITEMS);
    }

    // Load last playback state
    const lastPlayback = loadPlaybackStateFromStorage();
    if (lastPlayback && typeof lastPlayback.trackIndex === 'number') {
      setCurrentTrackIndex(lastPlayback.trackIndex);
    } else if (DEFAULT_PLAYBACK_STATE && typeof DEFAULT_PLAYBACK_STATE.trackIndex === 'number') {
      setCurrentTrackIndex(DEFAULT_PLAYBACK_STATE.trackIndex);
    }
  }, []);

  // Sync Briefing Queue to LocalStorage whenever modified
  useEffect(() => {
    if (briefingItems.length > 0) {
      saveBriefingItemsToStorage(briefingItems);
    }
  }, [briefingItems]);

  // Sync Settings to LocalStorage
  useEffect(() => {
    saveSettingsToStorage({ 
      playbackRate, 
      autoAdvance, 
      activeTab, 
      addPosition: sessionAddPosition,
      smallTextSize 
    });
  }, [playbackRate, autoAdvance, activeTab, sessionAddPosition, smallTextSize]);

  // Handle small text size change
  const handleSmallTextSizeChange = (size: SmallTextSize) => {
    setSmallTextSize(size);
    applySmallTextSize(size);
    saveSettingsToStorage({ smallTextSize: size });
  };

  // Sync AI Executive Summary to LocalStorage
  useEffect(() => {
    saveAISummaryToStorage(executiveSummary);
  }, [executiveSummary]);

  // Sync Playback Position to LocalStorage
  useEffect(() => {
    savePlaybackStateToStorage({
      trackIndex: currentTrackIndex,
      lastEpisodeId: null,
      currentTime: 0,
    });
  }, [currentTrackIndex]);

  // Fetch Latest Episodes for all items in queue
  const fetchEpisodesForQueue = useCallback(async (itemsToFetch: BriefingItem[]): Promise<BriefingItem[]> => {
    setIsRefreshing(true);

    try {
      const updatedItems = await Promise.all(
        itemsToFetch.map(async (item) => {
          try {
            const res = await fetch(`/api/podcasts/feed?url=${encodeURIComponent(item.podcast.feedUrl)}`);
            if (!res.ok) throw new Error("RSS Feed error");
            const data = await res.json();

            const ep = data.latestEpisode as Episode | null;
            return {
              ...item,
              latestEpisode: ep || item.latestEpisode || undefined,
              isLoadingEpisode: false,
              error: ep ? undefined : (item.latestEpisode ? undefined : "No recent episode found")
            };
          } catch (err: any) {
            return {
              ...item,
              isLoadingEpisode: false,
              error: item.latestEpisode ? undefined : "Failed to load RSS feed"
            };
          }
        })
      );

      setBriefingItems(updatedItems);
      saveBriefingItemsToStorage(updatedItems);
      return updatedItems;
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // Yes: refresh episodes and play new updates
  const handleConfirmRefreshAndPlay = async () => {
    try {
      // 1. Prime / resume Web Audio immediately within user interaction gesture
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx();
          if (ctx.state === 'suspended') {
            await ctx.resume();
          }
        }
      } catch (e) {
        // audio context priming non-fatal
      }

      // 2. Fetch fresh episodes from feeds
      const currentQueue = briefingItems.length > 0 
        ? briefingItems 
        : (loadBriefingItemsFromStorage() || []);
      const updated = await fetchEpisodesForQueue(currentQueue);

      // 3. Play the newly updated briefing from the first available episode
      const playableIndex = updated.findIndex((i) => i.enabled && i.latestEpisode?.audioUrl);
      if (playableIndex !== -1) {
        setCurrentTrackIndex(playableIndex);
        setIsPlaying(true);
      } else if (updated.length > 0) {
        setCurrentTrackIndex(0);
        setIsPlaying(true);
      }
    } catch (err) {
      console.error("Failed to refresh episodes and play:", err);
    } finally {
      setIsRefreshModalOpen(false);
    }
  };

  // No: stop and close panel
  const handleCancelRefreshModal = () => {
    setBriefingItems((prev) =>
      prev.map((i) => ({ ...i, isLoadingEpisode: false }))
    );
    setIsRefreshModalOpen(false);
  };

  // Enabled items queue
  const enabledItems = briefingItems.filter((i) => i.enabled && i.latestEpisode);
  const currentEpisode: Episode | null =
    currentTrackIndex !== null && enabledItems[currentTrackIndex]
      ? enabledItems[currentTrackIndex].latestEpisode || null
      : null;

  // Total briefing duration calculation in seconds
  const totalDurationSeconds = enabledItems.reduce((acc, item) => {
    if (!item.latestEpisode?.duration) return acc;
    const durStr = String(item.latestEpisode.duration);
    if (durStr.includes('m')) {
      const match = durStr.match(/(\d+)m/);
      if (match) return acc + parseInt(match[1], 10) * 60;
    }
    const num = parseInt(durStr, 10);
    return acc + (isNaN(num) ? 300 : num);
  }, 0);

  // Playback Control Handlers
  const handlePlayStart = (enabledQueueIndex: number = 0) => {
    if (enabledItems.length === 0) return;
    setCurrentTrackIndex(enabledQueueIndex);
    setIsPlaying(true);
  };

  const handlePlayPause = () => {
    if (currentTrackIndex === null && enabledItems.length > 0) {
      setCurrentTrackIndex(0);
      setIsPlaying(true);
    } else {
      setIsPlaying(!isPlaying);
    }
  };

  const handleNextTrack = () => {
    if (currentTrackIndex !== null && currentTrackIndex < enabledItems.length - 1) {
      setCurrentTrackIndex(currentTrackIndex + 1);
      setIsPlaying(true);
    } else {
      setIsPlaying(false);
    }
  };

  const handlePrevTrack = () => {
    if (currentTrackIndex !== null && currentTrackIndex > 0) {
      setCurrentTrackIndex(currentTrackIndex - 1);
      setIsPlaying(true);
    }
  };

  // Briefing Queue Reordering & Editing
  const handleMoveItem = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= briefingItems.length) return;
    const updated = [...briefingItems];
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, moved);
    setBriefingItems(updated);
  };

  const handleToggleItem = (id: string) => {
    setBriefingItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, enabled: !i.enabled } : i))
    );
  };

  const handleRemoveItem = (id: string) => {
    setBriefingItems((prev) => prev.filter((i) => i.id !== id));
  };

  const handleAddPodcast = (podcast: Podcast, position?: 'top' | 'bottom') => {
    if (briefingItems.some((i) => i.podcast.id === podcast.id)) return;

    const targetPosition = position || sessionAddPosition;

    const newItem: BriefingItem = {
      id: podcast.id,
      podcast,
      enabled: true,
      isLoadingEpisode: true,
    };

    const newItems = targetPosition === 'top'
      ? [newItem, ...briefingItems]
      : [...briefingItems, newItem];

    setBriefingItems(newItems);
    fetchEpisodesForQueue(newItems);
  };

  const handleLoadPreset = (preset: BriefingPreset) => {
    const newItems: BriefingItem[] = preset.podcasts.map((p) => ({
      id: p.id,
      podcast: p,
      enabled: true,
      isLoadingEpisode: true,
    }));
    setBriefingItems(newItems);
    fetchEpisodesForQueue(newItems);
  };

  // AI Summary Handler
  const handleGenerateAISummary = async () => {
    const activeEpisodes = briefingItems
      .filter((i) => i.enabled && i.latestEpisode)
      .map((i) => i.latestEpisode!);

    if (activeEpisodes.length === 0) return;

    setIsGeneratingSummary(true);
    try {
      const res = await fetch('/api/podcasts/briefing-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ episodes: activeEpisodes }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to generate AI summary");
      }

      const data = await res.json();
      setExecutiveSummary(data.summary);
      setActiveTab('summary');
    } catch (err: any) {
      console.error("AI Summary error:", err);
      alert(`Could not generate AI summary: ${err.message}`);
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const handleDataRestored = () => {
    const items = loadBriefingItemsFromStorage();
    setBriefingItems(items && items.length > 0 ? items : DEFAULT_BRIEFING_ITEMS);

    const settings = loadSettingsFromStorage();
    setPlaybackRate(settings.playbackRate);
    setAutoAdvance(settings.autoAdvance);
    setActiveTab(settings.activeTab || 'briefing');
    if (settings.addPosition) {
      setSessionAddPosition(settings.addPosition);
    }
    const size = settings.smallTextSize || 'larger';
    setSmallTextSize(size);
    applySmallTextSize(size);

    const summary = loadAISummaryFromStorage();
    setExecutiveSummary(summary);

    const playback = loadPlaybackStateFromStorage();
    if (playback && typeof playback.trackIndex === 'number') {
      setCurrentTrackIndex(playback.trackIndex);
    } else if (DEFAULT_PLAYBACK_STATE && typeof DEFAULT_PLAYBACK_STATE.trackIndex === 'number') {
      setCurrentTrackIndex(DEFAULT_PLAYBACK_STATE.trackIndex);
    }
  };

  return (
    <div className="min-h-screen bg-[#F9F7F2] text-[#4A4A3F] flex flex-col font-sans selection:bg-[#8C927B] selection:text-white">
      
      {/* Navigation Header */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        briefingCount={enabledItems.length}
        totalDurationSeconds={totalDurationSeconds}
        onOpenRefreshModal={() => setIsRefreshModalOpen(true)}
        isRefreshing={isRefreshing}
        hasSummary={executiveSummary !== null}
        onOpenBackup={() => setIsBackupModalOpen(true)}
        smallTextSize={smallTextSize}
        onSmallTextSizeChange={handleSmallTextSizeChange}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6">
        {activeTab === 'briefing' && (
          <MyBriefing
            items={briefingItems}
            onPlayStart={handlePlayStart}
            onMoveItem={handleMoveItem}
            onToggleItem={handleToggleItem}
            onRemoveItem={handleRemoveItem}
            onLoadPreset={handleLoadPreset}
            onGenerateAISummary={handleGenerateAISummary}
            isGeneratingSummary={isGeneratingSummary}
            onOpenSearch={() => setActiveTab('search')}
            onOpenEpisodes={(podcastId) => setSelectedPodcastForEpisodes({ id: podcastId })}
            currentPlayingAudioUrl={currentEpisode?.audioUrl}
            isPlaying={isPlaying}
          />
        )}

        {activeTab === 'search' && (
          <PodcastSearch
            onAddPodcast={handleAddPodcast}
            addedPodcastIds={briefingItems.map((i) => i.podcast.id)}
            onOpenEpisodes={(podcastId, podcastObj) => setSelectedPodcastForEpisodes({ id: podcastId, obj: podcastObj })}
            sessionAddPosition={sessionAddPosition}
            onSetSessionAddPosition={setSessionAddPosition}
          />
        )}

        {activeTab === 'summary' && (
          <AISummaryView
            summary={executiveSummary}
            onGenerate={handleGenerateAISummary}
            isLoading={isGeneratingSummary}
            onGoToBriefing={() => setActiveTab('briefing')}
          />
        )}
      </main>

      {/* Episode Detail Drawer/Modal */}
      {selectedPodcastForEpisodes && (
        <EpisodeListModal
          podcastId={selectedPodcastForEpisodes.id}
          podcastObj={selectedPodcastForEpisodes.obj}
          onClose={() => setSelectedPodcastForEpisodes(null)}
          onPlayEpisode={(ep) => {
            // Find or temporarily play this episode
            setCurrentTrackIndex(0);
            setIsPlaying(true);
          }}
          onAddPodcastToBriefing={(p, pos) => handleAddPodcast(p, pos)}
          isPodcastInBriefing={briefingItems.some((i) => i.podcast.id === selectedPodcastForEpisodes.id)}
          currentPlayingUrl={currentEpisode?.audioUrl}
        />
      )}

      {/* Floating Audio Player for Continuous Playback & Mobile Lockscreen Control */}
      {currentEpisode && (
        <AudioPlayer
          currentEpisode={currentEpisode}
          isPlaying={isPlaying}
          setIsPlaying={setIsPlaying}
          onPlayPause={handlePlayPause}
          onNextTrack={handleNextTrack}
          onPrevTrack={handlePrevTrack}
          hasNext={currentTrackIndex !== null && currentTrackIndex < enabledItems.length - 1}
          hasPrev={currentTrackIndex !== null && currentTrackIndex > 0}
          autoAdvance={autoAdvance}
          setAutoAdvance={setAutoAdvance}
          playbackRate={playbackRate}
          setPlaybackRate={setPlaybackRate}
        />
      )}
      {/* Backup & Local Data Restore Modal */}
      <BackupModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
        onDataRestored={handleDataRestored}
        smallTextSize={smallTextSize}
        onSmallTextSizeChange={handleSmallTextSizeChange}
      />

      {/* Startup & On-Demand Episode Refresh Modal */}
      <RefreshEpisodesModal
        isOpen={isRefreshModalOpen}
        onClose={handleCancelRefreshModal}
        onConfirmRefreshAndPlay={handleConfirmRefreshAndPlay}
        isRefreshing={isRefreshing}
        briefingCount={enabledItems.length || briefingItems.length}
      />
    </div>
  );
}
