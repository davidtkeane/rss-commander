import clsx from 'clsx';
import { Star, Bookmark, Clock, ExternalLink } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { CATEGORY_CONFIGS } from '../../types';
import type { RSSItem, ArticleLayout } from '../../types';

interface Props {
  item: RSSItem;
  layout: ArticleLayout;
  isSelected: boolean;
  onClick: () => void;
  onStar: () => void;
  onSave: () => void;
}

export default function ArticleCard({ item, layout, isSelected, onClick, onStar, onSave }: Props) {
  const cfg = CATEGORY_CONFIGS[item.category];
  const timeAgo = (() => {
    try { return formatDistanceToNow(new Date(item.pubDate), { addSuffix: true }); }
    catch { return ''; }
  })();

  if (layout === 'compact') {
    return (
      <div
        onClick={onClick}
        className={clsx(
          'flex items-center gap-3 px-3 py-1.5 cursor-pointer rounded transition-colors',
          isSelected ? 'bg-brand/8 border-l-2 border-brand' : 'hover:bg-[var(--bg-hover)]',
          item.read && 'opacity-50'
        )}
      >
        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: cfg.color }} />
        <span className={clsx('font-display text-sm flex-1 truncate', !item.read && 'font-semibold')}>
          {item.title}
        </span>
        <span className="font-mono text-[10px] text-[var(--text-muted)] flex-shrink-0">{timeAgo}</span>
      </div>
    );
  }

  if (layout === 'list') {
    return (
      <div
        onClick={onClick}
        className={clsx(
          'flex items-center gap-3 px-3 py-2 rounded cursor-pointer transition-colors border',
          isSelected ? 'bg-brand/8 border-brand/40' : 'border-transparent hover:border-[var(--border)] hover:bg-[var(--bg-hover)]',
          item.read && 'opacity-55'
        )}
      >
        <span className={clsx('cat-badge flex-shrink-0', item.category)}>{cfg.shortName}</span>
        <span className={clsx('font-display text-sm flex-1 truncate', !item.read && 'font-semibold')}>
          {item.title}
        </span>
        <span className="font-ui text-xs text-[var(--text-muted)] flex-shrink-0 max-w-[120px] truncate">{item.feedName}</span>
        <span className="font-mono text-[10px] text-[var(--text-muted)] flex-shrink-0 w-10 text-right">{timeAgo}</span>
        <div className="flex items-center gap-1 flex-shrink-0">
          <ActionBtn active={item.starred} activeColor="text-amber-400" onClick={e => { e.stopPropagation(); onStar(); }}>
            <Star size={11} fill={item.starred ? 'currentColor' : 'none'} />
          </ActionBtn>
          <ActionBtn active={item.saved} activeColor="text-brand" onClick={e => { e.stopPropagation(); onSave(); }}>
            <Bookmark size={11} fill={item.saved ? 'currentColor' : 'none'} />
          </ActionBtn>
        </div>
      </div>
    );
  }

  // Cards & Magazine
  return (
    <div
      onClick={onClick}
      className={clsx(
        'feed-card group',
        isSelected && 'selected',
        item.read && 'opacity-60',
        layout === 'magazine' && 'p-5'
      )}
      style={{ '--cat-color': cfg.color } as React.CSSProperties}
    >
      {/* Category + feed name row */}
      <div className="flex items-center gap-2 mb-2">
        <span className={clsx('cat-badge', item.category)}>{cfg.shortName}</span>
        <span className="font-ui text-[11px] uppercase tracking-wide flex-1 truncate" style={{ color: cfg.color }}>
          {item.feedName}
        </span>
        <span className="font-mono text-[10px] text-[var(--text-muted)]">{timeAgo}</span>
      </div>

      {/* Title */}
      <h3 className={clsx(
        'font-display leading-snug mb-2 line-clamp-2 group-hover:text-brand transition-colors',
        layout === 'magazine' ? 'text-xl font-bold' : 'text-base font-semibold',
        !item.read && 'font-bold',
      )}>
        {item.title}
      </h3>

      {/* Description */}
      {item.description && layout !== ('compact' as ArticleLayout) && (
        <p className="font-ui text-xs text-[var(--text-secondary)] line-clamp-2 leading-relaxed mb-3">
          {item.description.replace(/<[^>]*>/g, '').slice(0, 180)}
        </p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-auto pt-1">
        <div className="flex items-center gap-1 text-[var(--text-muted)]">
          {!item.read && <span className="w-1.5 h-1.5 rounded-full bg-brand flex-shrink-0" />}
          <Clock size={10} />
          <span className="font-mono text-[10px]">{timeAgo}</span>
        </div>
        <div className="flex items-center gap-1">
          <ActionBtn active={item.starred} activeColor="text-amber-400" onClick={e => { e.stopPropagation(); onStar(); }}>
            <Star size={12} fill={item.starred ? 'currentColor' : 'none'} />
          </ActionBtn>
          <ActionBtn active={item.saved} activeColor="text-brand" onClick={e => { e.stopPropagation(); onSave(); }}>
            <Bookmark size={12} fill={item.saved ? 'currentColor' : 'none'} />
          </ActionBtn>
          <a
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            className="p-1 rounded text-[var(--text-muted)] hover:text-brand transition-colors"
          >
            <ExternalLink size={12} />
          </a>
        </div>
      </div>
    </div>
  );
}

function ActionBtn({
  children, active, activeColor, onClick,
}: {
  children: React.ReactNode; active: boolean; activeColor: string; onClick: React.MouseEventHandler;
}) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'p-1 rounded transition-colors',
        active ? activeColor : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
      )}
    >
      {children}
    </button>
  );
}
