export type RSSCategory = 'pentesting' | 'malware' | 'forensics' | 'news' | 'dataGov' | 'blockchain';
export type ViewMode = 'dashboard' | 'ticker' | 'feeds' | 'settings' | 'profile' | 'vault';
export type ArticleLayout = 'cards' | 'list' | 'compact' | 'magazine';
export type TickerSpeed = 'slow' | 'normal' | 'fast' | 'turbo';
export type ThemeMode = 'dark' | 'darker' | 'midnight';
export type SortOrder = 'newest' | 'oldest' | 'unread' | 'alpha';

export interface RSSFeed {
  id: string;
  name: string;
  url: string;
  category: RSSCategory;
  enabled: boolean;
  lastFetched: number | null;
  lastError: string | null;
  itemCount: number;
  description?: string;
  tags?: string[];
  notifyOnNew?: boolean;
}

export interface RSSItem {
  id: string;
  feedId: string;
  feedName: string;
  title: string;
  link: string;
  pubDate: string; // ISO string for serialization
  description: string;
  content?: string;
  category: RSSCategory;
  read: boolean;
  starred: boolean;
  saved: boolean;
  author?: string;
}

export interface RSSSettings {
  tickerEnabled: boolean;
  tickerSpeed: TickerSpeed;
  tickerHeight: 'sm' | 'md' | 'lg';
  tickerPauseOnHover: boolean;
  tickerShowCategory: boolean;
  tickerShowTime: boolean;
  tickerMaxItems: number;
  articleLayout: ArticleLayout;
  theme: ThemeMode;
  fontSize: 'sm' | 'md' | 'lg';
  showDescriptions: boolean;
  showReadTime: boolean;
  autoRefreshInterval: number;
  maxItemsPerFeed: number;
  enabledCategories: RSSCategory[];
  sortOrder: SortOrder;
  hideReadItems: boolean;
  showOnlyStarred: boolean;
  keywordFilter: string[];
  keywordBlacklist: string[];
  desktopNotifications: boolean;
  notifyCategories: RSSCategory[];
  proxyUrl: string;
  aiEnabled: boolean;
  aiProvider: 'openai' | 'anthropic' | 'ollama' | 'none';
  aiModel: string;
}

export interface UserProfile {
  id: string;
  name: string;
  handle: string;
  bio?: string;
  role: string;
  organization?: string;
  email?: string;
  website?: string;
  createdAt: number;
}

export interface VaultEntry {
  id: string;
  label: string;
  service: string;
  keyType: 'api_key' | 'secret' | 'token' | 'password' | 'webhook' | 'other';
  value: string;
  description?: string;
  createdAt: number;
  lastUsed?: number;
  expiresAt?: number;
  tags?: string[];
  isMasked: boolean;
}

export interface AppStats {
  totalFeeds: number;
  enabledFeeds: number;
  totalItems: number;
  unreadItems: number;
  starredItems: number;
  savedItems: number;
  lastRefresh: number | null;
  failedFeeds: number;
}

export interface CategoryConfig {
  id: RSSCategory;
  name: string;
  shortName: string;
  color: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
  emoji: string;
  description: string;
}

export const CATEGORY_CONFIGS: Record<RSSCategory, CategoryConfig> = {
  pentesting: {
    id: 'pentesting', name: 'Penetration Testing', shortName: 'PENTEST',
    color: '#f59e0b', bgClass: 'bg-amber-500/10', textClass: 'text-amber-400', borderClass: 'border-amber-500/40',
    emoji: '🔓', description: 'Red team, exploit research, offensive security',
  },
  malware: {
    id: 'malware', name: 'Malware Analysis', shortName: 'MALWARE',
    color: '#ef4444', bgClass: 'bg-red-500/10', textClass: 'text-red-400', borderClass: 'border-red-500/40',
    emoji: '🦠', description: 'Threat intelligence, malware samples, IOCs',
  },
  forensics: {
    id: 'forensics', name: 'Digital Forensics', shortName: 'DFIR',
    color: '#3b82f6', bgClass: 'bg-blue-500/10', textClass: 'text-blue-400', borderClass: 'border-blue-500/40',
    emoji: '🔍', description: 'Incident response, forensic analysis',
  },
  news: {
    id: 'news', name: 'Cyber News', shortName: 'NEWS',
    color: '#22c55e', bgClass: 'bg-green-500/10', textClass: 'text-green-400', borderClass: 'border-green-500/40',
    emoji: '📰', description: 'General cybersecurity news and updates',
  },
  dataGov: {
    id: 'dataGov', name: 'Data Governance', shortName: 'GOV',
    color: '#14b8a6', bgClass: 'bg-teal-500/10', textClass: 'text-teal-400', borderClass: 'border-teal-500/40',
    emoji: '🛡️', description: 'GDPR, privacy, compliance, data protection',
  },
  blockchain: {
    id: 'blockchain', name: 'Blockchain', shortName: 'CHAIN',
    color: '#8b5cf6', bgClass: 'bg-violet-500/10', textClass: 'text-violet-400', borderClass: 'border-violet-500/40',
    emoji: '⛓️', description: 'Crypto, DeFi, Web3 security and news',
  },
};

export const DEFAULT_SETTINGS: RSSSettings = {
  tickerEnabled: true, tickerSpeed: 'normal', tickerHeight: 'md',
  tickerPauseOnHover: true, tickerShowCategory: true, tickerShowTime: true, tickerMaxItems: 50,
  articleLayout: 'cards', theme: 'darker', fontSize: 'md',
  showDescriptions: true, showReadTime: true,
  autoRefreshInterval: 15, maxItemsPerFeed: 30,
  enabledCategories: ['pentesting', 'malware', 'forensics', 'news', 'dataGov', 'blockchain'],
  sortOrder: 'newest',
  hideReadItems: false, showOnlyStarred: false, keywordFilter: [], keywordBlacklist: [],
  desktopNotifications: false, notifyCategories: ['malware', 'pentesting'],
  proxyUrl: 'http://localhost:3001',
  aiEnabled: false, aiProvider: 'none', aiModel: '',
};

export const DEFAULT_FEEDS: Omit<RSSFeed, 'id' | 'lastFetched' | 'lastError' | 'itemCount'>[] = [
  { name: 'The Hacker News', url: 'https://feeds.feedburner.com/TheHackersNews', category: 'pentesting', enabled: true },
  { name: 'Krebs on Security', url: 'https://krebsonsecurity.com/feed/', category: 'pentesting', enabled: true },
  { name: 'SANS ISC', url: 'https://isc.sans.edu/rssfeed.xml', category: 'pentesting', enabled: true },
  { name: 'Dark Reading', url: 'https://www.darkreading.com/rss.xml', category: 'pentesting', enabled: true },
  { name: 'CISA Advisories', url: 'https://www.cisa.gov/cybersecurity-advisories/all.xml', category: 'pentesting', enabled: true },
  { name: 'ExploitDB', url: 'https://www.exploit-db.com/rss.xml', category: 'pentesting', enabled: true },
  { name: 'Rapid7 Blog', url: 'https://blog.rapid7.com/rss/', category: 'pentesting', enabled: false },
  { name: 'PortSwigger Research', url: 'https://portswigger.net/research/rss', category: 'pentesting', enabled: false },
  { name: 'Kaspersky Securelist', url: 'https://securelist.com/feed/', category: 'malware', enabled: true },
  { name: 'Malwarebytes Labs', url: 'https://blog.malwarebytes.com/feed/', category: 'malware', enabled: true },
  { name: 'ESET WeLiveSecurity', url: 'https://www.welivesecurity.com/feed/', category: 'malware', enabled: true },
  { name: 'Unit42 Palo Alto', url: 'https://unit42.paloaltonetworks.com/feed/', category: 'malware', enabled: true },
  { name: 'CrowdStrike Blog', url: 'https://www.crowdstrike.com/blog/feed/', category: 'malware', enabled: true },
  { name: 'ANY.RUN Blog', url: 'https://any.run/cybersecurity-blog/feed/', category: 'malware', enabled: false },
  { name: 'The DFIR Report', url: 'https://thedfirreport.com/feed/', category: 'forensics', enabled: true },
  { name: 'Forensic Focus', url: 'https://www.forensicfocus.com/feed/', category: 'forensics', enabled: true },
  { name: 'Huntress Blog', url: 'https://www.huntress.com/blog/rss.xml', category: 'forensics', enabled: true },
  { name: 'Intezer Blog', url: 'https://www.intezer.com/blog/feed/', category: 'forensics', enabled: false },
  { name: 'BleepingComputer', url: 'https://www.bleepingcomputer.com/feed/', category: 'news', enabled: true },
  { name: 'SecurityWeek', url: 'https://www.securityweek.com/feed/', category: 'news', enabled: true },
  { name: 'Cyberscoop', url: 'https://www.cyberscoop.com/feed/', category: 'news', enabled: true },
  { name: 'Infosecurity Magazine', url: 'https://www.infosecurity-magazine.com/rss/news/', category: 'news', enabled: true },
  { name: 'Ars Technica Security', url: 'https://feeds.arstechnica.com/arstechnica/security', category: 'news', enabled: false },
  { name: 'IAPP News', url: 'https://iapp.org/news/feed/', category: 'dataGov', enabled: true },
  { name: 'EFF Updates', url: 'https://www.eff.org/rss/updates.xml', category: 'dataGov', enabled: true },
  { name: 'NOYB', url: 'https://noyb.eu/en/rss.xml', category: 'dataGov', enabled: true },
  { name: 'Inside Privacy', url: 'https://www.insideprivacy.com/feed/', category: 'dataGov', enabled: false },
  { name: 'Cointelegraph', url: 'https://cointelegraph.com/rss', category: 'blockchain', enabled: true },
  { name: 'CryptoSlate', url: 'https://cryptoslate.com/feed/', category: 'blockchain', enabled: true },
  { name: 'CoinDesk', url: 'https://www.coindesk.com/arc/outboundfeeds/rss/', category: 'blockchain', enabled: false },
];
