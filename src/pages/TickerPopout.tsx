import { useEffect, useRef, useState } from 'react';
import { useStore } from '../store/useStore';
import NewsTicker from '../components/Ticker/NewsTicker';

const BROADCAST_CHANNEL = 'rss-ticker-popout';

export default function TickerPopout() {
  const { settings } = useStore();
  const [time, setTime] = useState(new Date());
  const channelRef = useRef<BroadcastChannel | null>(null);

  // Live clock
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // BroadcastChannel — listen for CLOSE command from main window
  useEffect(() => {
    channelRef.current = new BroadcastChannel(BROADCAST_CHANNEL);
    channelRef.current.onmessage = (e) => {
      if (e.data?.type === 'CLOSE') {
        document.exitFullscreen().catch(() => {}).finally(() => window.close());
      }
    };
    return () => { channelRef.current?.close(); channelRef.current = null; };
  }, []);

  // Auto-fullscreen — slight delay so the window is fully painted first
  useEffect(() => {
    if (!settings.tickerPopoutAutoFullscreen) return;
    const timer = setTimeout(() => {
      document.documentElement.requestFullscreen().catch(() => {});
    }, 250);
    return () => clearTimeout(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const bgColor = {
    black: '#000000',
    dark:  '#0a0a10',
    semi:  'rgba(7, 7, 9, 0.90)',
  }[settings.tickerPopoutBackground] ?? '#000000';

  const fontSize  = settings.tickerPopoutFontSize ?? 24;
  const isBottom  = settings.tickerPopoutPosition !== 'top';
  const rows      = settings.tickerPopoutRows ?? 1;

  const cats1 = settings.tickerPopoutCategories?.length > 0
    ? settings.tickerPopoutCategories
    : undefined;
  const cats2 = (settings.tickerPopoutCategories2?.length ?? 0) > 0
    ? settings.tickerPopoutCategories2
    : undefined;

  const pad = (n: number) => String(n).padStart(2, '0');
  const clockStr = `${pad(time.getHours())}:${pad(time.getMinutes())}:${pad(time.getSeconds())}`;

  // Clock panel — spans full height of the ticker band(s)
  const ClockPanel = () => (
    <div
      style={{
        fontFamily:    "'JetBrains Mono', monospace",
        fontSize:      `${Math.round(fontSize * 1.1)}px`,
        fontWeight:    600,
        color:         '#22d3ee',
        letterSpacing: '0.06em',
        padding:       `0 ${Math.round(fontSize * 0.8)}px`,
        flexShrink:    0,
        borderRight:   '1px solid rgba(34,211,238,0.2)',
        display:       'flex',
        alignItems:    'center',
        background:    'rgba(34,211,238,0.04)',
        userSelect:    'none',
      }}
    >
      {clockStr}
    </div>
  );

  return (
    <div
      style={{
        width:          '100vw',
        height:         '100vh',
        background:     bgColor,
        opacity:        settings.tickerPopoutOpacity ?? 1,
        display:        'flex',
        flexDirection:  'column',
        justifyContent: isBottom ? 'flex-end' : 'flex-start',
        overflow:       'hidden',
      }}
    >
      {rows === 2 ? (
        /* ── Two-row layout ─────────────────────────────────── */
        <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
          {/* Row 1 */}
          <div style={{ display: 'flex', alignItems: 'stretch', width: '100%' }}>
            {settings.tickerPopoutShowClock && <ClockPanel />}
            <div style={{ flex: 1, minWidth: 0 }}>
              <NewsTicker popoutMode overrideCategories={cats1} overrideFontSize={fontSize} />
            </div>
          </div>
          {/* Divider */}
          <div style={{ height: '1px', background: 'rgba(34,211,238,0.12)', flexShrink: 0 }} />
          {/* Row 2 */}
          <div style={{ display: 'flex', alignItems: 'stretch', width: '100%' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <NewsTicker popoutMode overrideCategories={cats2} overrideFontSize={fontSize} />
            </div>
          </div>
        </div>
      ) : (
        /* ── Single-row layout ──────────────────────────────── */
        <div style={{ display: 'flex', alignItems: 'stretch', width: '100%' }}>
          {settings.tickerPopoutShowClock && <ClockPanel />}
          <div style={{ flex: 1, minWidth: 0 }}>
            <NewsTicker popoutMode overrideCategories={cats1} overrideFontSize={fontSize} />
          </div>
        </div>
      )}
    </div>
  );
}
