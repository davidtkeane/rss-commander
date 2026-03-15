import { useState } from 'react';
import clsx from 'clsx';
import {
  LayoutDashboard, Database, KeyRound, Settings, User,
  RefreshCw, Search, Grid3X3, List, AlignJustify, ChevronLeft,
  ChevronRight, Rss, ExternalLink, Star, Bookmark, Clock, X, Archive,
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { CATEGORY_CONFIGS } from '../../types';
import type { ViewMode, RSSCategory, ArticleLayout } from '../../types';
import { formatDistanceToNow } from 'date-fns';

interface Props { children: React.ReactNode; }

const NAV_ITEMS: { id: ViewMode; label: string; icon: React.ReactNode }[] = [
  { id: 'dashboard', label: 'Dashboard',    icon: <LayoutDashboard size={16} /> },
  { id: 'ticker',    label: 'Ticker View',  icon: <Rss size={16} /> },
  { id: 'feeds',     label: 'Feed Manager', icon: <Database size={16} /> },
  { id: 'archive',   label: 'Archive',      icon: <Archive size={16} /> },
  { id: 'vault',     label: 'API Vault',    icon: <KeyRound size={16} /> },
  { id: 'settings',  label: 'Settings',     icon: <Settings size={16} /> },
  { id: 'profile',   label: 'Profile',      icon: <User size={16} /> },
];

export default function AppLayout({ children }: Props) {
  const {
    ui, stats, feeds, items, settings,
    setView, setActiveCategory, setSearchQuery, setSelectedItem,
    toggleSidebar, updateSettings, fetchAllFeeds, isFetching,
    markRead, toggleStar, toggleSaved,
  } = useStore();

  const collapsed = ui.sidebarCollapsed;
  const selectedItem = items.find(i => i.id === ui.selectedItemId);

  // Category unread counts
  const catCounts = Object.fromEntries(
    Object.keys(CATEGORY_CONFIGS).map(cat => [
      cat,
      items.filter(i => i.category === (cat as RSSCategory) && !i.read).length,
    ])
  );

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* ── Sidebar ── */}
      <aside
        className="sidebar"
        style={{ width: collapsed ? 52 : 220 }}
      >
        {/* Logo */}
        <div className={clsx(
          'flex items-center gap-3 px-3 py-4 border-b border-[var(--border)]',
          collapsed && 'justify-center px-0'
        )}>
          <div className="w-7 h-7 rounded-md bg-brand flex items-center justify-center flex-shrink-0">
            <Rss size={14} color="#070709" strokeWidth={2.5} />
          </div>
          {!collapsed && (
            <div>
              <div className="font-display font-bold text-brand text-lg leading-none tracking-wider">RSS</div>
              <div className="font-ui text-[9px] text-[var(--text-muted)] uppercase tracking-[0.15em] leading-none mt-0.5">COMMANDER</div>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 overflow-y-auto overflow-x-hidden">
          <div className="space-y-0.5">
            {NAV_ITEMS.map(item => (
              <button
                key={item.id}
                onClick={() => setView(item.id)}
                className={clsx('nav-item w-full text-left', ui.view === item.id && 'active', collapsed && 'justify-center')}
                title={collapsed ? item.label : undefined}
              >
                <span className="flex-shrink-0">{item.icon}</span>
                {!collapsed && <span>{item.label}</span>}
              </button>
            ))}
          </div>

          {/* Category filters */}
          {!collapsed && (
            <div className="mt-5 px-3">
              <div className="section-header">Categories</div>
              <div className="space-y-0.5">
                <button
                  onClick={() => setActiveCategory('all')}
                  className={clsx('nav-item w-full text-left', ui.activeCategory === 'all' && 'active')}
                >
                  <span className="w-2 h-2 rounded-full bg-brand flex-shrink-0" />
                  <span className="flex-1">All Feeds</span>
                  <span className="font-mono text-[11px] text-[var(--text-muted)]">{stats.unreadItems}</span>
                </button>
                {(Object.values(CATEGORY_CONFIGS)).map(cfg => (
                  <button
                    key={cfg.id}
                    onClick={() => setActiveCategory(cfg.id)}
                    className={clsx('nav-item w-full text-left', ui.activeCategory === cfg.id && 'active')}
                  >
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: cfg.color }} />
                    <span className="flex-1">{cfg.shortName}</span>
                    {catCounts[cfg.id] > 0 && (
                      <span className="font-mono text-[11px]" style={{ color: cfg.color }}>{catCounts[cfg.id]}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </nav>

        {/* Stats footer */}
        {!collapsed && (
          <div className="border-t border-[var(--border)] px-4 py-3 space-y-1">
            <div className="flex justify-between text-[11px]">
              <span className="text-[var(--text-muted)] font-ui uppercase tracking-wide">Feeds</span>
              <span className="stat-number text-[var(--text-secondary)]">{stats.enabledFeeds}/{stats.totalFeeds}</span>
            </div>
            <div className="flex justify-between text-[11px]">
              <span className="text-[var(--text-muted)] font-ui uppercase tracking-wide">Unread</span>
              <span className="stat-number text-brand">{stats.unreadItems}</span>
            </div>
            {stats.lastRefresh && (
              <div className="text-[10px] text-[var(--text-muted)] font-mono mt-1">
                {formatDistanceToNow(stats.lastRefresh, { addSuffix: true })}
              </div>
            )}
          </div>
        )}

        {/* Collapse toggle */}
        <button
          onClick={toggleSidebar}
          className="border-t border-[var(--border)] py-2 w-full flex items-center justify-center text-[var(--text-muted)] hover:text-brand transition-colors"
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </aside>

      {/* ── Main ── */}
      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* TopBar */}
          <div className="flex items-center gap-3 px-4 py-2 border-b border-[var(--border)] bg-[var(--bg-secondary)] flex-shrink-0 h-12">
            {/* Search */}
            <div className="flex-1 relative max-w-sm">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                type="text"
                placeholder="Search headlines..."
                value={ui.searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="cyber-input pl-8 py-1.5 text-sm h-8"
              />
            </div>

            {/* Layout toggles */}
            <div className="flex items-center border border-[var(--border)] rounded-md overflow-hidden">
              {(['cards', 'list', 'compact'] as ArticleLayout[]).map((layout, i) => {
                const icons = [<Grid3X3 size={13} />, <List size={13} />, <AlignJustify size={13} />];
                return (
                  <button
                    key={layout}
                    onClick={() => updateSettings({ articleLayout: layout })}
                    className={clsx(
                      'px-2.5 h-7 flex items-center transition-colors',
                      i > 0 && 'border-l border-[var(--border)]',
                      settings.articleLayout === layout
                        ? 'bg-brand/10 text-brand'
                        : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                    )}
                    title={layout}
                  >
                    {icons[i]}
                  </button>
                );
              })}
            </div>

            {/* Refresh */}
            <button
              onClick={() => fetchAllFeeds()}
              disabled={isFetching}
              className="cyber-btn-ghost py-1 px-3 h-7 text-xs"
            >
              <RefreshCw size={12} className={clsx(isFetching && 'animate-spin')} />
              {isFetching ? 'Fetching...' : 'Refresh'}
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {children}
          </div>
        </main>

        {/* ── Detail Pane ── */}
        {ui.detailPaneOpen && selectedItem && (
          <aside
            className="w-[380px] flex-shrink-0 border-l border-[var(--border)] bg-[var(--bg-secondary)] flex flex-col overflow-hidden animate-slide-in"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] flex-shrink-0">
              <span className={clsx('cat-badge', selectedItem.category)}>
                {CATEGORY_CONFIGS[selectedItem.category].shortName}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleStar(selectedItem.id)}
                  className={clsx(
                    'p-1 rounded transition-colors',
                    selectedItem.starred ? 'text-amber-400' : 'text-[var(--text-muted)] hover:text-amber-400'
                  )}
                  title="Star"
                >
                  <Star size={14} fill={selectedItem.starred ? 'currentColor' : 'none'} />
                </button>
                <button
                  onClick={() => toggleSaved(selectedItem.id)}
                  className={clsx(
                    'p-1 rounded transition-colors',
                    selectedItem.saved ? 'text-brand' : 'text-[var(--text-muted)] hover:text-brand'
                  )}
                  title="Save for later"
                >
                  <Bookmark size={14} fill={selectedItem.saved ? 'currentColor' : 'none'} />
                </button>
                <a
                  href={selectedItem.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1 rounded text-[var(--text-muted)] hover:text-brand transition-colors"
                  title="Open in browser"
                >
                  <ExternalLink size={14} />
                </a>
                <button
                  onClick={() => setSelectedItem(null)}
                  className="p-1 rounded text-[var(--text-muted)] hover:text-red-400 transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <h2 className="font-display font-bold text-xl text-[var(--text-primary)] leading-snug">
                {selectedItem.title}
              </h2>
              <div className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
                <span className="font-ui font-semibold" style={{ color: CATEGORY_CONFIGS[selectedItem.category].color }}>
                  {selectedItem.feedName}
                </span>
                <span className="flex items-center gap-1">
                  <Clock size={10} />
                  {formatDistanceToNow(new Date(selectedItem.pubDate), { addSuffix: true })}
                </span>
              </div>
              {selectedItem.description && (
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed font-ui">
                  {selectedItem.description.replace(/<[^>]*>/g, '').slice(0, 600)}
                  {selectedItem.description.length > 600 ? '...' : ''}
                </p>
              )}
              <a
                href={selectedItem.link}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => markRead(selectedItem.id)}
                className="cyber-btn inline-flex text-xs"
              >
                <ExternalLink size={12} />
                Read Full Article
              </a>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
