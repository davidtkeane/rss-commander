import { useState, useRef, useEffect, useCallback } from 'react';

// ── Window Management API type declarations ───────────────────────────────────
// The spec is Chrome 100+ only; lib.dom.d.ts doesn't include it yet.
interface ScreenDetailed extends Screen {
  readonly availLeft: number;
  readonly availTop: number;
  readonly label: string;
  readonly isPrimary: boolean;
  readonly isInternal: boolean;
  readonly devicePixelRatio: number;
}

interface ScreenDetails {
  readonly screens: ScreenDetailed[];
  readonly currentScreen: ScreenDetailed;
}

declare global {
  interface Window {
    getScreenDetails?: () => Promise<ScreenDetails>;
  }
}

// ── Public types ──────────────────────────────────────────────────────────────

export type PermissionState = 'unsupported' | 'prompt' | 'granted' | 'denied';

export interface ManagedScreen {
  index: number;
  label: string;
  isPrimary: boolean;
  isInternal: boolean;
  availLeft: number;
  availTop: number;
  availWidth: number;
  availHeight: number;
}

export interface LaunchOptions {
  url: string;
  screenIndex: number;       // -1 = let browser decide (primary)
  position: 'top' | 'bottom';
  height: number;
}

export interface UseScreenManagerResult {
  supported: boolean;
  permissionState: PermissionState;
  screens: ManagedScreen[];
  isPopoutOpen: boolean;
  requestAccess: () => Promise<boolean>;
  launchPopout: (opts: LaunchOptions) => boolean; // false = popup blocked
  closePopout: () => void;
  focusPopout: () => void;
  sendCommand: (type: string, payload?: unknown) => void;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

const BROADCAST_CHANNEL = 'rss-ticker-popout';

export function useScreenManager(): UseScreenManagerResult {
  const supported = typeof window !== 'undefined' && 'getScreenDetails' in window;

  const [permissionState, setPermissionState] = useState<PermissionState>(
    supported ? 'prompt' : 'unsupported'
  );
  const [screens, setScreens] = useState<ManagedScreen[]>([]);
  const [isPopoutOpen, setIsPopoutOpen] = useState(false);
  const popoutRef  = useRef<Window | null>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);

  // Open BroadcastChannel for sending commands to the popout
  useEffect(() => {
    channelRef.current = new BroadcastChannel(BROADCAST_CHANNEL);
    return () => { channelRef.current?.close(); channelRef.current = null; };
  }, []);

  // Detect external close (user closes the popout window directly)
  useEffect(() => {
    const id = setInterval(() => {
      if (popoutRef.current?.closed) {
        popoutRef.current = null;
        setIsPopoutOpen(false);
      }
    }, 1000);
    return () => clearInterval(id);
  }, []);

  /**
   * Trigger the one-time browser permission prompt for the Window Management API.
   * Returns true if access was granted, false if denied or unsupported.
   */
  const requestAccess = useCallback(async (): Promise<boolean> => {
    if (!supported || !window.getScreenDetails) {
      setPermissionState('unsupported');
      return false;
    }
    try {
      const details = await window.getScreenDetails();
      const mapped: ManagedScreen[] = details.screens.map((s, i) => ({
        index: i,
        label: s.label?.trim() || (s.isPrimary ? 'Primary Display' : `Display ${i + 1}`),
        isPrimary: s.isPrimary,
        isInternal: s.isInternal,
        availLeft: s.availLeft,
        availTop: s.availTop,
        availWidth: s.availWidth,
        availHeight: s.availHeight,
      }));
      setScreens(mapped);
      setPermissionState('granted');
      return true;
    } catch {
      // SecurityError = user denied; NotAllowedError = same
      setPermissionState('denied');
      return false;
    }
  }, [supported]);

  /**
   * Open the ticker popout window on the target screen.
   * Falls back to primary screen if Window Management API wasn't granted or
   * screenIndex is -1.
   *
   * Returns false if the browser blocked the popup.
   */
  const launchPopout = useCallback((opts: LaunchOptions): boolean => {
    // Re-focus if already open
    if (popoutRef.current && !popoutRef.current.closed) {
      popoutRef.current.focus();
      return true;
    }

    // Resolve geometry from the target screen (or fallback to primary)
    const target = opts.screenIndex >= 0 ? screens[opts.screenIndex] : null;

    const left         = target ? target.availLeft : 0;
    const screenTop    = target ? target.availTop  : 0;
    const width        = target ? target.availWidth  : window.screen.availWidth;
    const screenHeight = target ? target.availHeight : window.screen.availHeight;
    const top          = screenTop + (opts.position === 'bottom' ? screenHeight - opts.height : 0);

    const win = window.open(
      opts.url,
      'rss-ticker-popout',
      `popup,width=${width},height=${opts.height},left=${left},top=${top}`
    );

    if (!win) return false;

    popoutRef.current = win;
    setIsPopoutOpen(true);
    return true;
  }, [screens]);

  const sendCommand = useCallback((type: string, payload?: unknown) => {
    channelRef.current?.postMessage({ type, ...(payload ? { payload } : {}) });
  }, []);

  const closePopout = useCallback(() => {
    // Belt-and-suspenders: direct close + BroadcastChannel (survives page refresh)
    popoutRef.current?.close();
    sendCommand('CLOSE');
    popoutRef.current = null;
    setIsPopoutOpen(false);
  }, [sendCommand]);

  const focusPopout = useCallback(() => {
    popoutRef.current?.focus();
  }, []);

  return {
    supported,
    permissionState,
    screens,
    isPopoutOpen,
    requestAccess,
    launchPopout,
    closePopout,
    focusPopout,
    sendCommand,
  };
}
