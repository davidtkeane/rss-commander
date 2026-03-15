import express from 'express';
import cors from 'cors';
import { saveArticles, searchArticles, getArchiveStats } from './db.js';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// ── XML parser helpers ────────────────────────────────────────────────────────

function extractText(xml, tag) {
  const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return match ? match[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim() : '';
}

function parseRSSItems(xml) {
  const items = [];

  // RSS 2.0
  const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi;
  let m;
  while ((m = itemRegex.exec(xml)) !== null) {
    const x = m[1];
    const link = extractText(x, 'link') || extractText(x, 'guid') || '';
    items.push({
      title: extractText(x, 'title') || 'Untitled',
      link,
      pubDate: extractText(x, 'pubDate') || extractText(x, 'dc:date') || '',
      description: extractText(x, 'description') || extractText(x, 'summary') || '',
      guid: extractText(x, 'guid') || link,
    });
  }

  // Atom (fallback)
  if (items.length === 0) {
    const entryRegex = /<entry[^>]*>([\s\S]*?)<\/entry>/gi;
    while ((m = entryRegex.exec(xml)) !== null) {
      const x = m[1];
      const linkMatch = x.match(/<link[^>]*href=["']([^"']+)["'][^>]*\/?>/i);
      const link = linkMatch ? linkMatch[1] : extractText(x, 'id') || '';
      items.push({
        title: extractText(x, 'title') || 'Untitled',
        link,
        pubDate: extractText(x, 'updated') || extractText(x, 'published') || '',
        description: extractText(x, 'summary') || extractText(x, 'content') || '',
        guid: extractText(x, 'id') || link,
      });
    }
  }

  return items.slice(0, 50);
}

function getFeedTitle(xml) {
  const channelMatch = xml.match(/<channel[^>]*>([\s\S]*?)<\/channel>/i);
  if (channelMatch) return extractText(channelMatch[1], 'title') || '';
  const feedMatch = xml.match(/<feed[^>]*>([\s\S]*?)<\/feed>/i);
  if (feedMatch) return extractText(feedMatch[1], 'title') || '';
  return '';
}

// ── Shared fetch helper ───────────────────────────────────────────────────────

const SHARED_HEADERS = {
  'User-Agent': 'RSS-Commander/1.0 (Security Feed Aggregator)',
  'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*',
};

async function fetchAndParseXML(url, timeoutMs = 10000) {
  const response = await fetch(url, {
    headers: SHARED_HEADERS,
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  const xml = await response.text();
  return { xml, items: parseRSSItems(xml), feedTitle: getFeedTitle(xml) };
}

// ── Feed endpoints ────────────────────────────────────────────────────────────

app.post('/api/rss/parse', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ success: false, error: 'URL required' });
  try {
    const { items, feedTitle } = await fetchAndParseXML(url, 10000);
    res.json({ success: true, items, feedTitle, itemCount: items.length });
  } catch (err) {
    res.json({ success: false, error: err instanceof Error ? err.message : 'Fetch failed' });
  }
});

app.post('/api/rss/test', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ success: false, error: 'URL required' });
  try {
    const { items, feedTitle } = await fetchAndParseXML(url, 8000);
    res.json({
      success: true,
      feedTitle,
      itemCount: items.length,
      preview: items.slice(0, 3).map(i => ({ title: i.title, pubDate: i.pubDate })),
    });
  } catch (err) {
    res.json({ success: false, error: err instanceof Error ? err.message : 'Failed' });
  }
});

// ── Archive endpoints ─────────────────────────────────────────────────────────

/** Bulk-save articles after each fetch (fire-and-forget from client). */
app.post('/api/articles/save', (req, res) => {
  const { items } = req.body;
  if (!Array.isArray(items)) return res.status(400).json({ success: false, error: 'items array required' });
  try {
    saveArticles(items.map(i => ({
      id: i.id,
      feedId: i.feedId,
      feedName: i.feedName,
      category: i.category,
      title: i.title,
      description: i.description || null,
      link: i.link,
      pubDate: i.pubDate || null,
      author: i.author || null,
    })));
    res.json({ success: true, saved: items.length });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'DB error' });
  }
});

/** FTS5 full-text search with optional category filter. */
app.get('/api/search', (req, res) => {
  const { q, category, limit = '50', offset = '0' } = req.query;
  if (!q || String(q).trim().length === 0) {
    return res.status(400).json({ success: false, error: 'q (search query) required' });
  }
  try {
    const results = searchArticles(
      String(q).trim(),
      category ? String(category) : null,
      Math.min(parseInt(limit, 10) || 50, 200),
      parseInt(offset, 10) || 0,
    );
    res.json({ success: true, results, total: results.length });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Search failed' });
  }
});

/** Archive stats: total count, date range, per-category breakdown. */
app.get('/api/articles/stats', (_req, res) => {
  try {
    res.json({ success: true, ...getArchiveStats() });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'DB error' });
  }
});

// ── Health ────────────────────────────────────────────────────────────────────

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'RSS Commander Proxy', timestamp: Date.now() });
});

app.listen(PORT, () => {
  console.log(`\n🎖️  RSS Commander Proxy running on http://localhost:${PORT}`);
  console.log(`   POST /api/rss/parse        — fetch & parse RSS feed`);
  console.log(`   POST /api/rss/test         — test feed URL (preview)`);
  console.log(`   POST /api/articles/save    — bulk-archive articles`);
  console.log(`   GET  /api/search?q=…       — FTS5 full-text search`);
  console.log(`   GET  /api/articles/stats   — archive statistics`);
  console.log(`   GET  /api/health           — health check\n`);
});
