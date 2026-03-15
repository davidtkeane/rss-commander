import type { RSSFeed, RSSSettings, UserProfile, RSSCategory } from '../types';

export function generateOPML(feeds: RSSFeed[]): string {
  const categories = [...new Set(feeds.map(f => f.category))];
  const categoryBlocks = categories.map(cat => {
    const catFeeds = feeds.filter(f => f.category === cat);
    const feedLines = catFeeds
      .map(f => `      <outline type="rss" text="${escapeXml(f.name)}" title="${escapeXml(f.name)}" xmlUrl="${escapeXml(f.url)}" category="${f.category}" />`)
      .join('\n');
    return `    <outline text="${cat}" title="${cat}">\n${feedLines}\n    </outline>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <head>
    <title>RSS Commander Feeds</title>
    <dateCreated>${new Date().toUTCString()}</dateCreated>
    <ownerName>RSS Commander</ownerName>
  </head>
  <body>
${categoryBlocks}
  </body>
</opml>`;
}

export function parseOPML(xml: string): Partial<RSSFeed>[] {
  const results: Partial<RSSFeed>[] = [];
  const outlineRegex = /<outline[^>]*xmlUrl=["']([^"']+)["'][^>]*\/?>/gi;
  let match;
  while ((match = outlineRegex.exec(xml)) !== null) {
    const attrs = match[0];
    const url = getAttr(attrs, 'xmlUrl');
    const name = getAttr(attrs, 'title') || getAttr(attrs, 'text') || url;
    const cat = (getAttr(attrs, 'category') as RSSCategory) || 'news';
    if (url) results.push({ name, url, category: cat, enabled: true });
  }
  return results;
}

export function generateJSON(feeds: RSSFeed[], settings: RSSSettings, profile: UserProfile): string {
  return JSON.stringify({ version: '1.0', exportedAt: new Date().toISOString(), feeds, settings, profile }, null, 2);
}

export function parseJSON(json: string): {
  feeds?: Partial<RSSFeed>[];
  settings?: Partial<RSSSettings>;
  profile?: Partial<UserProfile>;
} {
  try {
    const data = JSON.parse(json);
    return {
      feeds: Array.isArray(data.feeds) ? data.feeds : undefined,
      settings: data.settings ?? undefined,
      profile: data.profile ?? undefined,
    };
  } catch {
    return {};
  }
}

export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target?.result as string);
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

function escapeXml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function getAttr(tag: string, attr: string): string {
  const match = tag.match(new RegExp(`${attr}=["']([^"']*?)["']`, 'i'));
  return match ? match[1] : '';
}
