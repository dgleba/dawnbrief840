/**
 * Date and time formatting utilities for Dawnbrief
 */

export interface FormattedDateTime {
  fullDateTime: string; // e.g. "2026-08-14 15:36"
  timeAgo: string;      // e.g. "2h ago", "15m ago", "yesterday", "3d ago"
  formatted: string;    // e.g. "2026-08-14 15:36 (2h ago)"
}

/**
 * Formats an episode release timestamp into "YYYY-MM-DD HH:mm" format and calculates the relative time ago.
 * @param dateStr ISO date string or RFC-2822 date string from RSS feeds
 */
export function formatEpisodeDateTime(dateStr?: string): FormattedDateTime {
  if (!dateStr) {
    return {
      fullDateTime: '',
      timeAgo: '',
      formatted: '',
    };
  }

  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      return {
        fullDateTime: dateStr,
        timeAgo: '',
        formatted: dateStr,
      };
    }

    // Format strictly as YYYY-MM-DD HH:mm (24-hour time)
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const fullDateTime = `${year}-${month}-${day} ${hours}:${minutes}`;

    // Calculate relative time ago
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    
    // In case of slight clock discrepancies / future scheduled dates
    if (diffMs < 0 && diffMs > -60000) {
      return {
        fullDateTime,
        timeAgo: 'just now',
        formatted: `${fullDateTime} (just now)`,
      };
    }

    const diffSeconds = Math.max(0, Math.floor(diffMs / 1000));
    const diffMins = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    let timeAgo = '';
    if (diffMins < 1) {
      timeAgo = 'just now';
    } else if (diffMins < 60) {
      timeAgo = `${diffMins}m ago`;
    } else if (diffHours < 24) {
      timeAgo = `${diffHours}h ago`;
    } else if (diffDays === 1) {
      timeAgo = '1d ago';
    } else if (diffDays < 30) {
      timeAgo = `${diffDays}d ago`;
    } else if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      timeAgo = `${months}mo ago`;
    } else {
      const years = Math.floor(diffDays / 365);
      timeAgo = `${years}y ago`;
    }

    return {
      fullDateTime,
      timeAgo,
      formatted: `${fullDateTime} (${timeAgo})`,
    };
  } catch {
    return {
      fullDateTime: dateStr,
      timeAgo: '',
      formatted: dateStr,
    };
  }
}
