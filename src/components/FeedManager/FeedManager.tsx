import { useState, useRef } from 'react';
import clsx from 'clsx';
import { Plus, Trash2, ToggleLeft, ToggleRight, CheckCircle2, XCircle, Loader2, Tag, Bell, RefreshCw, Upload, Download } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useStore } from '../../store/useStore';
import { CATEGORY_CONFIGS } from '../../types';
import type { RSSCategory } from '../../types';
import { readFile } from '../../services/exportService';

export default function FeedManager() {
  const { feeds, settings, stats, addFeed, removeFeed, toggleFeed, updateFeed, fetchAllFeeds, isFetching, exportOPML, importOPML, importJSON } = useStore();
  const [newUrl, setNewUrl] = useState('');
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState<RSSCategory>('news');
  const [testState, setTestState] = useState<'idle' | 'testing' | 'ok' | 'error'>('idle');
  const [testMsg, setTestMsg] = useState('');
  const [testPreview, setTestPreview] = useState<{ title: string; pubDate: string }[]>([]);
  const [filterCat, setFilterCat] = useState<RSSCategory | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);

  const handleTest = async () => {
    if (!newUrl) return;
    setTestState('testing');
    setTestMsg('');
    setTestPreview([]);
    try {
      const res = await fetch(`${settings.proxyUrl}/api/rss/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: newUrl }),
      });
      const data = await res.json();
      if (data.success) {
        setTestState('ok');
        setTestMsg(`✓ ${data.feedTitle || 'Feed OK'} — ${data.itemCount} items`);
        setTestPreview(data.preview || []);
        if (!newName && data.feedTitle) setNewName(data.feedTitle);
      } else {
        setTestState('error');
        setTestMsg(`✗ ${data.error || 'Failed'}`);
      }
    } catch (e) {
      setTestState('error');
      setTestMsg('✗ Could not reach proxy server');
    }
  };

  const handleAdd = () => {
    if (!newUrl || !newName) return;
    addFeed({ name: newName, url: newUrl, category: newCategory, enabled: true });
    setNewUrl(''); setNewName(''); setTestState('idle'); setTestMsg(''); setTestPreview([]);
    setAddOpen(false);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const content = await readFile(file);
    if (file.name.endsWith('.opml') || file.name.endsWith('.xml')) {
      importOPML(content);
    } else {
      importJSON(content);
    }
    e.target.value = '';
  };

  const displayed = feeds
    .filter(f => filterCat === 'all' || f.category === filterCat)
    .filter(f => !searchTerm || f.name.toLowerCase().includes(searchTerm.toLowerCase()) || f.url.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="animate-fade-in space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-2xl text-[var(--text-primary)]">Feed Manager</h1>
          <p className="font-ui text-sm text-[var(--text-muted)] mt-0.5">Manage your RSS/Atom intelligence sources</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportOPML} className="cyber-btn-ghost text-xs py-1 px-3"><Download size={12} /> Export OPML</button>
          <button onClick={() => importRef.current?.click()} className="cyber-btn-ghost text-xs py-1 px-3"><Upload size={12} /> Import</button>
          <input ref={importRef} type="file" accept=".opml,.xml,.json" className="hidden" onChange={handleImport} />
          <button onClick={() => fetchAllFeeds()} disabled={isFetching} className="cyber-btn-ghost text-xs py-1 px-3">
            <RefreshCw size={12} className={clsx(isFetching && 'animate-spin')} /> Refresh All
          </button>
          <button onClick={() => setAddOpen(!addOpen)} className="cyber-btn text-xs py-1 px-4"><Plus size={13} /> Add Feed</button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total Feeds', value: stats.totalFeeds, color: 'var(--text-secondary)' },
          { label: 'Enabled', value: stats.enabledFeeds, color: '#22d3ee' },
          { label: 'Errors', value: stats.failedFeeds, color: stats.failedFeeds > 0 ? '#ef4444' : '#22c55e' },
          { label: 'Items', value: stats.totalItems, color: '#8b5cf6' },
        ].map(s => (
          <div key={s.label} className="bg-[var(--bg-card)] border border-[var(--border)] rounded-md px-3 py-2 flex justify-between items-center">
            <span className="font-ui text-[11px] uppercase tracking-wider text-[var(--text-muted)]">{s.label}</span>
            <span className="stat-number text-lg font-semibold" style={{ color: s.color }}>{s.value}</span>
          </div>
        ))}
      </div>

      {/* Add Feed Panel */}
      {addOpen && (
        <div className="bg-[var(--bg-card)] border border-[var(--border-bright)] rounded-md p-4 space-y-3 animate-fade-in">
          <div className="section-header">Add New Feed</div>
          <div className="flex gap-2">
            <input
              type="url"
              placeholder="https://example.com/feed.xml"
              value={newUrl}
              onChange={e => { setNewUrl(e.target.value); setTestState('idle'); }}
              className="cyber-input flex-1"
            />
            <button onClick={handleTest} disabled={!newUrl || testState === 'testing'} className="cyber-btn-ghost text-xs px-4 flex-shrink-0">
              {testState === 'testing' ? <Loader2 size={12} className="animate-spin" /> : 'Test'}
            </button>
          </div>

          {testMsg && (
            <div className={clsx('font-mono text-xs px-3 py-2 rounded border', testState === 'ok' ? 'text-green-400 border-green-500/30 bg-green-500/5' : 'text-red-400 border-red-500/30 bg-red-500/5')}>
              {testMsg}
              {testPreview.map((p, i) => (
                <div key={i} className="text-[var(--text-muted)] truncate mt-0.5">{p.title}</div>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Feed name"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              className="cyber-input flex-1"
            />
            <select
              value={newCategory}
              onChange={e => setNewCategory(e.target.value as RSSCategory)}
              className="cyber-input w-44"
            >
              {Object.values(CATEGORY_CONFIGS).map(cfg => (
                <option key={cfg.id} value={cfg.id}>{cfg.emoji} {cfg.name}</option>
              ))}
            </select>
            <button onClick={handleAdd} disabled={!newUrl || !newName} className="cyber-btn text-xs px-5 flex-shrink-0">
              <Plus size={13} /> Add
            </button>
          </div>
        </div>
      )}

      {/* Filter bar */}
      <div className="flex items-center gap-3">
        <input
          type="text"
          placeholder="Search feeds..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="cyber-input max-w-xs"
        />
        <div className="flex items-center gap-1">
          <button
            onClick={() => setFilterCat('all')}
            className={clsx('px-3 py-1 rounded text-xs font-ui font-semibold uppercase tracking-wide border transition-colors',
              filterCat === 'all' ? 'bg-brand/10 border-brand/40 text-brand' : 'border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)]')}
          >All</button>
          {Object.values(CATEGORY_CONFIGS).map(cfg => (
            <button
              key={cfg.id}
              onClick={() => setFilterCat(cfg.id)}
              className={clsx('px-3 py-1 rounded text-xs font-ui font-semibold uppercase tracking-wide border transition-colors',
                filterCat === cfg.id ? `border-current bg-current/10` : 'border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              )}
              style={filterCat === cfg.id ? { color: cfg.color, borderColor: `${cfg.color}60` } : undefined}
            >
              {cfg.shortName}
            </button>
          ))}
        </div>
        <span className="font-ui text-xs text-[var(--text-muted)] ml-auto">{displayed.length} feeds</span>
      </div>

      {/* Feed list */}
      <div className="space-y-1.5">
        {displayed.length === 0 && (
          <div className="text-center py-12 text-[var(--text-muted)] font-ui">
            No feeds found. Add one above.
          </div>
        )}
        {displayed.map(feed => {
          const cfg = CATEGORY_CONFIGS[feed.category];
          return (
            <div
              key={feed.id}
              className={clsx(
                'bg-[var(--bg-card)] border rounded-md px-4 py-3 flex items-center gap-3 transition-colors',
                feed.lastError ? 'border-red-500/20' : 'border-[var(--border)] hover:border-[var(--border-bright)]',
                !feed.enabled && 'opacity-50'
              )}
            >
              {/* Toggle */}
              <button onClick={() => toggleFeed(feed.id)} className="flex-shrink-0 text-[var(--text-muted)] hover:text-brand transition-colors">
                {feed.enabled
                  ? <ToggleRight size={22} className="text-brand" />
                  : <ToggleLeft size={22} />}
              </button>

              {/* Category dot */}
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: cfg.color }} />

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-ui font-semibold text-sm text-[var(--text-primary)] truncate">{feed.name}</span>
                  <span className={clsx('cat-badge', feed.category)}>{cfg.shortName}</span>
                </div>
                <div className="font-mono text-[10px] text-[var(--text-muted)] truncate mt-0.5">{feed.url}</div>
              </div>

              {/* Status */}
              <div className="flex-shrink-0 flex items-center gap-2 text-xs">
                {feed.lastError ? (
                  <span className="flex items-center gap-1 text-red-400 font-ui text-[11px]">
                    <XCircle size={11} /> Error
                  </span>
                ) : feed.lastFetched ? (
                  <span className="flex items-center gap-1 text-green-400 font-ui text-[11px]">
                    <CheckCircle2 size={11} />
                    {feed.itemCount} items
                  </span>
                ) : (
                  <span className="text-[var(--text-muted)] font-ui text-[11px]">Never fetched</span>
                )}
                {feed.lastFetched && (
                  <span className="font-mono text-[10px] text-[var(--text-muted)]">
                    {formatDistanceToNow(feed.lastFetched, { addSuffix: true })}
                  </span>
                )}
              </div>

              {/* Delete */}
              <button
                onClick={() => removeFeed(feed.id)}
                className="flex-shrink-0 p-1 rounded text-[var(--text-muted)] hover:text-red-400 transition-colors"
                title="Remove feed"
              >
                <Trash2 size={13} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
