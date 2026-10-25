export interface Podcast {
  id: string; // collectionId or rssUrl hash
  title: string;
  artist: string;
  feedUrl: string;
  artworkUrl: string;
  category?: string;
  description?: string;
  trackCount?: number;
}

export interface Episode {
  id: string;
  title: string;
  audioUrl: string;
  pubDate: string;
  duration?: string | number; // formatted string or seconds
  description?: string;
  podcastId?: string;
  podcastTitle: string;
  podcastArtwork: string;
  podcastArtist?: string;
}

export interface BriefingItem {
  id: string;
  podcast: Podcast;
  latestEpisode?: Episode;
  isLoadingEpisode?: boolean;
  error?: string;
  enabled: boolean;
}

export interface BriefingPreset {
  id: string;
  name: string;
  description: string;
  iconName: string;
  podcasts: Podcast[];
}

export type SmallTextSize = 'normal' | 'large' | 'larger';

export interface ExecutiveSummary {
  timestamp: string;
  totalEpisodes: number;
  overallHighlights: string[];
  topics: {
    title: string;
    bulletPoints: string[];
  }[];
  briefingScript?: string;
}
