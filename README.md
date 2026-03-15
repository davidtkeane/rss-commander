# RSS Commander 📡

> **Signal Intelligence Terminal** — A professional RSS feed aggregator for security researchers, threat intelligence analysts, and cybersecurity professionals.

![RSS Commander](https://img.shields.io/badge/RSS-Commander-22d3ee?style=for-the-badge&logo=rss&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind-3-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

---

## What is RSS Commander?

RSS Commander is a **standalone, dark-themed RSS aggregator** built for people who need to stay on top of security intelligence feeds. It's not another Feedly clone — it's a focused tool designed for:

- 🔓 **Penetration testers** tracking exploit databases and advisories
- 🦠 **Malware analysts** monitoring threat intel feeds
- 🔍 **DFIR professionals** following incident response blogs
- 🛡️ **Compliance/privacy teams** watching data governance news
- 📰 **Security engineers** keeping up with the industry

---

## Screenshots

```
┌─────────────────────────────────────────────────────────────────┐
│ ◉ LIVE  14:23:07  [PENTEST] CISA Advisory: Critical RCE... ◆   │  ← Live ticker
├──────────┬──────────────────────────────────────────────────────┤
│          │ 🔍 Search...      [Cards][List][≡]    [Refresh]      │
│  RSS     ├──────────────────────────────────────────────────────┤
│COMMANDER │                                                       │
│          │  [PENTEST] Krebs on Security    2h ago  ★  🔖        │
│ Dashboard│  Critical vulnerability in...                        │
│ Ticker   │  Researchers have discovered a new...                │
│ Feeds    │                                                       │
│ Vault    │  [MALWARE] Kaspersky Securelist  4h ago  ★  🔖       │
│ Settings │  New ransomware campaign targeting...                 │
│ Profile  │                                                       │
│          │  [DFIR] The DFIR Report         6h ago  ★  🔖        │
│ PENTEST  │  Inside a Cobalt Strike C2...                        │
│ MALWARE  │                                                       │
└──────────┴──────────────────────────────────────────────────────┘
```

---

## Features

### 📺 Live News Ticker
- Smooth horizontal scrolling headline bar — always visible at the top
- 4 speed modes: Slow / Normal / Fast / Turbo
- Pause on hover, live clock, category badges per headline
- **Standalone ticker mode** — collapse to just the scrolling bar for a second screen or pinned window

### 📊 Dashboard Views
- **Cards** — rich grid with description previews
- **List** — compact rows, high density
- **Compact** — ultra-dense, just headlines with color dots
- **Magazine** — editorial-style larger cards

### 📡 Feed Management
- 30 default security feeds across 6 categories (all configurable)
- Add any RSS/Atom URL with live test + preview before adding
- Per-feed: enable/disable, error tracking, last-fetched status
- Bulk operations per category

### 🗂️ 6 Security Categories
| Category | Color | Feeds include |
|----------|-------|---------------|
| 🔓 Penetration Testing | Amber | CISA, ExploitDB, Krebs, Dark Reading |
| 🦠 Malware Analysis | Red | Kaspersky, ESET, Unit42, Malwarebytes |
| 🔍 Digital Forensics | Blue | The DFIR Report, Forensic Focus, Huntress |
| 📰 Cyber News | Green | BleepingComputer, SecurityWeek, Cyberscoop |
| 🛡️ Data Governance | Teal | IAPP, EFF, NOYB, Inside Privacy |
| ⛓️ Blockchain | Violet | Cointelegraph, CryptoSlate, CoinDesk |

### 🔐 API Vault
Secure browser-local storage for your threat intelligence API keys:
- Shodan, VirusTotal, AbuseIPDB, GreyNoise, Censys
- AlienVault OTX, SecurityTrails, URLVoid
- OpenAI, Anthropic (for AI features)
- Any custom API key

### ⚙️ Rich Settings (7 tabs)
- Ticker: speed, height, pause, category badges, timestamps
- Display: layout mode, font size, image/description toggle
- Feeds: auto-refresh interval, sort order, keyword blacklist, category toggles
- Notifications: browser push notifications per category
- AI: toggle AI summaries (OpenAI / Anthropic / Ollama)
- Advanced: proxy URL, import/export OPML + JSON
- About: stats and info

### 👤 User Profile + Feed Sharing
- Set your name, handle, role, organization
- Export your feed list as OPML to share with colleagues
- Import a colleague's OPML in one click

### ⌨️ Power User Features
- Per-article: mark read, star, save for later
- Search across all headlines
- Keyword blacklist (filter out noise)
- Sort by newest / oldest / unread first / alphabetical
- Auto-refresh on configurable interval
- OPML 2.0 import/export (compatible with every RSS reader)

---

## Quick Start

### Prerequisites
- Node.js 18+
- npm 9+

### Install & Run
```bash
git clone https://github.com/davidtkeane/rss-commander.git
cd rss-commander
npm install
npm run dev
```

Open **http://localhost:5174** in your browser.

> The app starts two processes: the React frontend (port 5174) and an Express proxy server (port 3001). The proxy is required because RSS feeds don't support CORS — the browser can't fetch them directly.

### Build for Production
```bash
npm run build       # outputs to dist/
npm run preview     # preview the production build
```

---

## Architecture

```
rss-commander/
├── server/index.js          # Express proxy — CORS-safe RSS fetching
├── src/
│   ├── App.tsx              # Root — view switcher, auto-refresh
│   ├── types/index.ts       # All TypeScript types + default feeds
│   ├── store/useStore.ts    # Zustand store — all state & actions
│   ├── services/
│   │   ├── exportService.ts # OPML + JSON import/export
│   │   └── vaultService.ts  # API key masking & helpers
│   └── components/
│       ├── Layout/          # Sidebar + TopBar + Detail pane
│       ├── Ticker/          # Animated news ticker
│       ├── Dashboard/       # Article cards/list/compact view
│       ├── FeedManager/     # Add/remove/configure feeds
│       ├── Settings/        # 7-tab settings panel
│       ├── Profile/         # User profile + sharing
│       └── Vault/           # API key storage
```

**Tech stack**: React 18 · TypeScript · Vite · Tailwind CSS · Zustand · Express

Full build notes: [`BUILD_KNOWLEDGE.md`](./BUILD_KNOWLEDGE.md)

---

## Adding Your Own Feeds

1. Click **Feed Manager** in the sidebar
2. Paste any RSS/Atom URL and click **Test**
3. It shows a live preview of the feed's headlines
4. Set the category, name, and click **Add**

Or import an OPML file directly (File → Settings → Advanced → Import OPML).

---

## Standalone Ticker Mode

Want a scrolling news ticker on a second screen or pinned to the top of your display?

1. Run `npm run dev`
2. Open `http://localhost:5174` in a small browser window
3. Click **Ticker View** in the sidebar
4. The UI collapses to just the scrolling headline bar
5. Resize the window to a thin horizontal strip and pin it

---

## Contributing

Pull requests welcome. Areas that would benefit most:

- [ ] Full-text article extraction (Mercury/Readability)
- [ ] Keyboard shortcut system (`j/k` navigation, `r` read, `s` star)
- [ ] Vault encryption with Web Crypto API (AES-GCM + master password)
- [ ] Feed health history / uptime tracking
- [ ] AI daily briefing (summarise top stories)
- [ ] Mobile responsive layout
- [ ] Electron wrapper for desktop app

See [`BUILD_KNOWLEDGE.md`](./BUILD_KNOWLEDGE.md) for the full architectural guide.

---

## License

MIT — free to use, modify, and distribute.

---

Built with ☕ by [David Keane](https://github.com/davidtkeane) · Part of the [RangerPlex](https://github.com/davidtkeane) ecosystem 🎖️
