import React from 'react';
import { BriefingItem, BriefingPreset, Episode } from '../types';
import { PRESET_BRIEFINGS, POPULAR_NEWS_PODCASTS } from '../data/presets';
import { formatEpisodeDateTime } from '../lib/dateUtils';
import { 
  Play, 
  ArrowUp, 
  ArrowDown, 
  Trash2, 
  Sparkles, 
  Clock, 
  Calendar,
  Zap, 
  Coffee, 
  Globe, 
  TrendingUp, 
  Plus, 
  CheckCircle2, 
  AlertCircle, 
  RotateCw, 
  Volume2, 
  ListOrdered,
  ChevronRight,
  Info
} from 'lucide-react';

interface MyBriefingProps {
  items: BriefingItem[];
  onPlayStart: (index?: number) => void;
  onMoveItem: (fromIndex: number, toIndex: number) => void;
  onToggleItem: (id: string) => void;
  onRemoveItem: (id: string) => void;
  onLoadPreset: (preset: BriefingPreset) => void;
  onGenerateAISummary: () => void;
  isGeneratingSummary: boolean;
  onOpenSearch: () => void;
  onOpenEpisodes: (podcastId: string) => void;
  currentPlayingAudioUrl?: string;
  isPlaying?: boolean;
}

export const MyBriefing: React.FC<MyBriefingProps> = ({
  items,
  onPlayStart,
  onMoveItem,
  onToggleItem,
  onRemoveItem,
  onLoadPreset,
  onGenerateAISummary,
  isGeneratingSummary,
  onOpenSearch,
  onOpenEpisodes,
  currentPlayingAudioUrl,
  isPlaying,
}) => {
  const enabledItems = items.filter((i) => i.enabled);

  // Helper to format date cleanly
  const formatPubDate = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

      if (diffMins < 60 && diffMins >= 0) {
        return `${diffMins}m ago`;
      }
      if (diffHours < 24 && diffHours >= 0) {
        return `${diffHours}h ago`;
      }

      return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const renderIcon = (iconName: string) => {
    switch (iconName) {
      case 'ListOrdered':
        return <ListOrdered className="w-5 h-5 text-[#6B705C]" />;
      case 'Zap':
        return <Zap className="w-5 h-5 text-[#6B705C]" />;
      case 'Coffee':
        return <Coffee className="w-5 h-5 text-[#6B705C]" />;
      case 'Globe':
        return <Globe className="w-5 h-5 text-[#6B705C]" />;
      case 'TrendingUp':
        return <TrendingUp className="w-5 h-5 text-[#6B705C]" />;
      default:
        return <Zap className="w-5 h-5 text-[#6B705C]" />;
    }
  };

  return (
    <div className="space-y-8 pb-32">
      {/* Hero Header & Quick Actions */}
      <div className="bg-[#EDE9DF] border border-[#DED9CE] rounded-[32px] p-6 sm:p-8 shadow-sm relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 max-w-2xl">

            <p className="text-[#4A4A3F]/80 text-sm leading-relaxed">
              Plays the latest episode of each podcast.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {enabledItems.length > 0 && (
              <button
                onClick={() => onPlayStart(0)}
                className="px-6 py-3.5 rounded-full bg-[#8C927B] hover:bg-[#6B705C] text-white font-medium text-sm flex items-center justify-center gap-3 shadow-md transition active:scale-[0.98]"
              >
                <Play className="w-5 h-5 fill-white" />
                <span>Play News Briefing</span>
              </button>
            )}


          </div>
        </div>
      </div>

      {/* Main Playlist Section */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ListOrdered className="w-5 h-5 text-[#6B705C]" />
            <h3 className="text-lg font-bold text-[#4A4A3F]">
              Playback Queue ({enabledItems.length} Podcasts)
            </h3>
          </div>

          <div className="flex items-center gap-2">
            {items.length < POPULAR_NEWS_PODCASTS.length && (
              <button
                onClick={() => onLoadPreset(PRESET_BRIEFINGS[0])}
                className="text-xs font-semibold text-[#6B705C] hover:text-[#4A4A3F] flex items-center gap-1.5 bg-white hover:bg-[#EDE9DF] px-3.5 py-2 rounded-xl border border-[#DED9CE] transition shadow-xs"
                title="Restore all 12 popular news podcasts to your briefing list"
              >
                <RotateCw className="w-3.5 h-3.5 text-[#6B705C]" />
                <span>Restore Full List ({POPULAR_NEWS_PODCASTS.length} Shows)</span>
              </button>
            )}

            <button
              onClick={onOpenSearch}
              className="text-xs font-semibold text-[#6B705C] hover:text-[#4A4A3F] flex items-center gap-1 bg-[#8C927B]/15 hover:bg-[#8C927B]/25 px-3.5 py-2 rounded-xl border border-[#8C927B]/30 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Add More Podcasts</span>
            </button>
          </div>
        </div>

        {/* Notice Banner when Queue is filtered by preset */}
        {items.length > 0 && items.length < POPULAR_NEWS_PODCASTS.length && (
          <div className="bg-[#EDE9DF]/90 border border-[#DED9CE] rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-[#4A4A3F]">
              <Info className="w-4 h-4 text-[#6B705C] shrink-0" />
              <span>
                Currently showing <strong>{items.length} of {POPULAR_NEWS_PODCASTS.length} podcasts</strong> in your queue (filtered by preset).
              </span>
            </div>
            <button
              onClick={() => onLoadPreset(PRESET_BRIEFINGS[0])}
              className="px-3 py-1.5 rounded-xl bg-[#6B705C] hover:bg-[#8C927B] text-white font-semibold transition text-xs shadow-xs flex items-center gap-1.5"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>Restore Full List</span>
            </button>
          </div>
        )}

        {items.length === 0 ? (
          /* Empty State */
          <div className="bg-[#EDE9DF] border border-dashed border-[#DED9CE] rounded-[32px] p-10 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-white text-[#6B705C] flex items-center justify-center mx-auto shadow-sm">
              <ListOrdered className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h4 className="text-lg font-semibold text-[#4A4A3F]">Your news briefing list is empty</h4>
              <p className="text-[#4A4A3F]/70 text-sm max-w-md mx-auto">
                Select one of the quick preset news briefings above or search for your favorite podcasts to get started.
              </p>
            </div>
            <button
              onClick={onOpenSearch}
              className="px-5 py-2.5 rounded-full bg-[#8C927B] text-white font-medium text-sm inline-flex items-center gap-2 hover:bg-[#6B705C] transition shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Browse News Podcasts</span>
            </button>
          </div>
        ) : (
          /* Playlist Items Cards */
          <div className="space-y-3">
            {items.map((item, index) => {
              const episode = item.latestEpisode;
              const isCurrentlyPlaying = episode && currentPlayingAudioUrl === episode.audioUrl;

              return (
                <div
                  key={item.id}
                  className={`group bg-white border transition-all rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative overflow-hidden shadow-xs ${
                    !item.enabled
                      ? 'opacity-50 border-[#DED9CE] bg-[#F9F7F2]'
                      : isCurrentlyPlaying
                      ? 'border-[#8C927B] bg-[#EDE9DF]/60 shadow-md ring-1 ring-[#8C927B]/40'
                      : 'border-[#DED9CE] hover:border-[#8C927B]'
                  }`}
                >
                  {/* Playing Bar Highlight */}
                  {isCurrentlyPlaying && (
                    <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-[#8C927B]" />
                  )}

                  <div className="flex items-start sm:items-center gap-4 flex-1 min-w-0 w-full sm:w-auto">
                    {/* Index & Reorder Controls */}
                    <div className="flex flex-col items-center gap-1 text-[#4A4A3F]/50">
                      <span className="text-xs font-bold text-[#6B705C] w-5 text-center">
                        #{index + 1}
                      </span>
                      <div className="flex flex-col gap-0.5">
                        <button
                          onClick={() => onMoveItem(index, index - 1)}
                          disabled={index === 0}
                          title="Move up in briefing order"
                          className="p-1 text-[#4A4A3F]/50 hover:text-[#6B705C] disabled:opacity-20 transition"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onMoveItem(index, index + 1)}
                          disabled={index === items.length - 1}
                          title="Move down in briefing order"
                          className="p-1 text-[#4A4A3F]/50 hover:text-[#6B705C] disabled:opacity-20 transition"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Podcast Artwork */}
                    <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-2xl overflow-hidden bg-[#EDE9DF] flex-shrink-0 border border-[#DED9CE] shadow-xs">
                      <img
                        src={item.podcast.artworkUrl || episode?.podcastArtwork}
                        alt={item.podcast.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                      {isCurrentlyPlaying && isPlaying && (
                        <div className="absolute inset-0 bg-[#4A4A3F]/60 flex items-center justify-center">
                          <Volume2 className="w-6 h-6 text-white animate-bounce" />
                        </div>
                      )}
                    </div>

                    {/* Podcast & Episode Details */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold text-[#6B705C] bg-[#8C927B]/15 px-2 py-0.5 rounded-md border border-[#8C927B]/30">
                          {item.podcast.category || 'News'}
                        </span>
                        <span className="text-xs text-[#4A4A3F]/70 font-medium truncate">
                          {item.podcast.title}
                        </span>
                      </div>

                      {/* Episode Title or Loading State */}
                      {item.isLoadingEpisode ? (
                        <div className="flex items-center gap-2 text-xs text-[#4A4A3F]/60 py-1">
                          <RotateCw className="w-3.5 h-3.5 animate-spin text-[#8C927B]" />
                          <span>Fetching latest episode from RSS...</span>
                        </div>
                      ) : item.error ? (
                        <div className="flex items-center gap-1.5 text-xs text-rose-600 py-0.5">
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span>{item.error}</span>
                        </div>
                      ) : episode ? (
                        <div>
                          <h4 className="text-sm font-bold text-[#4A4A3F] line-clamp-1 group-hover:text-[#6B705C] transition">
                            {episode.title}
                          </h4>
                          {(() => {
                            const dateInfo = formatEpisodeDateTime(episode.pubDate);
                            return (
                              <div className="flex items-center gap-2.5 flex-wrap text-xs text-[#4A4A3F]/75 mt-1">
                                {dateInfo.fullDateTime && (
                                  <div className="flex items-center gap-1.5 font-medium">
                                    <Calendar className="w-3 h-3 text-[#6B705C] flex-shrink-0" />
                                    <span className="font-mono text-[#4A4A3F] text-[11px] font-semibold">
                                      {dateInfo.fullDateTime}
                                    </span>
                                    {dateInfo.timeAgo && (
                                      <span className="px-1.5 py-0.5 rounded-md bg-[#EDE9DF] text-[10px] font-bold text-[#6B705C] border border-[#DED9CE]">
                                        {dateInfo.timeAgo}
                                      </span>
                                    )}
                                  </div>
                                )}
                                {episode.duration && (
                                  <>
                                    <span className="text-[#4A4A3F]/40">•</span>
                                    <span className="flex items-center gap-1">
                                      <Clock className="w-3 h-3 text-[#6B705C] flex-shrink-0" />
                                      {episode.duration}
                                    </span>
                                  </>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      ) : (
                        <p className="text-xs text-[#4A4A3F]/50 italic">No episode available</p>
                      )}
                    </div>
                  </div>

                  {/* Right Actions */}
                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end border-t sm:border-t-0 border-[#DED9CE] pt-3 sm:pt-0">
                    {/* View Podcast History button */}
                    <button
                      onClick={() => onOpenEpisodes(item.podcast.id)}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#4A4A3F]/70 hover:text-[#4A4A3F] hover:bg-[#EDE9DF] transition flex items-center gap-1"
                      title="View all recent episodes"
                    >
                      <Info className="w-3.5 h-3.5" />
                      <span className="hidden md:inline">Episodes</span>
                    </button>

                    {/* Play Specific Podcast Episode */}
                    {episode && item.enabled && (
                      <button
                        onClick={() => onPlayStart(index)}
                        className={`px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition ${
                          isCurrentlyPlaying
                            ? 'bg-[#6B705C] text-white shadow-sm'
                            : 'bg-[#EDE9DF] hover:bg-[#DED9CE] text-[#4A4A3F]'
                        }`}
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>{isCurrentlyPlaying ? 'Playing' : 'Play'}</span>
                      </button>
                    )}

                    {/* Toggle Enable/Disable in Briefing */}
                    <button
                      onClick={() => onToggleItem(item.id)}
                      title={item.enabled ? 'Exclude from briefing queue' : 'Include in briefing queue'}
                      className={`p-2 rounded-xl text-xs transition border ${
                        item.enabled
                          ? 'bg-[#8C927B]/20 border-[#8C927B]/30 text-[#6B705C]'
                          : 'bg-[#EDE9DF] border-[#DED9CE] text-[#4A4A3F]/40'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </button>

                    {/* Remove button */}
                    <button
                      onClick={() => onRemoveItem(item.id)}
                      title="Remove from briefing"
                      className="p-2 rounded-xl text-[#4A4A3F]/40 hover:text-rose-600 hover:bg-rose-50 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

};
