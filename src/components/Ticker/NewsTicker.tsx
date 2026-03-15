import { useEffect, useRef, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import clsx from 'clsx';
import { useStore } from '../../store/useStore';
import { CATEGORY_CONFIGS } from '../../types';

const SPEED_MAP = { slow: '80s', normal: '50s', fast: '28s', turbo: '14s' };

interface Props { standalone?: boolean; }

export default function NewsTicker({ standalone }: Props) {
  const { items, settings, isFetching, fetchAllFeeds, setSelectedItem, setView } = useStore();
  const [time, setTime] = useState(new Date());
  const [isPaused, setIsPaused] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Update clock
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const tickerItems = items
    .filter(i => settings.enabledCategories.includes(i.category))
    .slice(0, settings.tickerMaxItems);

  // Double items for seamless loop
  const displayItems = tickerItems.length > 0 ? [...tickerItems, ...tickerItems] : [];

  const heightClass = {
    sm: 'ticker-sm', md: 'ticker-md', lg: 'ticker-lg',
  }[settings.tickerHeight] || 'ticker-md';

  const handleItemClick = (itemId: string) => {
    setSelectedItem(itemId);
    if (standalone) setView('dashboard');
  };

  const pad = (n: number) => String(n).padStart(2, '0');
  const clockStr = `${pad(time.getHours())}:${pad(time.getMinutes())}:${pad(time.getSeconds())}`;

  return (
    <div className={clsx('ticker-band', heightClass, standalone && 'h-20')}>
      {/* Left meta */}
      <div className="ticker-meta">
        <div className="flex items-center gap-2">
          <span className="pulse-dot" />
          <span
            className="font-ui font-bold text-brand text-xs uppercase tracking-widest"
            style={{ fontSize: standalone ? 14 : undefined }}
          >
            LIVE
          </span>
        </div>
        {settings.tickerShowTime && (
          <span className="font-mono text-[var(--text-muted)] text-xs tabular-nums">{clockStr}</span>
        )}
        <span className="font-mono text-[var(--text-muted)] text-xs">{tickerItems.length}</span>
      </div>

      {/* Scrolling content */}
      <div className="ticker-scroll-wrapper">
        {tickerItems.length === 0 ? (
          <div className="px-6 font-ui text-[var(--text-muted)] text-sm uppercase tracking-widest">
            {isFetching ? 'Fetching signals...' : 'No signals — configure feeds in Feed Manager'}
          </div>
        ) : (
          <div
            ref={scrollRef}
            className={clsx('ticker-scroll', isPaused && 'paused')}
            style={{
              '--ticker-duration': SPEED_MAP[settings.tickerSpeed],
              animationPlayState: isPaused ? 'paused' : 'running',
            } as React.CSSProperties}
            onMouseEnter={() => settings.tickerPauseOnHover && setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
          >
            {displayItems.map((item, idx) => {
              const cfg = CATEGORY_CONFIGS[item.category];
              return (
                <span key={`${item.id}-${idx}`} className="inline-flex items-center">
                  <span
                    className="ticker-item"
                    onClick={() => handleItemClick(item.id)}
                    title={item.title}
                  >
                    {settings.tickerShowCategory && (
                      <span className={clsx('cat-badge', item.category)}>{cfg.shortName}</span>
                    )}
                    <span className="ticker-title max-w-[60ch] truncate">{item.title}</span>
                    {settings.tickerShowTime && (
                      <span className="font-mono text-[10px] text-[var(--text-muted)] ml-1">
                        {formatTickerTime(item.pubDate)}
                      </span>
                    )}
                  </span>
                  <span className="ticker-divider">◆</span>
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* Right controls */}
      <button
        onClick={() => fetchAllFeeds()}
        disabled={isFetching}
        className="px-3 h-full border-l border-[var(--border)] text-[var(--text-muted)] hover:text-brand transition-colors flex items-center"
        title="Refresh feeds"
      >
        <RefreshCw size={13} className={clsx(isFetching && 'animate-spin')} />
      </button>
    </div>
  );
}

function formatTickerTime(pubDate: string): string {
  try {
    const d = new Date(pubDate);
    const diffMs = Date.now() - d.getTime();
    const diffH = Math.floor(diffMs / 3600000);
    if (diffH < 1) return `${Math.floor(diffMs / 60000)}m`;
    if (diffH < 24) return `${diffH}h`;
    return `${Math.floor(diffH / 24)}d`;
  } catch {
    return '';
  }
}
