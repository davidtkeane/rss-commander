import { useState } from 'react';
import clsx from 'clsx';
import { CheckCircle2, XCircle, Loader2, RotateCcw, Download, Upload, MonitorPlay, MonitorOff, Tv2, Monitor } from 'lucide-react';
import { useScreenManager } from '../../hooks/useScreenManager';
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
  const [popupBlocked, setPopupBlocked] = useState(false);
  const sm = useScreenManager();

  const launchPopout = () => {
    const rowH   = Math.round(settings.tickerPopoutFontSize * 2.6) + 2;
    const totalH = rowH * (settings.tickerPopoutRows ?? 1);
    const ok = sm.launchPopout({
      url:         '/ticker.html',
      screenIndex: settings.tickerPopoutScreenIndex ?? -1,
      position:    settings.tickerPopoutPosition ?? 'bottom',
      height:      totalH,
    });
    setPopupBlocked(!ok);
  };

  const togglePopoutCategory = (cat: RSSCategory) => {
    const current = settings.tickerPopoutCategories ?? [];
    const next = current.includes(cat) ? current.filter(c => c !== cat) : [...current, cat];
    if (next.length > 0) updateSettings({ tickerPopoutCategories: next });
  };

  const togglePopoutCategory2 = (cat: RSSCategory) => {
    const current = settings.tickerPopoutCategories2 ?? [];
    const next = current.includes(cat) ? current.filter(c => c !== cat) : [...current, cat];
    if (next.length > 0) updateSettings({ tickerPopoutCategories2: next });
  };

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

            {/* ── Popout / TV Display ── */}
            <div className="pt-4 pb-1">
              <div className="flex items-center gap-2 mb-4">
                <Tv2 size={14} className="text-brand" />
                <span className="font-ui font-bold text-xs text-brand uppercase tracking-widest">Popout Display — TV / External Monitor</span>
              </div>

              {/* Monitor selector — Window Management API (Chrome 100+) */}
              {sm.supported && (
                <div className="mb-4 space-y-2">
                  {sm.permissionState === 'prompt' && (
                    <button
                      onClick={sm.requestAccess}
                      className="w-full flex items-center justify-center gap-2 py-2 rounded border border-dashed border-[var(--border)] text-[var(--text-muted)] hover:border-brand/40 hover:text-brand text-xs font-ui font-semibold transition-colors"
                    >
                      <Monitor size={13} /> Detect Monitors
                    </button>
                  )}
                  {sm.permissionState === 'granted' && sm.screens.length > 0 && (
                    <div className="flex items-center justify-between py-2 border-b border-[var(--border)]">
                      <div>
                        <div className="font-ui font-semibold text-sm text-[var(--text-primary)]">Target Monitor</div>
                        <div className="font-ui text-xs text-[var(--text-muted)] mt-0.5">
                          {sm.screens.length} display{sm.screens.length !== 1 ? 's' : ''} detected
                        </div>
                      </div>
                      <select
                        value={settings.tickerPopoutScreenIndex ?? -1}
                        onChange={e => updateSettings({ tickerPopoutScreenIndex: Number(e.target.value) })}
                        className="cyber-input text-sm ml-6 max-w-[220px]"
                      >
                        <option value={-1}>Primary (default)</option>
                        {sm.screens.map(s => (
                          <option key={s.index} value={s.index}>
                            {s.label}
                            {s.isPrimary ? ' ★' : ''}
                            {s.isInternal ? ' (Built-in)' : ' (External)'}
                            {` — ${s.availWidth}×${s.availHeight}`}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  {sm.permissionState === 'denied' && (
                    <div className="text-xs font-ui text-[var(--text-muted)] bg-[var(--bg-secondary)] border border-[var(--border)] rounded px-3 py-2">
                      Monitor access denied — ticker will open on the primary display.
                    </div>
                  )}
                </div>
              )}

              {/* Launch / Close button */}
              <div className="mb-4">
                {popupBlocked && (
                  <div className="mb-2 text-xs font-ui text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded px-3 py-2">
                    Popup blocked — allow popups for localhost:5174 in your browser settings, then try again.
                  </div>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={launchPopout}
                    className={clsx(
                      'flex-1 flex items-center justify-center gap-2 py-2 rounded border font-ui font-semibold text-sm transition-colors',
                      sm.isPopoutOpen
                        ? 'border-brand/40 bg-brand/10 text-brand hover:bg-brand/20'
                        : 'border-[var(--border)] text-[var(--text-primary)] hover:border-brand/40 hover:text-brand'
                    )}
                  >
                    {sm.isPopoutOpen
                      ? <><span className="w-2 h-2 rounded-full bg-brand animate-pulse" /> Ticker Window Open — Click to Focus</>
                      : <><MonitorPlay size={14} /> Launch Ticker Window</>
                    }
                  </button>
                  {sm.isPopoutOpen && (
                    <button onClick={sm.closePopout} className="px-3 py-2 rounded border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors" title="Close ticker window">
                      <MonitorOff size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* Position */}
              <Row label="Screen position" desc="Where the ticker sits when not fullscreen">
                <div className="flex gap-1">
                  {(['top', 'bottom'] as const).map(p => (
                    <button key={p} onClick={() => updateSettings({ tickerPopoutPosition: p })}
                      className={clsx('px-3 py-1 rounded text-xs font-ui font-bold uppercase border transition-colors',
                        settings.tickerPopoutPosition === p ? 'bg-brand/10 border-brand/40 text-brand' : 'border-[var(--border)] text-[var(--text-muted)]')}>
                      {p}
                    </button>
                  ))}
                </div>
              </Row>

              {/* Font size */}
              <div className="py-3 border-b border-[var(--border)]">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-ui font-semibold text-sm text-[var(--text-primary)]">Font Size</div>
                  <span className="font-mono font-bold text-sm text-brand">{settings.tickerPopoutFontSize}px</span>
                </div>
                <input type="range" min={14} max={48} step={1}
                  value={settings.tickerPopoutFontSize}
                  onChange={e => updateSettings({ tickerPopoutFontSize: Number(e.target.value) })}
                  className="w-full accent-[var(--brand)] cursor-pointer h-1.5 mb-1" />
                <div className="flex justify-between text-[10px] font-ui text-[var(--text-muted)]">
                  <span>14px — compact</span><span>48px — across the room</span>
                </div>
              </div>

              {/* Background */}
              <Row label="Background">
                <div className="flex gap-1">
                  {([['black','Pure Black'],['dark','Dark'],['semi','Semi-transparent']] as const).map(([val, lbl]) => (
                    <button key={val} onClick={() => updateSettings({ tickerPopoutBackground: val })}
                      className={clsx('px-3 py-1 rounded text-xs font-ui font-bold uppercase border transition-colors',
                        settings.tickerPopoutBackground === val ? 'bg-brand/10 border-brand/40 text-brand' : 'border-[var(--border)] text-[var(--text-muted)]')}>
                      {lbl}
                    </button>
                  ))}
                </div>
              </Row>

              {/* Opacity */}
              <div className="py-3 border-b border-[var(--border)]">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-ui font-semibold text-sm text-[var(--text-primary)]">Opacity</div>
                  <span className="font-mono font-bold text-sm text-brand">{Math.round((settings.tickerPopoutOpacity ?? 1) * 100)}%</span>
                </div>
                <input type="range" min={0.5} max={1} step={0.05}
                  value={settings.tickerPopoutOpacity ?? 1}
                  onChange={e => updateSettings({ tickerPopoutOpacity: Number(e.target.value) })}
                  className="w-full accent-[var(--brand)] cursor-pointer h-1.5" />
              </div>

              {/* Categories — independent of main app */}
              <div className="py-3 border-b border-[var(--border)]">
                <div className="font-ui font-semibold text-sm text-[var(--text-primary)] mb-1">Popout Categories</div>
                <div className="font-ui text-xs text-[var(--text-muted)] mb-3">Independent of the main app filter</div>
                <div className="flex flex-wrap gap-2">
                  {Object.values(CATEGORY_CONFIGS).map(cfg => {
                    const active = (settings.tickerPopoutCategories ?? []).includes(cfg.id);
                    return (
                      <button key={cfg.id} onClick={() => togglePopoutCategory(cfg.id)}
                        className={clsx('px-3 py-1.5 rounded text-xs font-ui font-bold uppercase tracking-wide border transition-all',
                          active ? 'border-current' : 'border-[var(--border)] text-[var(--text-muted)] opacity-40'
                        )}
                        style={active ? { color: cfg.color, borderColor: `${cfg.color}50`, background: `${cfg.color}10` } : undefined}>
                        {cfg.emoji} {cfg.shortName}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Show clock */}
              <Row label="Show clock" desc="Large clock panel alongside the ticker">
                <Toggle checked={settings.tickerPopoutShowClock ?? true} onChange={v => updateSettings({ tickerPopoutShowClock: v })} />
              </Row>

              {/* Auto-fullscreen */}
              <Row label="Auto-fullscreen" desc="Requests fullscreen when the window opens">
                <Toggle checked={settings.tickerPopoutAutoFullscreen ?? true} onChange={v => updateSettings({ tickerPopoutAutoFullscreen: v })} />
              </Row>

              {/* Ticker rows */}
              <Row label="Ticker rows" desc="Stack two independent feed rows in the popout">
                <div className="flex gap-1">
                  {([1, 2] as const).map(r => (
                    <button key={r} onClick={() => updateSettings({ tickerPopoutRows: r })}
                      className={clsx('px-3 py-1 rounded text-xs font-ui font-bold border transition-colors',
                        (settings.tickerPopoutRows ?? 1) === r ? 'bg-brand/10 border-brand/40 text-brand' : 'border-[var(--border)] text-[var(--text-muted)]')}>
                      {r}
                    </button>
                  ))}
                </div>
              </Row>

              {/* Row 2 categories — only shown when rows=2 */}
              {(settings.tickerPopoutRows ?? 1) === 2 && (
                <div className="py-3 border-b border-[var(--border)]">
                  <div className="font-ui font-semibold text-sm text-[var(--text-primary)] mb-1">Row 2 Categories</div>
                  <div className="font-ui text-xs text-[var(--text-muted)] mb-3">Bottom row shows these feeds</div>
                  <div className="flex flex-wrap gap-2">
                    {Object.values(CATEGORY_CONFIGS).map(cfg => {
                      const active = (settings.tickerPopoutCategories2 ?? []).includes(cfg.id);
                      return (
                        <button key={cfg.id} onClick={() => togglePopoutCategory2(cfg.id)}
                          className={clsx('px-3 py-1.5 rounded text-xs font-ui font-bold uppercase tracking-wide border transition-all',
                            active ? 'border-current' : 'border-[var(--border)] text-[var(--text-muted)] opacity-40'
                          )}
                          style={active ? { color: cfg.color, borderColor: `${cfg.color}50`, background: `${cfg.color}10` } : undefined}>
                          {cfg.emoji} {cfg.shortName}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
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
