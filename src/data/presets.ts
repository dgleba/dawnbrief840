import { Podcast, BriefingPreset } from '../types';
import { DEFAULT_BRIEFING_ITEMS } from './defaultData';

// Map all 23 default briefing podcasts as popular discovery podcasts
export const POPULAR_NEWS_PODCASTS: Podcast[] = DEFAULT_BRIEFING_ITEMS.map((item) => item.podcast);

// Helper to look up podcast by ID
const findPodcast = (id: string): Podcast => {
  const found = POPULAR_NEWS_PODCASTS.find((p) => p.id === id);
  if (!found) {
    throw new Error(`Podcast with id "${id}" not found in default presets.`);
  }
  return found;
};

export const PRESET_BRIEFINGS: BriefingPreset[] = [
  {
    id: 'custom-master-lineup',
    name: 'Curated World Briefing (All 23 Shows)',
    description: 'Complete lineup featuring all 23 shows across CBC, NPR, TWiT, TechCrunch, FT, WSJ, BBC, and Reuters.',
    iconName: 'ListOrdered',
    podcasts: POPULAR_NEWS_PODCASTS,
  },
  {
    id: 'quick-5min',
    name: '5-Minute Rapid Briefing',
    description: 'Speed through top headlines and markets across CBC, NPR, DW, and WSJ.',
    iconName: 'Zap',
    podcasts: [
      findPodcast('250083755'),          // The World This Hour (CBC)
      findPodcast('npr-news-now'),         // NPR News Now
      findPodcast('1562652774'),           // DW News Brief
      findPodcast('wsj-minute-briefing'),  // WSJ Minute Briefing
    ],
  },
  {
    id: 'tech-ai-pulse',
    name: 'Tech & AI Intelligence Briefing',
    description: 'Deep tech trends, cyber security, agentic AI, and startup news.',
    iconName: 'Sparkles',
    podcasts: [
      findPodcast('1264759930'),  // Hashtag Trending
      findPodcast('74844126'),    // WSJ Tech News Briefing
      findPodcast('1145974781'),  // TechCrunch Industry News
      findPodcast('1454680607'),  // TechCrunch Daily Crunch
      findPodcast('73329404'),    // This Week in Tech
      findPodcast('79016499'),    // Security Now
      findPodcast('326120877'),   // Intelligent Machines
    ],
  },
  {
    id: 'morning-commute',
    name: 'Morning Commute Essentials',
    description: 'Top headlines and in-depth stories from CBC, NPR, FT, and BBC.',
    iconName: 'Coffee',
    podcasts: [
      findPodcast('250083755'),     // The World This Hour
      findPodcast('npr-news-now'),  // NPR News Now
      findPodcast('1438449989'),    // FT News Briefing
      findPodcast('up-first-npr'),  // Up First
      findPodcast('1200361736'),    // The Daily (NYT)
    ],
  },
  {
    id: 'global-digest',
    name: 'Global World & International Digest',
    description: 'Comprehensive international news coverage from BBC, Reuters, and DW.',
    iconName: 'Globe',
    podcasts: [
      findPodcast('bbc-global-news'), // BBC Global News
      findPodcast('356157099'),       // BBC Newshour
      findPodcast('1665219519'),      // Reuters World News
      findPodcast('1562652774'),      // DW News Brief
    ],
  },
  {
    id: 'business-markets',
    name: 'Business, Markets & Economy',
    description: 'Essential market insights from Financial Times, WSJ, and Reuters.',
    iconName: 'TrendingUp',
    podcasts: [
      findPodcast('1438449989'),          // FT News Briefing
      findPodcast('wsj-minute-briefing'),  // WSJ Minute Briefing
      findPodcast('1854858291'),          // Reuters Morning Bid
      findPodcast('1746360591'),          // Reuters Econ World
      findPodcast('152016440'),           // WSJ What’s News
      findPodcast('1469394914'),          // The Journal
    ],
  },
];
