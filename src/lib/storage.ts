import { BriefingItem, ExecutiveSummary, SmallTextSize } from '../types';
import { 
  DEFAULT_BRIEFING_ITEMS, 
  DEFAULT_SETTINGS as INITIAL_DEFAULT_SETTINGS, 
  DEFAULT_PLAYBACK_STATE as INITIAL_DEFAULT_PLAYBACK 
} from '../data/defaultData';

const KEYS = {
  BRIEFING_ITEMS: 'dawnbrief_items_v12',
  SETTINGS: 'dawnbrief_settings_v12',
  AI_SUMMARY: 'dawnbrief_summary_v12',
  PLAYBACK_STATE: 'dawnbrief_playback_v12',
};

const LEGACY_STORAGE_KEYS = [
  'dawnbrief_items_v2',
  'dawnbrief_settings_v2',
  'dawnbrief_summary_v2',
  'dawnbrief_playback_v2',
  'dawnbrief_items',
  'dawnbrief_settings',
];

export interface AppSettings {
  playbackRate: number;
  autoAdvance: boolean;
  activeTab: 'briefing' | 'search' | 'summary';
  addPosition?: 'top' | 'bottom';
  smallTextSize?: SmallTextSize;
}

export interface StoredPlaybackState {
  trackIndex: number | null;
  lastEpisodeId: string | null;
  currentTime: number;
}

// Default settings fallback from user configuration
export const DEFAULT_SETTINGS: AppSettings = INITIAL_DEFAULT_SETTINGS;
export const DEFAULT_PLAYBACK_STATE: StoredPlaybackState = INITIAL_DEFAULT_PLAYBACK;

/**
 * Apply the small text size attribute to document root
 */
export function applySmallTextSize(size?: SmallTextSize): void {
  if (typeof document === 'undefined') return;
  const val = size || 'normal';
  if (val === 'normal') {
    document.documentElement.removeAttribute('data-small-text');
  } else {
    document.documentElement.setAttribute('data-small-text', val);
  }
}

const LEGACY_FEED_URL_MAP: Record<string, string> = {
  'https://video-api.wsj.com/podcast/rss/wsj/minute-briefing': 'https://feeds.simplecast.com/1GoCgj5h',
  'https://feeds.simplecast.com/54n0ws33': 'https://feeds.simplecast.com/Sl5CSM3S',
  'https://www.pbs.org/newshour/feeds/podcast/x/full': 'https://www.pbs.org/newshour/feeds/rss/podcasts/show',
  'https://www.omnycontent.com/d/playlist/e7399322-7b53-4e6e-a222-a227003f2838/41aef2d1-93c0-4389-bc82-afaf000a1cb0/1ed4f669-7ee4-4ed8-aebc-afaf000a1cb9/podcast.rss': 'https://www.omnycontent.com/d/playlist/e73c998e-6e60-432f-8610-ae210140c5b1/d9566f78-0464-4367-9dcc-b05700aeec6f/7f880b3c-7f67-4b4b-b520-b05700af9172/podcast.rss',
  'https://feeds.mega.nu/today-explained': 'https://feeds.megaphone.fm/VMP5705694065',
  'https://feeds.cbsaudio.com/cbs-world-news-roundup': 'https://rss.amperwave.net/v2/feed/audacynetwork/977da5502b24c5f761a1ddb15b902cbf',
  'https://feeds.simplecast.com/83p516S5': 'https://feeds.megaphone.fm/ESP8447327256',
  'https://feeds.reuters.com/reuters/worldNews': 'https://feeds.megaphone.fm/reutersworldnews',
  'https://feeds.megaphone.fm/CNN8803456322': 'https://feeds.megaphone.fm/WMHY2007701094',
};

/**
 * Load briefing items from localStorage
 */
export function loadBriefingItemsFromStorage(): BriefingItem[] | null {
  try {
    const raw = localStorage.getItem(KEYS.BRIEFING_ITEMS);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map((item: any) => {
        let feedUrl = item.podcast?.feedUrl;
        if (feedUrl && LEGACY_FEED_URL_MAP[feedUrl]) {
          feedUrl = LEGACY_FEED_URL_MAP[feedUrl];
        }
        return {
          ...item,
          podcast: {
            ...item.podcast,
            feedUrl: feedUrl || item.podcast?.feedUrl
          },
          // Mark as loading or ready based on cached episode presence
          isLoadingEpisode: !item.latestEpisode,
        };
      });
    }
  } catch (err) {
    console.warn('[Storage] Failed to load briefing items:', err);
  }
  return null;
}

/**
 * Save briefing items to localStorage
 */
export function saveBriefingItemsToStorage(items: BriefingItem[]): void {
  try {
    localStorage.setItem(KEYS.BRIEFING_ITEMS, JSON.stringify(items));
  } catch (err) {
    console.warn('[Storage] Failed to save briefing items:', err);
  }
}

/**
 * Load user settings from localStorage
 */
export function loadSettingsFromStorage(): AppSettings {
  try {
    const raw = localStorage.getItem(KEYS.SETTINGS);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch (err) {
    console.warn('[Storage] Failed to load settings:', err);
    return DEFAULT_SETTINGS;
  }
}

/**
 * Save user settings to localStorage
 */
export function saveSettingsToStorage(settings: Partial<AppSettings>): void {
  try {
    const current = loadSettingsFromStorage();
    const updated = { ...current, ...settings };
    localStorage.setItem(KEYS.SETTINGS, JSON.stringify(updated));
  } catch (err) {
    console.warn('[Storage] Failed to save settings:', err);
  }
}

/**
 * Load AI Executive Summary from localStorage
 */
export function loadAISummaryFromStorage(): ExecutiveSummary | null {
  try {
    const raw = localStorage.getItem(KEYS.AI_SUMMARY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (err) {
    console.warn('[Storage] Failed to load AI summary:', err);
    return null;
  }
}

/**
 * Save AI Executive Summary to localStorage
 */
export function saveAISummaryToStorage(summary: ExecutiveSummary | null): void {
  try {
    if (summary) {
      localStorage.setItem(KEYS.AI_SUMMARY, JSON.stringify(summary));
    } else {
      localStorage.removeItem(KEYS.AI_SUMMARY);
    }
  } catch (err) {
    console.warn('[Storage] Failed to save AI summary:', err);
  }
}

/**
 * Load last playback state from localStorage
 */
export function loadPlaybackStateFromStorage(): StoredPlaybackState | null {
  try {
    const raw = localStorage.getItem(KEYS.PLAYBACK_STATE);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (err) {
    console.warn('[Storage] Failed to load playback state:', err);
    return null;
  }
}

/**
 * Save last playback state to localStorage
 */
export function savePlaybackStateToStorage(state: StoredPlaybackState): void {
  try {
    localStorage.setItem(KEYS.PLAYBACK_STATE, JSON.stringify(state));
  } catch (err) {
    console.warn('[Storage] Failed to save playback state:', err);
  }
}

export interface DawnbriefBackupData {
  version: string;
  exportedAt: string;
  briefingItems: BriefingItem[];
  settings: AppSettings;
  executiveSummary: ExecutiveSummary | null;
  playbackState: StoredPlaybackState | null;
}

/**
 * Get full application state backup object
 */
export function getFullBackupPayload(): DawnbriefBackupData {
  return {
    version: 'v12',
    exportedAt: new Date().toISOString(),
    briefingItems: loadBriefingItemsFromStorage() || DEFAULT_BRIEFING_ITEMS,
    settings: loadSettingsFromStorage(),
    executiveSummary: loadAISummaryFromStorage(),
    playbackState: loadPlaybackStateFromStorage() || DEFAULT_PLAYBACK_STATE,
  };
}

/**
 * Export full state as formatted JSON string
 */
export function getBackupAsJSONString(): string {
  return JSON.stringify(getFullBackupPayload(), null, 2);
}

/**
 * Import full state backup from JSON string
 */
export function importFullBackupFromJSON(jsonString: string): DawnbriefBackupData {
  const parsed = JSON.parse(jsonString);
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Invalid backup file: Not a valid JSON object.');
  }

  // Restore Briefing Items if present
  if (Array.isArray(parsed.briefingItems)) {
    saveBriefingItemsToStorage(parsed.briefingItems);
  }

  // Restore Settings if present
  if (parsed.settings && typeof parsed.settings === 'object') {
    saveSettingsToStorage(parsed.settings);
  }

  // Restore Summary if present
  if ('executiveSummary' in parsed) {
    saveAISummaryToStorage(parsed.executiveSummary || null);
  }

  // Restore Playback state if present
  if (parsed.playbackState && typeof parsed.playbackState === 'object') {
    savePlaybackStateToStorage(parsed.playbackState);
  }

  return getFullBackupPayload();
}

/**
 * Export subscribed podcast feeds as OPML XML string (Podcast industry standard)
 */
export function exportPodcastsAsOPML(): string {
  const items = loadBriefingItemsFromStorage() || [];
  const outlines = items
    .map((item) => {
      const title = item.podcast.title.replace(/"/g, '&quot;');
      const xmlUrl = item.podcast.feedUrl.replace(/"/g, '&quot;');
      return `    <outline type="rss" text="${title}" title="${title}" xmlUrl="${xmlUrl}" />`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <head>
    <title>Dawnbrief Subscriptions Backup</title>
    <dateCreated>${new Date().toUTCString()}</dateCreated>
  </head>
  <body>
    <outline text="Dawnbrief Podcast Briefings">
${outlines}
    </outline>
  </body>
</opml>`;
}

/**
 * Import podcast feeds from OPML XML string
 */
export function importPodcastsFromOPML(opmlString: string): { importedCount: number; items: BriefingItem[] } {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(opmlString, 'text/xml');
  const outlines = Array.from(xmlDoc.querySelectorAll('outline[xmlUrl]'));

  if (outlines.length === 0) {
    throw new Error('No podcast RSS feeds found in OPML file.');
  }

  const existingItems = loadBriefingItemsFromStorage() || [];
  const existingFeedUrls = new Set(existingItems.map((i) => i.podcast.feedUrl.toLowerCase()));

  const newItems: BriefingItem[] = [];

  outlines.forEach((node) => {
    const feedUrl = node.getAttribute('xmlUrl') || node.getAttribute('xmlurl');
    if (!feedUrl) return;

    if (!existingFeedUrls.has(feedUrl.toLowerCase())) {
      const title = node.getAttribute('title') || node.getAttribute('text') || 'Imported Podcast';
      
      const newItem: BriefingItem = {
        id: `opml-import-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        podcast: {
          id: `opml-${Math.random().toString(36).substring(2, 7)}`,
          title,
          artist: 'Imported via OPML',
          feedUrl,
          artworkUrl: '',
          description: 'Imported podcast feed',
          category: 'Imported',
        },
        enabled: true,
        isLoadingEpisode: true,
      };

      newItems.push(newItem);
      existingFeedUrls.add(feedUrl.toLowerCase());
    }
  });

  const mergedItems = [...existingItems, ...newItems];
  saveBriefingItemsToStorage(mergedItems);

  return { importedCount: newItems.length, items: mergedItems };
}

/**
 * Calculate total LocalStorage footprint used by Dawnbrief
 */
export function getStorageStats() {
  let totalBytes = 0;
  Object.values(KEYS).forEach((key) => {
    const val = localStorage.getItem(key);
    if (val) {
      totalBytes += val.length * 2; // ~2 bytes per UTF-16 character
    }
  });

  const items = loadBriefingItemsFromStorage() || [];
  const summary = loadAISummaryFromStorage();

  return {
    totalBytes,
    formattedSize: (totalBytes / 1024).toFixed(1) + ' KB',
    podcastsCount: items.length,
    hasAISummary: !!summary,
  };
}

/**
 * Wipe all Dawnbrief storage data
 */
export function clearAllDawnbriefStorage(): void {
  Object.values(KEYS).forEach((key) => {
    localStorage.removeItem(key);
  });
  LEGACY_STORAGE_KEYS.forEach((key) => {
    localStorage.removeItem(key);
  });
}

