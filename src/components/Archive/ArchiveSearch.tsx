import { useEffect, useRef, useState } from 'react';
import { Search, Archive, ExternalLink } from 'lucide-react';
import clsx from 'clsx';
import { formatDistanceToNow } from 'date-fns';
import { useStore } from '../../store/useStore';
import { CATEGORY_CONFIGS } from '../../types';
import type { ArchiveStats, RSSCategory } from '../../types';

const CATEGORIES: { value: RSSCategory | ''; label: string }[] = [
  { value: '', label: 'All Categories' },
  { value: 'pentesting', label: 'Pentesting' },
  { value: 'malware', label: 'Malware' },
  { value: 'forensics', label: 'Forensics' },
  { value: 'news', label: 'News' },
  { value: 'dataGov', label: 'Data Gov' },
  { value: 'blockchain', label: 'Blockchain' },
];

export default function ArchiveSearch() {
  const { archiveResults, archiveQuery, searchArchive, settings } = useStore();
  const [query, setQuery] = useState(archiveQuery);
  const [category, setCategory] = useState<RSSCategory | ''>('');
  const [archiveStats, setArchiveStats] = useState<ArchiveStats | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load stats on mount
  useEffect(() => {
    fetch(`${settings.proxyUrl}/api/articles/stats`)
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setArchiveStats({
            total: data.total,
            oldest: data.oldest,
            newest: data.newest,
            byCategory: data.byCategory,
          });
        }
      })
      .catch(() => {});
  }, [settings.proxyUrl]);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      searchArchive(query, category || null);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, category]);

  const hasResults = archiveResults.length > 0;
  const hasQuery = query.trim().length > 0;

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Archive size={18} className="text-brand flex-shrink-0" />
        <h1 className="font-display font-bold text-xl text-[var(--text-primary)]">Article Archive</h1>
      </div>

      {/* Stats bar */}
      {archiveStats && (
        <div className="flex flex-wrap items-center gap-4 px-4 py-2.5 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] text-xs font-mono">
          <span className="text-brand font-bold">{archiveStats.total.toLocaleString()} articles</span>
          {archiveStats.oldest && (
            <span className="text-[var(--text-muted)]">
              since {new Date(archiveStats.oldest).toLocaleDateString(undefined, { year: 'numeric', month: 'short' })}
            </span>
          )}
          <span className="text-[var(--text-muted)]">·</span>
          {Object.entries(archiveStats.byCategory).map(([cat, count]) => {
            const cfg = CATEGORY_CONFIGS[cat as RSSCategory];
            if (!cfg) return null;
            return (
              <span key={cat} style={{ color: cfg.color }}>
                {cfg.shortName}: {count}
              </span>
            );
          })}
        </div>
      )}

      {/* Search controls */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Search historical articles… e.g. ransomware, CVE-2024"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="cyber-input pl-8 py-2 text-sm w-full"
            autoFocus
          />
        </div>
        <select
          value={category}
          onChange={e => setCategory(e.target.value as RSSCategory | '')}
          className="cyber-input text-sm px-3 py-2 min-w-[140px] cursor-pointer"
        >
          {CATEGORIES.map(c => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto space-y-2">
        {!hasQuery && (
          <div className="flex flex-col items-center justify-center h-48 text-[var(--text-muted)] gap-3">
            <Archive size={32} className="opacity-30" />
            <p className="text-sm font-ui">Type a search term to query the archive</p>
            <p className="text-xs font-mono opacity-60">Full-text search across titles and descriptions</p>
          </div>
        )}

        {hasQuery && !hasResults && (
          <div className="flex flex-col items-center justify-center h-48 text-[var(--text-muted)] gap-2">
            <p className="text-sm font-ui">No results found for &ldquo;{query}&rdquo;</p>
          </div>
        )}

        {hasResults && (
          <>
            <p className="text-xs text-[var(--text-muted)] font-mono px-1 pb-1">
              {archiveResults.length} result{archiveResults.length !== 1 ? 's' : ''}
              {category ? ` in ${CATEGORY_CONFIGS[category as RSSCategory]?.name}` : ''}
            </p>
            {archiveResults.map(item => {
              const cfg = CATEGORY_CONFIGS[item.category];
              return (
                <article
                  key={item.id}
                  className="px-4 py-3 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] hover:border-[var(--border-hover)] transition-colors group"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={clsx('cat-badge text-[10px] px-1.5 py-0.5 rounded font-ui font-semibold uppercase tracking-wide flex-shrink-0', item.category)}
                        >
                          {cfg?.shortName ?? item.category}
                        </span>
                        <span className="text-[11px] text-[var(--text-muted)] font-ui truncate">{item.feedName}</span>
                        {item.pubDate && (
                          <span className="text-[11px] text-[var(--text-muted)] font-mono ml-auto flex-shrink-0">
                            {formatDistanceToNow(new Date(item.pubDate), { addSuffix: true })}
                          </span>
                        )}
                      </div>
                      <h3 className="font-display font-semibold text-sm text-[var(--text-primary)] leading-snug mb-1">
                        {item.title}
                      </h3>
                      {item.description && (
                        <p
                          className="text-xs text-[var(--text-secondary)] font-ui leading-relaxed line-clamp-2"
                          /* excerpt may contain <mark> tags from FTS snippet() */
                          dangerouslySetInnerHTML={{ __html: item.description }}
                        />
                      )}
                    </div>
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-shrink-0 p-1.5 rounded text-[var(--text-muted)] hover:text-brand transition-colors opacity-0 group-hover:opacity-100"
                      title="Open article"
                    >
                      <ExternalLink size={13} />
                    </a>
                  </div>
                </article>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
