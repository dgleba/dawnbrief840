import React, { useEffect, useState } from 'react';
import { Episode, Podcast } from '../types';
import { formatEpisodeDateTime } from '../lib/dateUtils';
import { X, Play, Clock, Calendar, Loader2, Radio, Check, Plus, ArrowUp, ArrowDown, ExternalLink } from 'lucide-react';

interface EpisodeListModalProps {
  podcastId: string | null;
  podcastObj?: Podcast;
  onClose: () => void;
  onPlayEpisode: (episode: Episode) => void;
  onAddPodcastToBriefing?: (podcast: Podcast, position?: 'top' | 'bottom') => void;
  isPodcastInBriefing?: boolean;
  currentPlayingUrl?: string;
}

export const EpisodeListModal: React.FC<EpisodeListModalProps> = ({
  podcastId,
  podcastObj,
  onClose,
  onPlayEpisode,
  onAddPodcastToBriefing,
  isPodcastInBriefing,
  currentPlayingUrl,
}) => {
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [podcastInfo, setPodcastInfo] = useState<{ title: string; artworkUrl: string; description: string; link?: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!podcastId) return;

    let feedUrl = podcastObj?.feedUrl;

    const fetchFeed = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // If feedUrl isn't supplied, search iTunes API to resolve feedUrl from collectionId
        if (!feedUrl) {
          const searchRes = await fetch(`/api/podcasts/search?q=${podcastId}`);
          if (searchRes.ok) {
            const data = await searchRes.json();
            if (data.results && data.results[0]) {
              feedUrl = data.results[0].feedUrl;
            }
          }
        }

        if (!feedUrl) {
          throw new Error("Could not find RSS feed URL for this podcast.");
        }

        const res = await fetch(`/api/podcasts/feed?url=${encodeURIComponent(feedUrl)}`);
        if (!res.ok) throw new Error("Failed to parse podcast feed.");

        const data = await res.json();
        setPodcastInfo(data.podcast);
        setEpisodes(data.episodes || []);
      } catch (err: any) {
        console.error("Error fetching episodes:", err);
        setError(err.message || "Could not load episode list.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchFeed();
  }, [podcastId, podcastObj]);

  if (!podcastId) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#4A4A3F]/50 backdrop-blur-sm flex justify-end transition-opacity">
      <div className="w-full max-w-2xl bg-[#F9F7F2] border-l border-[#DED9CE] h-full flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-right duration-300">
        
        {/* Modal Header */}
        <div className="p-5 border-b border-[#DED9CE] flex items-center justify-between bg-[#EDE9DF] sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white overflow-hidden flex-shrink-0 border border-[#DED9CE] shadow-xs">
              {podcastInfo?.artworkUrl || podcastObj?.artworkUrl ? (
                <img
                  src={podcastInfo?.artworkUrl || podcastObj?.artworkUrl}
                  alt={podcastInfo?.title || podcastObj?.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[#4A4A3F]/50">
                  <Radio className="w-6 h-6" />
                </div>
              )}
            </div>
            <div>
              <h3 className="font-bold text-[#4A4A3F] font-serif text-base line-clamp-1">
                {podcastInfo?.title || podcastObj?.title || 'Podcast Episodes'}
              </h3>
              <p className="text-xs text-[#4A4A3F]/70 font-medium">
                {podcastObj?.artist || 'News Podcast Feed'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white hover:bg-[#DED9CE] text-[#4A4A3F] transition border border-[#DED9CE]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action bar inside modal */}
        {podcastObj && onAddPodcastToBriefing && (
          <div className="px-5 py-3 bg-[#EDE9DF]/60 border-b border-[#DED9CE] flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs text-[#4A4A3F]/70 font-medium">
              {episodes.length} episodes available
            </span>
            {isPodcastInBriefing ? (
              <div className="px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 bg-[#EDE9DF] text-[#6B705C] border border-[#DED9CE]">
                <Check className="w-3.5 h-3.5 text-[#6B705C]" />
                <span>In Briefing Queue</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-[#4A4A3F]/70 font-semibold hidden sm:inline">Add to Briefing:</span>
                <button
                  onClick={() => onAddPodcastToBriefing(podcastObj, 'top')}
                  title="Add to the top of your briefing playlist (first to play)"
                  className="px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1 bg-[#8C927B] hover:bg-[#6B705C] text-white shadow-sm transition active:scale-95"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                  <span>+ Top</span>
                </button>
                <button
                  onClick={() => onAddPodcastToBriefing(podcastObj, 'bottom')}
                  title="Add to the bottom of your briefing playlist (last to play)"
                  className="px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1 bg-white hover:bg-[#EDE9DF] text-[#6B705C] border border-[#DED9CE] shadow-xs transition active:scale-95"
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                  <span>+ Bottom</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Modal Content / Episodes List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {isLoading ? (
            <div className="py-20 text-center space-y-3">
              <Loader2 className="w-8 h-8 text-[#6B705C] animate-spin mx-auto" />
              <p className="text-sm text-[#4A4A3F]/70 font-medium">Loading podcast feed & episodes...</p>
            </div>
          ) : error ? (
            <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl text-center space-y-2">
              <p className="text-rose-700 text-sm font-semibold">{error}</p>
              <p className="text-xs text-[#4A4A3F]/60">Please check the podcast feed or try another source.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {episodes.map((ep) => {
                const isPlaying = currentPlayingUrl === ep.audioUrl;
                const dateInfo = formatEpisodeDateTime(ep.pubDate);

                return (
                  <div
                    key={ep.id}
                    className={`p-4 rounded-2xl border transition ${
                      isPlaying
                        ? 'bg-[#EDE9DF] border-[#8C927B]'
                        : 'bg-white border-[#DED9CE] hover:border-[#8C927B]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <h4 className="font-bold text-sm text-[#4A4A3F] line-clamp-2">
                          {ep.title}
                        </h4>
                        <div className="flex items-center gap-2.5 flex-wrap text-xs text-[#4A4A3F]/75">
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
                          {ep.duration && (
                            <>
                              <span className="text-[#4A4A3F]/40">•</span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3 text-[#6B705C] flex-shrink-0" />
                                {ep.duration}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => onPlayEpisode(ep)}
                        className={`px-3.5 py-2 rounded-full text-xs font-bold flex items-center gap-1.5 transition flex-shrink-0 ${
                          isPlaying
                            ? 'bg-[#6B705C] text-white'
                            : 'bg-[#EDE9DF] hover:bg-[#DED9CE] text-[#4A4A3F]'
                        }`}
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>{isPlaying ? 'Playing' : 'Play'}</span>
                      </button>
                    </div>

                    {ep.description && (
                      <p className="text-xs text-[#4A4A3F]/80 mt-2.5 line-clamp-3 leading-relaxed bg-[#F9F7F2] p-3 rounded-xl border border-[#DED9CE]">
                        {ep.description}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );

};
