import { useState } from 'react';
import clsx from 'clsx';
import { CheckCircle2, XCircle, Loader2, RotateCcw, Download, Upload } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { CATEGORY_CONFIGS } from '../../types';
import type { RSSCategory } from '../../types';
import { readFile } from '../../services/exportService';

type Tab = 'ticker' | 'display' | 'feeds' | 'notifications' | 'ai' | 'advanced' | 'about';

const TABS: { id: Tab; label: string }[] = [
  { id: 'ticker', label: 'Ticker' }, { id: 'display', label: 'Display' },
  { id: 'feeds', label: 'Feeds' }, { id: 'notifications', label: 'Alerts' },
  { id: 'ai', label: 'AI' }, { id: 'advanced', label: 'Advanced' }, { id: 'about', label: 'About' },
];

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="toggle-switch">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
      <span className="toggle-slider" />
    </label>
  );
}

function Row({ label, desc, children }: { label: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-[var(--border)] last:border-0">
      <div>
        <div className="font-ui font-semibold text-sm text-[var(--text-primary)]">{label}</div>
        {desc && <div className="font-ui text-xs text-[var(--text-muted)] mt-0.5">{desc}</div>}
      </div>
      <div className="ml-6 flex-shrink-0">{children}</div>
    </div>
  );
}

export default function SettingsPanel() {
  const { settings, updateSettings, resetSettings, exportOPML, exportJSON, importOPML, importJSON, stats } = useStore();
  const [tab, setTab] = useState<Tab>('ticker');
  const [proxyStatus, setProxyStatus] = useState<'idle' | 'testing' | 'ok' | 'error'>('idle');
  const [resetConfirm, setResetConfirm] = useState(false);

  const testProxy = async () => {
    setProxyStatus('testing');
    try {
      const res = await fetch(`${settings.proxyUrl}/api/health`, { signal: AbortSignal.timeout(4000) });
      setProxyStatus(res.ok ? 'ok' : 'error');
    } catch { setProxyStatus('error'); }
  };

  const toggleCategory = (cat: RSSCategory) => {
    const current = settings.enabledCategories;
    const next = current.includes(cat) ? current.filter(c => c !== cat) : [...current, cat];
    if (next.length > 0) updateSettings({ enabledCategories: next });
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const content = await readFile(file);
    if (file.name.endsWith('.opml') || file.name.endsWith('.xml')) importOPML(content);
    else importJSON(content);
    e.target.value = '';
  };

  return (
    <div className="animate-fade-in max-w-2xl">
      <h1 className="font-display font-bold text-2xl text-[var(--text-primary)] mb-5">Settings</h1>

      {/* Tab nav */}
      <div className="flex gap-1 border-b border-[var(--border)] mb-6 overflow-x-auto">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={clsx(
              'px-4 py-2 font-ui font-semibold text-sm uppercase tracking-wide border-b-2 transition-colors whitespace-nowrap',
              tab === t.id
                ? 'border-brand text-brand'
                : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-md px-5 py-2">
        {/* TICKER TAB */}
        {tab === 'ticker' && (
          <div>
            <Row label="Enable Ticker" desc="Show scrolling news bar at the top">
              <Toggle checked={settings.tickerEnabled} onChange={v => updateSettings({ tickerEnabled: v })} />
            </Row>
            <div className="py-3 border-b border-[var(--border)]">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="font-ui font-semibold text-sm text-[var(--text-primary)]">Scroll Speed</div>
                  <div className="font-ui text-xs text-[var(--text-muted)] mt-0.5">0 = gentle crawl · 100 = fast</div>
                </div>
                <span className="font-mono font-bold text-sm text-brand tabular-nums">
                  {typeof settings.tickerSpeed === 'number' ? settings.tickerSpeed : 50}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={typeof settings.tickerSpeed === 'number' ? settings.tickerSpeed : 50}
                onChange={e => updateSettings({ tickerSpeed: Number(e.target.value) })}
                className="w-full accent-[var(--brand)] cursor-pointer h-1.5 mb-2"
              />
              {/* 4 stage markers */}
              <div className="flex justify-between mt-1">
                {([
                  { label: 'Crawl', value: 0 },
                  { label: 'Slow',  value: 33 },
                  { label: 'Normal', value: 67 },
                  { label: 'Fast',  value: 100 },
                ] as const).map(({ label, value }) => (
                  <button
                    key={label}
                    onClick={() => updateSettings({ tickerSpeed: value })}
                    className="text-[10px] font-ui font-semibold uppercase tracking-wide text-[var(--text-muted)] hover:text-brand transition-colors"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <Row label="Height">
              <div className="flex gap-1">
                {(['sm', 'md', 'lg'] as const).map(h => (
                  <button key={h} onClick={() => updateSettings({ tickerHeight: h })}
                    className={clsx('px-3 py-1 rounded text-xs font-ui font-bold uppercase border transition-colors',
                      settings.tickerHeight === h ? 'bg-brand/10 border-brand/40 text-brand' : 'border-[var(--border)] text-[var(--text-muted)]')}>
                    {h}
                  </button>
                ))}
              </div>
            </Row>
            <Row label="Pause on hover">
              <Toggle checked={settings.tickerPauseOnHover} onChange={v => updateSettings({ tickerPauseOnHover: v })} />
            </Row>
            <Row label="Show category badges">
              <Toggle checked={settings.tickerShowCategory} onChange={v => updateSettings({ tickerShowCategory: v })} />
            </Row>
            <Row label="Show timestamps">
              <Toggle checked={settings.tickerShowTime} onChange={v => updateSettings({ tickerShowTime: v })} />
            </Row>
            <Row label="Max items">
              <input type="number" min={5} max={200} value={settings.tickerMaxItems}
                onChange={e => updateSettings({ tickerMaxItems: Number(e.target.value) })}
                className="cyber-input w-20 text-right" />
            </Row>
          </div>
        )}

        {/* DISPLAY TAB */}
        {tab === 'display' && (
          <div>
            <Row label="Article Layout">
              <div className="flex gap-1">
                {(['cards', 'list', 'compact', 'magazine'] as const).map(l => (
                  <button key={l} onClick={() => updateSettings({ articleLayout: l })}
                    className={clsx('px-3 py-1 rounded text-xs font-ui font-bold uppercase border transition-colors',
                      settings.articleLayout === l ? 'bg-brand/10 border-brand/40 text-brand' : 'border-[var(--border)] text-[var(--text-muted)]')}>
                    {l}
                  </button>
                ))}
              </div>
            </Row>
            <Row label="Show descriptions">
              <Toggle checked={settings.showDescriptions} onChange={v => updateSettings({ showDescriptions: v })} />
            </Row>
            <Row label="Show read time">
              <Toggle checked={settings.showReadTime} onChange={v => updateSettings({ showReadTime: v })} />
            </Row>
          </div>
        )}

        {/* FEEDS TAB */}
        {tab === 'feeds' && (
          <div>
            <Row label="Auto-refresh interval" desc="Minutes between auto-fetches (0 = off)">
              <input type="number" min={0} max={120} value={settings.autoRefreshInterval}
                onChange={e => updateSettings({ autoRefreshInterval: Number(e.target.value) })}
                className="cyber-input w-20 text-right" />
            </Row>
            <Row label="Max items per feed">
              <input type="number" min={5} max={100} value={settings.maxItemsPerFeed}
                onChange={e => updateSettings({ maxItemsPerFeed: Number(e.target.value) })}
                className="cyber-input w-20 text-right" />
            </Row>
            <Row label="Sort order">
              <select value={settings.sortOrder} onChange={e => updateSettings({ sortOrder: e.target.value as typeof settings.sortOrder })} className="cyber-input w-36">
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="unread">Unread first</option>
                <option value="alpha">Alphabetical</option>
              </select>
            </Row>
            <Row label="Hide read items">
              <Toggle checked={settings.hideReadItems} onChange={v => updateSettings({ hideReadItems: v })} />
            </Row>
            <Row label="Starred only">
              <Toggle checked={settings.showOnlyStarred} onChange={v => updateSettings({ showOnlyStarred: v })} />
            </Row>
            <div className="py-3 border-b border-[var(--border)]">
              <div className="font-ui font-semibold text-sm text-[var(--text-primary)] mb-3">Enabled Categories</div>
              <div className="flex flex-wrap gap-2">
                {Object.values(CATEGORY_CONFIGS).map(cfg => {
                  const active = settings.enabledCategories.includes(cfg.id);
                  return (
                    <button key={cfg.id} onClick={() => toggleCategory(cfg.id)}
                      className={clsx('px-3 py-1.5 rounded text-xs font-ui font-bold uppercase tracking-wide border transition-all',
                        active ? 'border-current' : 'border-[var(--border)] text-[var(--text-muted)] opacity-40'
                      )}
                      style={active ? { color: cfg.color, borderColor: `${cfg.color}50`, background: `${cfg.color}10` } : undefined}
                    >
                      {cfg.emoji} {cfg.shortName}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* NOTIFICATIONS TAB */}
        {tab === 'notifications' && (
          <div>
            <Row label="Desktop notifications" desc="Browser push notifications for new items">
              <Toggle checked={settings.desktopNotifications} onChange={async v => {
                if (v && Notification.permission !== 'granted') {
                  const perm = await Notification.requestPermission();
                  if (perm !== 'granted') return;
                }
                updateSettings({ desktopNotifications: v });
              }} />
            </Row>
            <div className="py-3">
              <div className="font-ui font-semibold text-sm text-[var(--text-primary)] mb-3">Notify for categories</div>
              <div className="flex flex-wrap gap-2">
                {Object.values(CATEGORY_CONFIGS).map(cfg => {
                  const active = settings.notifyCategories.includes(cfg.id);
                  return (
                    <button key={cfg.id}
                      onClick={() => {
                        const next = active ? settings.notifyCategories.filter(c => c !== cfg.id) : [...settings.notifyCategories, cfg.id];
                        updateSettings({ notifyCategories: next });
                      }}
                      className={clsx('px-3 py-1.5 rounded text-xs font-ui font-bold uppercase tracking-wide border transition-all',
                        active ? 'border-current' : 'border-[var(--border)] text-[var(--text-muted)] opacity-40'
                      )}
                      style={active ? { color: cfg.color, borderColor: `${cfg.color}50`, background: `${cfg.color}10` } : undefined}
                    >
                      {cfg.emoji} {cfg.shortName}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* AI TAB */}
        {tab === 'ai' && (
          <div>
            <Row label="Enable AI features" desc="AI-powered summaries and analysis">
              <Toggle checked={settings.aiEnabled} onChange={v => updateSettings({ aiEnabled: v })} />
            </Row>
            <Row label="AI Provider">
              <select value={settings.aiProvider} onChange={e => updateSettings({ aiProvider: e.target.value as typeof settings.aiProvider })} className="cyber-input w-40">
                <option value="none">None</option>
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic</option>
                <option value="ollama">Ollama (local)</option>
              </select>
            </Row>
            <Row label="Model">
              <input type="text" placeholder="gpt-4o / claude-3-5-sonnet" value={settings.aiModel}
                onChange={e => updateSettings({ aiModel: e.target.value })} className="cyber-input w-48" />
            </Row>
            <div className="py-3 text-xs font-ui text-[var(--text-muted)] border-t border-[var(--border)]">
              💡 Store your API keys securely in the <strong className="text-brand">API Vault</strong> panel.
            </div>
          </div>
        )}

        {/* ADVANCED TAB */}
        {tab === 'advanced' && (
          <div>
            <Row label="Proxy URL" desc="CORS proxy server for RSS fetching">
              <div className="flex gap-2">
                <input type="text" value={settings.proxyUrl}
                  onChange={e => updateSettings({ proxyUrl: e.target.value })}
                  className="cyber-input w-52" />
                <button onClick={testProxy} disabled={proxyStatus === 'testing'} className="cyber-btn-ghost text-xs px-3">
                  {proxyStatus === 'testing' ? <Loader2 size={11} className="animate-spin" /> :
                   proxyStatus === 'ok' ? <CheckCircle2 size={11} className="text-green-400" /> :
                   proxyStatus === 'error' ? <XCircle size={11} className="text-red-400" /> : 'Test'}
                </button>
              </div>
            </Row>

            <div className="py-3 border-b border-[var(--border)]">
              <div className="font-ui font-semibold text-sm text-[var(--text-primary)] mb-3">Import / Export</div>
              <div className="flex flex-wrap gap-2">
                <button onClick={exportOPML} className="cyber-btn-ghost text-xs py-1 px-3"><Download size={11} /> Export OPML</button>
                <button onClick={exportJSON} className="cyber-btn-ghost text-xs py-1 px-3"><Download size={11} /> Export JSON</button>
                <label className="cyber-btn-ghost text-xs py-1 px-3 cursor-pointer flex items-center gap-1.5">
                  <Upload size={11} /> Import
                  <input type="file" accept=".opml,.xml,.json" className="hidden" onChange={handleImport} />
                </label>
              </div>
            </div>

            <div className="py-3">
              <div className="font-ui font-semibold text-sm text-red-400 mb-2">Danger Zone</div>
              {!resetConfirm ? (
                <button onClick={() => setResetConfirm(true)} className="cyber-btn-ghost text-xs py-1 px-3 border-red-500/30 text-red-400 hover:bg-red-500/10">
                  <RotateCcw size={11} /> Reset all settings
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="font-ui text-xs text-red-400">Confirm reset?</span>
                  <button onClick={() => { resetSettings(); setResetConfirm(false); }} className="cyber-btn text-xs py-1 px-3 bg-red-500 text-white">Yes, reset</button>
                  <button onClick={() => setResetConfirm(false)} className="cyber-btn-ghost text-xs py-1 px-3">Cancel</button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ABOUT TAB */}
        {tab === 'about' && (
          <div className="py-4 space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-brand/10 border border-brand/30 flex items-center justify-center">
                <span className="font-display font-bold text-brand text-xl">RC</span>
              </div>
              <div>
                <div className="font-display font-bold text-xl text-[var(--text-primary)]">RSS Commander</div>
                <div className="font-ui text-xs text-[var(--text-muted)] uppercase tracking-widest">Signal Intelligence Terminal v1.0.0</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              {[
                { label: 'Total Feeds', value: stats.totalFeeds },
                { label: 'Articles Cached', value: stats.totalItems },
                { label: 'Unread', value: stats.unreadItems },
                { label: 'Starred', value: stats.starredItems },
              ].map(s => (
                <div key={s.label} className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded px-3 py-2 flex justify-between">
                  <span className="font-ui text-[var(--text-muted)] uppercase tracking-wide text-[11px]">{s.label}</span>
                  <span className="stat-number text-[var(--text-secondary)]">{s.value}</span>
                </div>
              ))}
            </div>
            <div className="font-ui text-xs text-[var(--text-muted)] leading-relaxed border-t border-[var(--border)] pt-3">
              Built for security researchers and threat intelligence professionals.<br />
              Part of the RangerPlex ecosystem. 🎖️
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
