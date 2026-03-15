import { useEffect, useRef, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import type { RSSCategory } from '../../types';
import clsx from 'clsx';
import { useStore } from '../../store/useStore';
import { CATEGORY_CONFIGS } from '../../types';

// Map 0–100 → animation duration. 0 = 200s (crawl), 100 = 20s (fast).
// Legacy string values from old localStorage are mapped via a fallback table.
const LEGACY_SPEED: Record<string, number> = { slow: 25, normal: 50, fast: 75, turbo: 100 };
function tickerDuration(speed: number | string): string {
  const n = typeof speed === 'string' ? (LEGACY_SPEED[speed] ?? 50) : speed;
  const clamped = Math.max(0, Math.min(100, n));
  return `${Math.round(200 - clamped * 1.8)}s`; // 0→200s, 100→20s
}

interface Props {
  standalone?: boolean;
  popoutMode?: boolean;
  overrideCategories?: RSSCategory[];
  overrideFontSize?: number;
}

export default function NewsTicker({ standalone, popoutMode, overrideCategories, overrideFontSize }: Props) {
  const { items, settings, isFetching, fetchAllFeeds, setSelectedItem, setView } = useStore();
  const [time, setTime] = useState(new Date());
  const [isPaused, setIsPaused] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Update clock
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const activeCategories = overrideCategories ?? settings.enabledCategories;
  const tickerItems = items
    .filter(i => activeCategories.includes(i.category))
    .slice(0, settings.tickerMaxItems);

  // Double items for seamless loop
  const displayItems = tickerItems.length > 0 ? [...tickerItems, ...tickerItems] : [];

  const heightClass = {
    sm: 'ticker-sm', md: 'ticker-md', lg: 'ticker-lg',
  }[settings.tickerHeight] || 'ticker-md';

  // In popout mode the height is driven by font size, not the sm/md/lg classes
  const popoutHeight = overrideFontSize ? Math.round(overrideFontSize * 2.6) : undefined;

  const handleItemClick = (itemId: string) => {
    if (popoutMode) return; // read-only in TV mode
    setSelectedItem(itemId);
    if (standalone) setView('dashboard');
  };

  const pad = (n: number) => String(n).padStart(2, '0');
  const clockStr = `${pad(time.getHours())}:${pad(time.getMinutes())}:${pad(time.getSeconds())}`;

  return (
    <div
      className={clsx('ticker-band', !popoutMode && heightClass, standalone && 'h-20')}
      style={popoutHeight ? { height: popoutHeight } : undefined}
    >
      {/* Left meta */}
      <div className="ticker-meta">
        <div className="flex items-center gap-2">
          <span className="pulse-dot" />
          <span
            className="font-ui font-bold text-brand uppercase tracking-widest"
            style={{ fontSize: popoutMode ? Math.round((overrideFontSize ?? 24) * 0.6) : (standalone ? 14 : undefined) }}
          >
            LIVE
          </span>
        </div>
        {settings.tickerShowTime && (
          <span className="font-mono text-[var(--text-muted)] tabular-nums"
            style={{ fontSize: popoutMode ? Math.round((overrideFontSize ?? 24) * 0.55) : undefined }}>
            {clockStr}
          </span>
        )}
        <span className="font-mono text-[var(--text-muted)]"
          style={{ fontSize: popoutMode ? Math.round((overrideFontSize ?? 24) * 0.55) : undefined }}>
          {tickerItems.length}
        </span>
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
              '--ticker-duration': tickerDuration(settings.tickerSpeed),
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
                    style={overrideFontSize ? { fontSize: overrideFontSize, cursor: popoutMode ? 'default' : 'pointer' } : undefined}
                  >
                    {settings.tickerShowCategory && (
                      <span className={clsx('cat-badge', item.category)}
                        style={overrideFontSize ? { fontSize: Math.round(overrideFontSize * 0.65) } : undefined}>
                        {cfg.shortName}
                      </span>
                    )}
                    <span className="ticker-title max-w-[80ch] truncate">{item.title}</span>
                    {settings.tickerShowTime && (
                      <span className="font-mono text-[var(--text-muted)] ml-1"
                        style={{ fontSize: overrideFontSize ? Math.round(overrideFontSize * 0.6) : 10 }}>
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

      {/* Refresh button — hidden in TV/popout mode */}
      {!popoutMode && (
        <button
          onClick={() => fetchAllFeeds()}
          disabled={isFetching}
          className="px-3 h-full border-l border-[var(--border)] text-[var(--text-muted)] hover:text-brand transition-colors flex items-center"
          title="Refresh feeds"
        >
          <RefreshCw size={13} className={clsx(isFetching && 'animate-spin')} />
        </button>
      )}
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
