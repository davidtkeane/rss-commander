import { useMemo } from 'react';
import clsx from 'clsx';
import { Star, CheckCheck, TrendingUp } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { CATEGORY_CONFIGS } from '../../types';
import ArticleCard from './ArticleCard';

export default function FeedDashboard() {
  const {
    items, ui, settings, stats,
    markRead, markAllRead, toggleStar, toggleSaved,
    setSelectedItem, isFetching,
  } = useStore();

  const filtered = useMemo(() => {
    let result = [...items];

    // Category filter
    if (ui.activeCategory !== 'all') {
      result = result.filter(i => i.category === ui.activeCategory);
    }

    // Category enabled filter
    result = result.filter(i => settings.enabledCategories.includes(i.category));

    // Search
    if (ui.searchQuery.trim()) {
      const q = ui.searchQuery.toLowerCase();
      result = result.filter(i =>
        i.title.toLowerCase().includes(q) ||
        i.description.toLowerCase().includes(q) ||
        i.feedName.toLowerCase().includes(q)
      );
    }

    // Keyword blacklist
    if (settings.keywordBlacklist.length > 0) {
      result = result.filter(i =>
        !settings.keywordBlacklist.some(kw =>
          i.title.toLowerCase().includes(kw.toLowerCase())
        )
      );
    }

    // Hide read
    if (settings.hideReadItems) result = result.filter(i => !i.read);

    // Starred only
    if (settings.showOnlyStarred) result = result.filter(i => i.starred);

    // Sort
    switch (settings.sortOrder) {
      case 'oldest':
        result.sort((a, b) => new Date(a.pubDate).getTime() - new Date(b.pubDate).getTime());
        break;
      case 'alpha':
        result.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case 'unread':
        result.sort((a, b) => (a.read ? 1 : 0) - (b.read ? 1 : 0));
        break;
      default: // newest
        result.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());
    }

    return result.slice(0, 200);
  }, [items, ui.activeCategory, ui.searchQuery, settings]);

  const unreadCount = filtered.filter(i => !i.read).length;

  if (isFetching && items.length === 0) {
    return <LoadingSkeleton layout={settings.articleLayout} />;
  }

  if (items.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="animate-fade-in">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="font-display font-bold text-2xl text-[var(--text-primary)]">
            {ui.activeCategory === 'all' ? 'All Signals' : CATEGORY_CONFIGS[ui.activeCategory as keyof typeof CATEGORY_CONFIGS]?.name ?? ui.activeCategory}
          </span>
          {unreadCount > 0 && (
            <span className="font-mono text-xs bg-brand/15 text-brand px-2 py-0.5 rounded-full border border-brand/30">
              {unreadCount} unread
            </span>
          )}
          {ui.searchQuery && (
            <span className="font-ui text-xs text-[var(--text-muted)]">
              {filtered.length} results
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={() => markAllRead(ui.activeCategory !== 'all' ? ui.activeCategory : undefined)}
              className="cyber-btn-ghost text-xs py-1 px-3"
            >
              <CheckCheck size={12} />
              Mark all read
            </button>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Total', value: stats.totalItems, color: 'var(--text-secondary)' },
          { label: 'Unread', value: stats.unreadItems, color: '#22d3ee' },
          { label: 'Starred', value: stats.starredItems, color: '#f59e0b' },
          { label: 'Saved', value: stats.savedItems, color: '#8b5cf6' },
        ].map(s => (
          <div key={s.label} className="bg-[var(--bg-card)] border border-[var(--border)] rounded-md px-3 py-2 flex items-center justify-between">
            <span className="font-ui text-[11px] uppercase tracking-wider text-[var(--text-muted)]">{s.label}</span>
            <span className="stat-number text-base font-semibold" style={{ color: s.color }}>{s.value}</span>
          </div>
        ))}
      </div>

      {/* Articles */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-[var(--text-muted)]">
          <TrendingUp size={32} className="mx-auto mb-3 opacity-30" />
          <div className="font-display text-xl font-semibold">No signals match your filters</div>
          <div className="font-ui text-sm mt-1">Try adjusting the search or category filter</div>
        </div>
      ) : (
        <div className={clsx(
          settings.articleLayout === 'cards'   && 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3',
          settings.articleLayout === 'magazine' && 'grid grid-cols-1 md:grid-cols-2 gap-4',
          settings.articleLayout === 'list'    && 'space-y-1',
          settings.articleLayout === 'compact' && 'space-y-px',
        )}>
          {filtered.map(item => (
            <ArticleCard
              key={item.id}
              item={item}
              layout={settings.articleLayout}
              isSelected={ui.selectedItemId === item.id}
              onClick={() => {
                setSelectedItem(item.id);
                markRead(item.id);
              }}
              onStar={() => toggleStar(item.id)}
              onSave={() => toggleSaved(item.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function LoadingSkeleton({ layout }: { layout: string }) {
  const count = layout === 'cards' ? 9 : 8;
  return (
    <div className={clsx(
      layout === 'cards' && 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3',
      (layout === 'list' || layout === 'compact') && 'space-y-2',
    )}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-[var(--bg-card)] border border-[var(--border)] rounded-md p-4 space-y-2">
          <div className="skeleton h-3 w-16 rounded" />
          <div className="skeleton h-4 w-full rounded" />
          <div className="skeleton h-4 w-3/4 rounded" />
          <div className="skeleton h-3 w-24 rounded mt-3" />
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  const { setView } = useStore();
  return (
    <div className="flex flex-col items-center justify-center h-full py-24 text-center">
      <div className="relative w-20 h-20 mb-6">
        <div className="absolute inset-0 rounded-full border-2 border-brand/20 animate-ping" />
        <div className="absolute inset-2 rounded-full border-2 border-brand/40 animate-ping" style={{ animationDelay: '0.3s' }} />
        <div className="absolute inset-4 rounded-full bg-brand/10 border border-brand/60 flex items-center justify-center">
          <Star size={16} className="text-brand" />
        </div>
      </div>
      <div className="font-display font-bold text-2xl text-[var(--text-primary)] mb-2">No signals detected</div>
      <div className="font-ui text-[var(--text-muted)] text-sm mb-6 max-w-xs">
        Configure your feed sources in Feed Manager and hit refresh to start receiving intelligence.
      </div>
      <button onClick={() => setView('feeds')} className="cyber-btn">
        Configure Feeds
      </button>
    </div>
  );
}
