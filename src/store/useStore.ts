import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  RSSFeed, RSSItem, RSSSettings, UserProfile, VaultEntry,
  AppStats, ViewMode, RSSCategory,
} from '../types';
import { DEFAULT_SETTINGS, DEFAULT_FEEDS } from '../types';
import { generateOPML, generateJSON, parseOPML, parseJSON, downloadFile } from '../services/exportService';
import { generateId } from '../services/vaultService';

function hashCode(str: string): string {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(31, h) + str.charCodeAt(i) | 0;
  }
  return Math.abs(h).toString(36);
}

function makeFeedId(): string {
  return `feed_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function makeItemId(feedId: string, link: string): string {
  return `item_${feedId}_${hashCode(link || String(Math.random()))}`;
}

interface UIState {
  view: ViewMode;
  activeCategory: RSSCategory | 'all';
  searchQuery: string;
  selectedItemId: string | null;
  sidebarCollapsed: boolean;
  detailPaneOpen: boolean;
}

interface AppState {
  feeds: RSSFeed[];
  items: RSSItem[];
  settings: RSSSettings;
  profile: UserProfile;
  vault: VaultEntry[];
  stats: AppStats;
  ui: UIState;
  isLoading: boolean;
  isFetching: boolean;
  error: string | null;

  // Feed CRUD
  addFeed: (feed: Omit<RSSFeed, 'id' | 'lastFetched' | 'lastError' | 'itemCount'>) => void;
  removeFeed: (id: string) => void;
  toggleFeed: (id: string) => void;
  updateFeed: (id: string, updates: Partial<RSSFeed>) => void;
  initDefaultFeeds: () => void;

  // Item actions
  markRead: (id: string) => void;
  markAllRead: (category?: RSSCategory) => void;
  toggleStar: (id: string) => void;
  toggleSaved: (id: string) => void;

  // Fetch
  fetchAllFeeds: () => Promise<void>;
  refreshFeed: (feedId: string) => Promise<void>;

  // Settings
  updateSettings: (updates: Partial<RSSSettings>) => void;
  resetSettings: () => void;
  loadSettings: () => void;

  // Profile
  updateProfile: (updates: Partial<UserProfile>) => void;

  // Vault
  addVaultEntry: (entry: Omit<VaultEntry, 'id' | 'createdAt'>) => void;
  removeVaultEntry: (id: string) => void;
  updateVaultEntry: (id: string, updates: Partial<VaultEntry>) => void;

  // UI
  setView: (view: ViewMode) => void;
  setActiveCategory: (cat: RSSCategory | 'all') => void;
  setSearchQuery: (q: string) => void;
  setSelectedItem: (id: string | null) => void;
  toggleSidebar: () => void;

  // Import / Export
  exportOPML: () => void;
  exportJSON: () => void;
  importOPML: (xml: string) => void;
  importJSON: (json: string) => void;

  // Stats
  computeStats: () => void;
}

const DEFAULT_PROFILE: UserProfile = {
  id: 'user_1', name: 'Ranger', handle: 'IrishRanger',
  role: 'Security Researcher', organization: 'RangerPlex',
  createdAt: Date.now(),
};

const DEFAULT_STATS: AppStats = {
  totalFeeds: 0, enabledFeeds: 0, totalItems: 0,
  unreadItems: 0, starredItems: 0, savedItems: 0,
  lastRefresh: null, failedFeeds: 0,
};

const DEFAULT_UI: UIState = {
  view: 'dashboard', activeCategory: 'all', searchQuery: '',
  selectedItemId: null, sidebarCollapsed: false, detailPaneOpen: false,
};

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      feeds: [],
      items: [],
      settings: DEFAULT_SETTINGS,
      profile: DEFAULT_PROFILE,
      vault: [],
      stats: DEFAULT_STATS,
      ui: DEFAULT_UI,
      isLoading: false,
      isFetching: false,
      error: null,

      // ── Feed CRUD ────────────────────────────────────────────────
      addFeed: (feedData) => {
        const feed: RSSFeed = {
          ...feedData,
          id: makeFeedId(),
          lastFetched: null,
          lastError: null,
          itemCount: 0,
        };
        set(s => ({ feeds: [...s.feeds, feed] }));
        get().computeStats();
      },

      removeFeed: (id) => {
        set(s => ({
          feeds: s.feeds.filter(f => f.id !== id),
          items: s.items.filter(i => i.feedId !== id),
        }));
        get().computeStats();
      },

      toggleFeed: (id) => {
        set(s => ({
          feeds: s.feeds.map(f => f.id === id ? { ...f, enabled: !f.enabled } : f),
        }));
      },

      updateFeed: (id, updates) => {
        set(s => ({
          feeds: s.feeds.map(f => f.id === id ? { ...f, ...updates } : f),
        }));
      },

      initDefaultFeeds: () => {
        if (get().feeds.length === 0) {
          const feeds: RSSFeed[] = DEFAULT_FEEDS.map(f => ({
            ...f, id: makeFeedId(), lastFetched: null, lastError: null, itemCount: 0,
          }));
          set({ feeds });
          get().computeStats();
        }
      },

      // ── Items ────────────────────────────────────────────────────
      markRead: (id) => {
        set(s => ({ items: s.items.map(i => i.id === id ? { ...i, read: true } : i) }));
        get().computeStats();
      },

      markAllRead: (category) => {
        set(s => ({
          items: s.items.map(i =>
            (!category || i.category === category) ? { ...i, read: true } : i
          ),
        }));
        get().computeStats();
      },

      toggleStar: (id) => {
        set(s => ({
          items: s.items.map(i => i.id === id ? { ...i, starred: !i.starred } : i),
        }));
        get().computeStats();
      },

      toggleSaved: (id) => {
        set(s => ({
          items: s.items.map(i => i.id === id ? { ...i, saved: !i.saved } : i),
        }));
        get().computeStats();
      },

      // ── Fetch ────────────────────────────────────────────────────
      fetchAllFeeds: async () => {
        const { feeds, settings } = get();
        if (get().isFetching) return;
        set({ isFetching: true, error: null });

        const enabledFeeds = feeds.filter(f => f.enabled);
        const newItems: RSSItem[] = [];
        const updatedFeeds = [...feeds];
        let failedCount = 0;

        await Promise.allSettled(
          enabledFeeds.map(async (feed) => {
            try {
              const res = await fetch(`${settings.proxyUrl}/api/rss/parse`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: feed.url }),
                signal: AbortSignal.timeout(12000),
              });
              const data = await res.json();
              if (!data.success) throw new Error(data.error || 'Parse failed');

              const items: RSSItem[] = (data.items || []).slice(0, settings.maxItemsPerFeed).map((raw: {
                title?: string; link?: string; guid?: string; pubDate?: string; description?: string;
              }) => {
                const link = raw.link || raw.guid || '';
                const id = makeItemId(feed.id, link);
                // Preserve read/star/saved state from existing items
                const existing = get().items.find(i => i.id === id);
                return {
                  id,
                  feedId: feed.id,
                  feedName: feed.name,
                  title: raw.title || 'Untitled',
                  link,
                  pubDate: raw.pubDate || new Date().toISOString(),
                  description: raw.description || '',
                  category: feed.category,
                  read: existing?.read ?? false,
                  starred: existing?.starred ?? false,
                  saved: existing?.saved ?? false,
                };
              });

              newItems.push(...items);

              const idx = updatedFeeds.findIndex(f => f.id === feed.id);
              if (idx !== -1) {
                updatedFeeds[idx] = { ...updatedFeeds[idx], lastFetched: Date.now(), lastError: null, itemCount: items.length };
              }
            } catch (err) {
              failedCount++;
              const idx = updatedFeeds.findIndex(f => f.id === feed.id);
              if (idx !== -1) {
                updatedFeeds[idx] = {
                  ...updatedFeeds[idx],
                  lastError: err instanceof Error ? err.message : 'Fetch failed',
                };
              }
            }
          })
        );

        // Merge: keep existing read/star state, dedup by id
        const existingMap = new Map(get().items.map(i => [i.id, i]));
        for (const item of newItems) {
          const existing = existingMap.get(item.id);
          existingMap.set(item.id, existing ? { ...item, read: existing.read, starred: existing.starred, saved: existing.saved } : item);
        }

        const allItems = Array.from(existingMap.values())
          .sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime())
          .slice(0, 2000);

        set({ feeds: updatedFeeds, items: allItems, isFetching: false });
        get().computeStats();
      },

      refreshFeed: async (feedId) => {
        const feed = get().feeds.find(f => f.id === feedId);
        if (!feed) return;
        await get().fetchAllFeeds();
      },

      // ── Settings ─────────────────────────────────────────────────
      updateSettings: (updates) => set(s => ({ settings: { ...s.settings, ...updates } })),
      resetSettings: () => set({ settings: DEFAULT_SETTINGS }),
      loadSettings: () => { /* hydrated by persist middleware */ },

      // ── Profile ──────────────────────────────────────────────────
      updateProfile: (updates) => set(s => ({ profile: { ...s.profile, ...updates } })),

      // ── Vault ────────────────────────────────────────────────────
      addVaultEntry: (entry) => {
        const newEntry: VaultEntry = { ...entry, id: generateId(), createdAt: Date.now() };
        set(s => ({ vault: [...s.vault, newEntry] }));
      },
      removeVaultEntry: (id) => set(s => ({ vault: s.vault.filter(v => v.id !== id) })),
      updateVaultEntry: (id, updates) => set(s => ({
        vault: s.vault.map(v => v.id === id ? { ...v, ...updates } : v),
      })),

      // ── UI ───────────────────────────────────────────────────────
      setView: (view) => set(s => ({ ui: { ...s.ui, view } })),
      setActiveCategory: (cat) => set(s => ({ ui: { ...s.ui, activeCategory: cat } })),
      setSearchQuery: (q) => set(s => ({ ui: { ...s.ui, searchQuery: q } })),
      setSelectedItem: (id) => set(s => ({
        ui: { ...s.ui, selectedItemId: id, detailPaneOpen: id !== null },
      })),
      toggleSidebar: () => set(s => ({
        ui: { ...s.ui, sidebarCollapsed: !s.ui.sidebarCollapsed },
      })),

      // ── Import/Export ────────────────────────────────────────────
      exportOPML: () => {
        const opml = generateOPML(get().feeds);
        downloadFile(opml, `rss-commander-feeds-${Date.now()}.opml`, 'text/xml');
      },
      exportJSON: () => {
        const json = generateJSON(get().feeds, get().settings, get().profile);
        downloadFile(json, `rss-commander-backup-${Date.now()}.json`, 'application/json');
      },
      importOPML: (xml) => {
        const imported = parseOPML(xml);
        imported.forEach(f => {
          if (f.url && !get().feeds.some(existing => existing.url === f.url)) {
            get().addFeed({
              name: f.name || f.url || 'Imported Feed',
              url: f.url,
              category: f.category || 'news',
              enabled: true,
            });
          }
        });
        get().computeStats();
      },
      importJSON: (json) => {
        const data = parseJSON(json);
        if (data.feeds) {
          data.feeds.forEach(f => {
            if (f.url && !get().feeds.some(existing => existing.url === f.url)) {
              get().addFeed({
                name: f.name || f.url || 'Imported Feed',
                url: f.url || '',
                category: f.category || 'news',
                enabled: f.enabled ?? true,
              });
            }
          });
        }
        if (data.settings) get().updateSettings(data.settings);
        get().computeStats();
      },

      // ── Stats ────────────────────────────────────────────────────
      computeStats: () => {
        const { feeds, items } = get();
        set({
          stats: {
            totalFeeds: feeds.length,
            enabledFeeds: feeds.filter(f => f.enabled).length,
            totalItems: items.length,
            unreadItems: items.filter(i => !i.read).length,
            starredItems: items.filter(i => i.starred).length,
            savedItems: items.filter(i => i.saved).length,
            lastRefresh: feeds.reduce((max, f) => Math.max(max, f.lastFetched ?? 0), 0) || null,
            failedFeeds: feeds.filter(f => f.lastError !== null).length,
          },
        });
      },
    }),
    {
      name: 'rss-commander-store',
      partialize: (s) => ({
        feeds: s.feeds,
        items: s.items,
        settings: s.settings,
        profile: s.profile,
        vault: s.vault,
      }),
    }
  )
);
