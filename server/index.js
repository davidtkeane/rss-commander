import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Simple XML parser helpers
function extractText(xml, tag) {
  const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return match ? match[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim() : '';
}

function extractAll(xml, tag) {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'gi');
  const results = [];
  let match;
  while ((match = regex.exec(xml)) !== null) {
    results.push(match[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim());
  }
  return results;
}

function parseRSSItems(xml) {
  const items = [];
  // Try RSS 2.0 items
  const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi;
  let itemMatch;
  while ((itemMatch = itemRegex.exec(xml)) !== null) {
    const itemXml = itemMatch[1];
    const title = extractText(itemXml, 'title') || 'Untitled';
    const link = extractText(itemXml, 'link') || extractText(itemXml, 'guid') || '';
    const pubDate = extractText(itemXml, 'pubDate') || extractText(itemXml, 'dc:date') || '';
    const description = extractText(itemXml, 'description') || extractText(itemXml, 'summary') || '';
    const guid = extractText(itemXml, 'guid') || link;
    items.push({ title, link, pubDate, description, guid });
  }

  // Try Atom entries if no RSS items found
  if (items.length === 0) {
    const entryRegex = /<entry[^>]*>([\s\S]*?)<\/entry>/gi;
    let entryMatch;
    while ((entryMatch = entryRegex.exec(xml)) !== null) {
      const entryXml = entryMatch[1];
      const title = extractText(entryXml, 'title') || 'Untitled';
      const linkMatch = entryXml.match(/<link[^>]*href=["']([^"']+)["'][^>]*\/?>/i);
      const link = linkMatch ? linkMatch[1] : extractText(entryXml, 'id') || '';
      const pubDate = extractText(entryXml, 'updated') || extractText(entryXml, 'published') || '';
      const description = extractText(entryXml, 'summary') || extractText(entryXml, 'content') || '';
      const guid = extractText(entryXml, 'id') || link;
      items.push({ title, link, pubDate, description, guid });
    }
  }

  return items.slice(0, 50);
}

function getFeedTitle(xml) {
  // Try channel title first (RSS 2.0)
  const channelMatch = xml.match(/<channel[^>]*>([\s\S]*?)<\/channel>/i);
  if (channelMatch) {
    return extractText(channelMatch[1], 'title') || '';
  }
  // Try Atom feed title
  const feedMatch = xml.match(/<feed[^>]*>([\s\S]*?)<\/feed>/i);
  if (feedMatch) {
    return extractText(feedMatch[1], 'title') || '';
  }
  return '';
}

// Parse RSS feed
app.post('/api/rss/parse', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ success: false, error: 'URL required' });

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'RSS-Commander/1.0 (Security Feed Aggregator)',
        'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      return res.json({ success: false, error: `HTTP ${response.status}: ${response.statusText}` });
    }

    const xml = await response.text();
    const items = parseRSSItems(xml);
    const feedTitle = getFeedTitle(xml);

    res.json({ success: true, items, feedTitle, itemCount: items.length });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Fetch failed';
    res.json({ success: false, error: msg });
  }
});

// Test a feed URL (returns preview)
app.post('/api/rss/test', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ success: false, error: 'URL required' });

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'RSS-Commander/1.0',
        'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*',
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      return res.json({ success: false, error: `HTTP ${response.status}` });
    }

    const xml = await response.text();
    const items = parseRSSItems(xml);
    const feedTitle = getFeedTitle(xml);

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

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'RSS Commander Proxy', timestamp: Date.now() });
});

app.listen(PORT, () => {
  console.log(`\n🎖️  RSS Commander Proxy running on http://localhost:${PORT}`);
  console.log(`   POST /api/rss/parse  — fetch & parse RSS feed`);
  console.log(`   POST /api/rss/test   — test feed URL`);
  console.log(`   GET  /api/health     — health check\n`);
});
