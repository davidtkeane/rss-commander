import { useEffect, useState } from 'react';
import { useStore } from '../store/useStore';
import NewsTicker from '../components/Ticker/NewsTicker';

export default function TickerPopout() {
  const { settings } = useStore();
  const [time, setTime] = useState(new Date());

  // Live clock
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Auto-fullscreen — slight delay so the window is fully painted first
  useEffect(() => {
    if (!settings.tickerPopoutAutoFullscreen) return;
    const timer = setTimeout(() => {
      document.documentElement.requestFullscreen().catch(() => {
        // Fullscreen may be blocked if window wasn't opened by a user gesture.
        // A click-to-fullscreen overlay could be added here in future.
      });
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
  const cats      = settings.tickerPopoutCategories?.length > 0
    ? settings.tickerPopoutCategories
    : undefined;

  const pad = (n: number) => String(n).padStart(2, '0');
  const clockStr = `${pad(time.getHours())}:${pad(time.getMinutes())}:${pad(time.getSeconds())}`;

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
      <div style={{ display: 'flex', alignItems: 'stretch', width: '100%' }}>

        {/* Clock panel */}
        {settings.tickerPopoutShowClock && (
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
        )}

        {/* Ticker */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <NewsTicker
            popoutMode
            overrideCategories={cats}
            overrideFontSize={fontSize}
          />
        </div>
      </div>
    </div>
  );
}
