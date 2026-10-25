import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import Parser from "rss-parser";
import { GoogleGenAI } from "@google/genai";

const parser = new Parser({
  headers: {
    'User-Agent': 'Overcast/3.0 (+http://overcast.fm/; podcast parser)',
    'Accept': 'application/rss+xml, application/xml, text/xml, application/atom+xml, */*'
  },
  customFields: {
    item: [
      ['itunes:duration', 'itunesDuration'],
      ['itunes:image', 'itunesImage'],
      ['itunes:summary', 'itunesSummary'],
      ['itunes:episode', 'itunesEpisode'],
      ['itunes:season', 'itunesSeason'],
      ['media:content', 'mediaContent']
    ],
  },
  timeout: 12000,
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Initialize Gemini API client on server-side
  let aiClient: GoogleGenAI | null = null;
  function getAIClient() {
    if (!aiClient && process.env.GEMINI_API_KEY) {
      aiClient = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
    }
    return aiClient;
  }

  // Helper to format duration string
  function formatDuration(rawDuration: any): string {
    if (!rawDuration) return 'Unknown';
    if (typeof rawDuration === 'number') {
      const mins = Math.floor(rawDuration / 60);
      const secs = Math.floor(rawDuration % 60);
      return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }
    const str = String(rawDuration).trim();
    if (str.includes(':')) {
      const parts = str.split(':');
      if (parts.length === 2) {
        return `${parseInt(parts[0], 10)}m ${parseInt(parts[1], 10)}s`;
      }
      if (parts.length === 3) {
        return `${parseInt(parts[0], 10)}h ${parseInt(parts[1], 10)}m`;
      }
      return str;
    }
    const num = parseInt(str, 10);
    if (!isNaN(num)) {
      const mins = Math.floor(num / 60);
      const secs = num % 60;
      return `${mins}m ${secs}s`;
    }
    return str;
  }

  // 1. Podcast Search Endpoint (iTunes API Proxy)
  app.get("/api/podcasts/search", async (req, res) => {
    try {
      const query = (req.query.q as string) || "news briefing";
      const itunesUrl = `https://itunes.apple.com/search?media=podcast&entity=podcast&term=${encodeURIComponent(query)}&limit=24`;
      
      const response = await fetch(itunesUrl);
      if (!response.ok) {
        throw new Error(`iTunes API returned status ${response.status}`);
      }
      const data = await response.json();
      
      const results = (data.results || []).map((item: any) => ({
        id: String(item.collectionId || item.trackId),
        title: item.collectionName || item.trackName || 'Unknown Podcast',
        artist: item.artistName || 'Unknown Host',
        feedUrl: item.feedUrl || '',
        artworkUrl: item.artworkUrl600 || item.artworkUrl100 || item.artworkUrl60 || '',
        category: item.primaryGenreName || 'News',
        trackCount: item.trackCount || 0
      })).filter((p: any) => p.feedUrl !== '');

      res.json({ results });
    } catch (err: any) {
      console.error("Error searching podcasts:", err);
      res.status(500).json({ error: "Failed to search podcasts", details: err.message });
    }
  });

  // 2. Podcast RSS Feed Endpoint
  app.get("/api/podcasts/feed", async (req, res) => {
    const feedUrl = req.query.url as string;
    if (!feedUrl) {
      res.status(400).json({ error: "Missing 'url' query parameter" });
      return;
    }

    try {
      let feed: any;

      // Fetch with podcast parser headers and parse XML
      try {
        const fetchRes = await fetch(feedUrl, {
          headers: {
            'User-Agent': 'Overcast/3.0 (+http://overcast.fm/; podcast parser)',
            'Accept': 'application/rss+xml, application/xml, text/xml, application/atom+xml, */*'
          },
          redirect: 'follow'
        });

        if (!fetchRes.ok) {
          throw new Error(`Feed server returned status ${fetchRes.status}`);
        }

        const xmlText = await fetchRes.text();
        feed = await parser.parseString(xmlText);
      } catch (fetchErr: any) {
        // Fallback: direct parser.parseURL
        feed = await parser.parseURL(feedUrl);
      }

      const podcastArtwork = feed.image?.url || feed.itunes?.image || '';
      const podcastTitle = feed.title || 'Podcast';

      const items = (feed.items || []).map((item: any, idx: number) => {
        // Locate audio enclosure
        let audioUrl = item.enclosure?.url;
        if (!audioUrl && item.mediaContent && item.mediaContent.$) {
          audioUrl = item.mediaContent.$.url;
        }
        if (!audioUrl && item.mediaContent && Array.isArray(item.mediaContent)) {
          const found = item.mediaContent.find((m: any) => m.$?.url && m.$?.type?.includes('audio'));
          if (found) audioUrl = found.$.url;
        }

        // Clean description/content
        let rawDesc = item.contentSnippet || item.itunesSummary || item.summary || item.content || item.description || '';
        // Strip HTML tags for cleaner reading
        const cleanDesc = rawDesc.replace(/<[^>]*>?/gm, '').trim();

        return {
          id: item.guid || item.id || `ep-${idx}-${Date.now()}`,
          title: item.title || `Episode ${idx + 1}`,
          audioUrl: audioUrl || '',
          pubDate: item.pubDate || item.isoDate || new Date().toISOString(),
          duration: formatDuration(item.itunesDuration || item.itunes?.duration),
          description: cleanDesc,
          podcastTitle,
          podcastArtwork: podcastArtwork || item.itunesImage?.href || ''
        };
      }).filter((ep: any) => ep.audioUrl !== '');

      res.json({
        podcast: {
          title: feed.title || 'Unknown Podcast',
          description: feed.description || feed.itunes?.summary || '',
          artworkUrl: podcastArtwork,
          link: feed.link || ''
        },
        episodes: items,
        latestEpisode: items[0] || null
      });
    } catch (err: any) {
      console.warn(`[RSS Parser] Notice: Unable to parse feed for ${feedUrl} (${err.message})`);
      res.status(404).json({ error: "Failed to parse podcast feed", details: err.message });
    }
  });

  // 3. AI News Executive Summary Endpoint
  app.post("/api/podcasts/briefing-summary", async (req, res) => {
    try {
      const { episodes } = req.body;
      if (!episodes || !Array.isArray(episodes) || episodes.length === 0) {
        res.status(400).json({ error: "No episodes provided for briefing summary" });
        return;
      }

      const ai = getAIClient();
      if (!ai) {
        res.status(503).json({ 
          error: "Gemini API Key is not configured. Please add GEMINI_API_KEY in Secrets." 
        });
        return;
      }

      const episodesText = episodes.map((ep: any, i: number) => `
Podcast #${i + 1}: ${ep.podcastTitle}
Episode Title: ${ep.title}
Published: ${ep.pubDate}
Notes/Description: ${ep.description ? ep.description.slice(0, 600) : 'No description provided.'}
`).join("\n---\n");

      const prompt = `You are a world-class broadcast executive news editor. 
Analyze the following latest news podcast episode show notes and titles from a user's custom daily news briefing list:

${episodesText}

Synthesize these into a crisp, high-level Executive Daily News Summary that gives the listener a clear overview of today's key stories before they listen.

Please return a valid JSON object matching this exact schema:
{
  "overallHighlights": ["3 to 4 punchy key bullet points summarizing the top breaking news across all podcasts"],
  "topics": [
    {
      "title": "Topic Name (e.g. World Affairs, Economy & Markets, Tech & Innovation, Domestic Politics)",
      "bulletPoints": ["2 to 3 concise bullet points for this topic area"]
    }
  ],
  "briefingScript": "A 2-sentence conversational anchor intro summarizing today's news mood (e.g., 'Good morning. Today's news briefing focuses heavily on central bank inflation decisions, global trade updates, and key technology earnings...')"
}
`;

      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      });

      const responseText = response.text || "{}";
      const summaryData = JSON.parse(responseText);

      res.json({
        summary: {
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          totalEpisodes: episodes.length,
          overallHighlights: summaryData.overallHighlights || [],
          topics: summaryData.topics || [],
          briefingScript: summaryData.briefingScript || ''
        }
      });
    } catch (err: any) {
      console.error("Error generating briefing summary:", err);
      res.status(500).json({ error: "Failed to generate AI news summary", details: err.message });
    }
  });

  // Vite middleware for development vs static serve in production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`News Briefing server running on http://localhost:${PORT}`);
  });
}

startServer();
