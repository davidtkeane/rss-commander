import { useEffect } from 'react';
import { useStore } from './store/useStore';
import AppLayout from './components/Layout/AppLayout';
import FeedDashboard from './components/Dashboard/FeedDashboard';
import NewsTicker from './components/Ticker/NewsTicker';
import SettingsPanel from './components/Settings/SettingsPanel';
import UserProfile from './components/Profile/UserProfile';
import ApiVault from './components/Vault/ApiVault';
import FeedManager from './components/FeedManager/FeedManager';
import ArchiveSearch from './components/Archive/ArchiveSearch';

export default function App() {
  const { ui, stats, initDefaultFeeds, fetchAllFeeds, settings } = useStore();

  useEffect(() => {
    initDefaultFeeds();
    fetchAllFeeds();
  }, []);

  // Auto-refresh
  useEffect(() => {
    if (settings.autoRefreshInterval <= 0) return;
    const interval = setInterval(() => {
      fetchAllFeeds();
    }, settings.autoRefreshInterval * 60 * 1000);
    return () => clearInterval(interval);
  }, [settings.autoRefreshInterval]);

  // Standalone ticker mode: just show the ticker fullscreen
  if (ui.view === 'ticker') {
    return (
      <div className="h-screen flex flex-col bg-[#070709] justify-center">
        <NewsTicker standalone />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="font-display text-4xl font-bold text-brand mb-2">RSS COMMANDER</div>
            <div className="font-ui text-[var(--text-muted)] text-sm uppercase tracking-widest">Signal Intelligence Terminal</div>
            <div className="mt-8 font-mono text-xs text-[var(--text-muted)]">{stats.enabledFeeds} feeds active</div>
          </div>
        </div>
      </div>
    );
  }

  const renderView = () => {
    switch (ui.view) {
      case 'dashboard': return <FeedDashboard />;
      case 'feeds':     return <FeedManager />;
      case 'archive':   return <ArchiveSearch />;
      case 'settings':  return <SettingsPanel />;
      case 'profile':   return <UserProfile />;
      case 'vault':     return <ApiVault />;
      default:          return <FeedDashboard />;
    }
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[#070709]">
      {settings.tickerEnabled && <NewsTicker />}
      <AppLayout>{renderView()}</AppLayout>
    </div>
  );
}
