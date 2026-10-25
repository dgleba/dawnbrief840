import React, { useState, useEffect } from 'react';
import { Podcast } from '../types';
import { POPULAR_NEWS_PODCASTS } from '../data/presets';
import { Search, Plus, Check, Loader2, Radio, Info, Sparkles, ArrowUp, ArrowDown, ListOrdered } from 'lucide-react';

interface PodcastSearchProps {
  onAddPodcast: (podcast: Podcast, position?: 'top' | 'bottom') => void;
  addedPodcastIds: string[];
  onOpenEpisodes: (podcastId: string, podcastObj?: Podcast) => void;
  sessionAddPosition?: 'top' | 'bottom';
  onSetSessionAddPosition?: (pos: 'top' | 'bottom') => void;
}

const CATEGORIES = [
  'All News',
  'Daily Headlines',
  'World News',
  'Business & Markets',
  'Investing',
  'Business',
  'Technology',
  'Politics',
  'News',
  'Morning News',
  'In-Depth News'
];

export const PodcastSearch: React.FC<PodcastSearchProps> = ({
  onAddPodcast,
  addedPodcastIds,
  onOpenEpisodes,
  sessionAddPosition = 'bottom',
  onSetSessionAddPosition,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All News');
  const [searchResults, setSearchResults] = useState<Podcast[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [localAddPosition, setLocalAddPosition] = useState<'top' | 'bottom'>(sessionAddPosition);
  const [notification, setNotification] = useState<{ message: string; type: 'top' | 'bottom' } | null>(null);

  // Sync with prop if changed
  useEffect(() => {
    setLocalAddPosition(sessionAddPosition);
  }, [sessionAddPosition]);

  const handlePositionChange = (pos: 'top' | 'bottom') => {
    setLocalAddPosition(pos);
    if (onSetSessionAddPosition) {
      onSetSessionAddPosition(pos);
    }
  };

  const handleAddWithFeedback = (podcast: Podcast, position: 'top' | 'bottom') => {
    onAddPodcast(podcast, position);
    setNotification({
      message: `Added "${podcast.title}" to the ${position} of your briefing queue`,
      type: position
    });
    setTimeout(() => {
      setNotification(null);
    }, 3000);
  };

  // Debounced search via iTunes API
  useEffect(() => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      setSearchError(null);
      try {
        const res = await fetch(`/api/podcasts/search?q=${encodeURIComponent(searchTerm)}`);
        if (!res.ok) throw new Error('Failed to fetch search results');
        const data = await res.json();
        setSearchResults(data.results || []);
      } catch (err: any) {
        console.error("Search error:", err);
        setSearchError("Could not perform search. Please try again.");
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Combine curated + search results
  const displayedPodcasts = searchTerm.trim() ? searchResults : POPULAR_NEWS_PODCASTS;

  // Category filter
  const filteredPodcasts = displayedPodcasts.filter((p) => {
    if (selectedCategory === 'All News') return true;
    return p.category?.toLowerCase() === selectedCategory.toLowerCase();
  });

  return (
    <div className="space-y-6 pb-32">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-20 right-4 sm:right-8 z-50 bg-[#4A4A3F] text-white px-4 py-3 rounded-2xl shadow-xl border border-[#6B705C] flex items-center gap-3 animate-in fade-in slide-in-from-top-3 duration-200">
          {notification.type === 'top' ? (
            <div className="p-1 rounded-full bg-[#8C927B] text-white">
              <ArrowUp className="w-4 h-4" />
            </div>
          ) : (
            <div className="p-1 rounded-full bg-[#8C927B] text-white">
              <ArrowDown className="w-4 h-4" />
            </div>
          )}
          <span className="text-xs font-semibold">{notification.message}</span>
        </div>
      )}

      {/* Header Search Box */}
      <div className="bg-[#EDE9DF] border border-[#DED9CE] rounded-[32px] p-6 sm:p-8 shadow-sm space-y-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold serif font-serif text-[#4A4A3F] flex items-center gap-2">
            <Search className="w-6 h-6 text-[#6B705C]" />
            <span>Search & Add News Podcasts</span>
          </h2>
          <p className="text-[#4A4A3F]/80 text-sm">
            Search millions of podcasts worldwide or choose from top verified news sources to add to your briefing.
          </p>
        </div>

        {/* Input Bar */}
        <div className="relative">
          <Search className="w-5 h-5 text-[#4A4A3F]/40 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search news podcast name, topic, or host (e.g. NPR, BBC, Reuters, Tech, WSJ)..."
            className="w-full pl-12 pr-10 py-3.5 bg-white border border-[#DED9CE] rounded-2xl text-[#4A4A3F] placeholder-[#4A4A3F]/50 focus:outline-none focus:ring-2 focus:ring-[#8C927B]/30 focus:border-[#8C927B] text-sm transition shadow-sm"
          />
          {isSearching && (
            <Loader2 className="w-5 h-5 text-[#6B705C] animate-spin absolute right-4 top-1/2 -translate-y-1/2" />
          )}
        </div>

        {/* Category Pills & Session Placement Selector */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                  selectedCategory === cat
                    ? 'bg-[#8C927B] text-white shadow-sm'
                    : 'bg-white hover:bg-[#DED9CE] text-[#4A4A3F] border border-[#DED9CE]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Session Queue Placement Toggle */}
          <div className="flex items-center gap-2 bg-white/80 p-1.5 rounded-2xl border border-[#DED9CE] self-start lg:self-auto shadow-xs">
            <span className="text-xs font-semibold text-[#4A4A3F]/75 px-2 flex items-center gap-1.5">
              <ListOrdered className="w-3.5 h-3.5 text-[#6B705C]" />
              <span>Queue Position:</span>
            </span>
            <button
              onClick={() => handlePositionChange('top')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition ${
                localAddPosition === 'top'
                  ? 'bg-[#8C927B] text-white shadow-sm'
                  : 'text-[#4A4A3F]/70 hover:text-[#4A4A3F] hover:bg-[#EDE9DF]'
              }`}
              title="Add newly selected podcasts to the top of your queue (play first)"
            >
              <ArrowUp className="w-3.5 h-3.5" />
              <span>Top</span>
            </button>
            <button
              onClick={() => handlePositionChange('bottom')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition ${
                localAddPosition === 'bottom'
                  ? 'bg-[#8C927B] text-white shadow-sm'
                  : 'text-[#4A4A3F]/70 hover:text-[#4A4A3F] hover:bg-[#EDE9DF]'
              }`}
              title="Add newly selected podcasts to the bottom of your queue (play last)"
            >
              <ArrowDown className="w-3.5 h-3.5" />
              <span>Bottom</span>
            </button>
          </div>
        </div>
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-[#4A4A3F] flex items-center gap-2">
          {searchTerm.trim() ? (
            <>
              <span>Search Results</span>
              <span className="text-xs font-normal text-[#4A4A3F]/70">({filteredPodcasts.length} found)</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 text-[#6B705C]" />
              <span>Curated News Podcasts</span>
            </>
          )}
        </h3>

        <div className="text-xs text-[#4A4A3F]/70 font-medium hidden sm:block">
          Adding items to: <span className="font-bold text-[#6B705C] capitalize">{localAddPosition}</span> of briefing
        </div>
      </div>

      {/* Error state */}
      {searchError && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-sm text-center font-medium">
          {searchError}
        </div>
      )}

      {/* Grid of Podcasts */}
      {filteredPodcasts.length === 0 && !isSearching ? (
        <div className="bg-[#EDE9DF] border border-[#DED9CE] rounded-2xl p-10 text-center text-[#4A4A3F]/70 text-sm space-y-2">
          <p className="font-medium text-[#4A4A3F]">No podcasts found for "{searchTerm}"</p>
          <p className="text-xs text-[#4A4A3F]/60">Try searching for broader keywords like "news", "world", or "daily".</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPodcasts.map((podcast) => {
            const isAdded = addedPodcastIds.includes(podcast.id);

            return (
              <div
                key={podcast.id}
                className="bg-white border border-[#DED9CE] hover:border-[#8C927B] rounded-3xl p-6 flex flex-col justify-between gap-4 transition group shadow-xs"
              >
                <div className="flex items-start justify-between gap-3.5">
                  <div className="w-16 h-16 rounded-2xl overflow-hidden bg-[#EDE9DF] flex-shrink-0 border border-[#DED9CE] shadow-xs">
                    {podcast.artworkUrl ? (
                      <img
                        src={podcast.artworkUrl}
                        alt={podcast.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[#4A4A3F]/50">
                        <Radio className="w-6 h-6" />
                      </div>
                    )}
                  </div>

                  {/* Add action buttons */}
                  {isAdded ? (
                    <div className="text-xs font-bold px-3 py-1.5 rounded-full bg-[#EDE9DF] text-[#6B705C] border border-[#DED9CE] flex items-center gap-1">
                      <Check className="w-3.5 h-3.5 text-[#6B705C]" />
                      <span>ADDED</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleAddWithFeedback(podcast, 'top')}
                        title="Add to top of briefing queue"
                        className="text-xs font-bold px-2.5 py-1.5 rounded-xl border border-[#8C927B] text-[#6B705C] hover:bg-[#8C927B] hover:text-white transition flex items-center gap-0.5 shadow-2xs"
                      >
                        <ArrowUp className="w-3 h-3" />
                        <span>Top</span>
                      </button>
                      <button
                        onClick={() => handleAddWithFeedback(podcast, 'bottom')}
                        title="Add to bottom of briefing queue"
                        className="text-xs font-bold px-2.5 py-1.5 rounded-xl bg-[#8C927B] text-white hover:bg-[#6B705C] transition flex items-center gap-0.5 shadow-2xs"
                      >
                        <ArrowDown className="w-3 h-3" />
                        <span>Bottom</span>
                      </button>
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-[#6B705C] bg-[#8C927B]/15 px-2 py-0.5 rounded border border-[#8C927B]/30 inline-block">
                    {podcast.category || 'News'}
                  </span>
                  <h3 className="font-bold text-lg text-[#4A4A3F] leading-tight group-hover:text-[#6B705C] transition line-clamp-1">
                    {podcast.title}
                  </h3>
                  <p className="text-xs text-[#4A4A3F]/60 font-medium line-clamp-1">
                    {podcast.artist}
                  </p>
                </div>

                {podcast.description && (
                  <p className="text-sm text-[#4A4A3F]/70 line-clamp-2 leading-relaxed">
                    {podcast.description}
                  </p>
                )}

                {/* Footer Buttons */}
                <div className="flex items-center justify-between pt-3 border-t border-[#DED9CE] mt-auto gap-2">
                  <button
                    onClick={() => onOpenEpisodes(podcast.id, podcast)}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#4A4A3F]/70 hover:text-[#4A4A3F] hover:bg-[#EDE9DF] transition flex items-center gap-1"
                  >
                    <Info className="w-3.5 h-3.5" />
                    <span>Episodes</span>
                  </button>

                  <span className="text-[11px] text-[#6B705C] font-semibold">
                    Verified Source
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

