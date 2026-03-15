# RSS Commander — Build Knowledge Base

> **Purpose of this file**: Complete reference for adding features, removing components, debugging, and understanding every architectural decision made when building this app. Read this before touching any file.

**Built**: 2026-03-15
**Built by**: 4-agent AI swarm (Claude Sonnet 4.6) + main agent coordination
**Total lines**: ~2,662 across 22 files
**Status**: Functional, zero TypeScript errors

---

## Table of Contents

1. [The Big Picture — How It All Fits](#1-the-big-picture)
2. [Tech Stack — What & Why](#2-tech-stack)
3. [File Map — Every File Explained](#3-file-map)
4. [Data Flow — How Data Moves](#4-data-flow)
5. [The Zustand Store — Brain of the App](#5-the-zustand-store)
6. [The Proxy Server — RSS Fetching](#6-the-proxy-server)
7. [The Ticker — How the Scroll Works](#7-the-ticker)
8. [CSS Architecture — The Visual System](#8-css-architecture)
9. [Component Reference — Every Component](#9-component-reference)
10. [Adding New Features — Step by Step](#10-adding-new-features)
11. [Removing Features — What's Safe to Remove](#11-removing-features)
12. [Common Patterns Used Throughout](#12-common-patterns)
13. [Known Limitations & Future Work](#13-known-limitations)
14. [Environment & Running Locally](#14-environment)

---

## 1. The Big Picture

RSS Commander is a **standalone** React app. It has two processes:

```
┌─────────────────────────────────────────────────────────────────┐
│  BROWSER (port 5174)                                            │
│  React + Vite + Tailwind + Zustand                             │
│                                                                  │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐    │
│  │  Ticker  │   │ Sidebar  │   │Dashboard │   │  Detail  │    │
│  │  (top)   │   │  (left)  │   │ (center) │   │  Pane    │    │
│  └──────────┘   └──────────┘   └──────────┘   └──────────┘    │
│         ↑               ↑              ↑                        │
│         └───────────────┴──────────────┘                        │
│                    Zustand Store                                  │
│               (state lives here, persisted                       │
│                to localStorage)                                  │
│                        │                                         │
│                        ↓ fetch()                                 │
│              POST /api/rss/parse                                 │
└──────────────────────────────────────────────────────────────────┘
                         │ HTTP
┌──────────────────────────────────────────────────────────────────┐
│  PROXY SERVER (port 3001)                                       │
│  Express.js (Node)                                              │
│                                                                  │
│  Reason it exists: RSS feeds don't have CORS headers.           │
│  Browser can't fetch them directly. Proxy fetches on behalf     │
│  of the browser and returns parsed JSON.                        │
│                                                                  │
│  POST /api/rss/parse  → fetch URL → parse XML → return items   │
│  POST /api/rss/test   → quick test, returns preview             │
│  GET  /api/health     → "ok"                                    │
└──────────────────────────────────────────────────────────────────┘
```

**Key constraint**: The browser CANNOT fetch RSS feeds directly (CORS). Everything goes through the proxy. This is non-negotiable unless you use a public CORS proxy service.

---

## 2. Tech Stack

| Tool | Version | Why chosen |
|------|---------|-----------|
| **React 18** | `^18.3.1` | Component model, hooks, StrictMode |
| **TypeScript** | `^5.4.5` | Strict types, catches errors at compile time |
| **Vite** | `^5.2.11` | Fast dev server, HMR, ESM native |
| **Tailwind CSS** | `^3.4.3` | Utility-first, no CSS files for components |
| **Zustand** | `^4.5.2` | Simple state management, no boilerplate |
| **Framer Motion** | `^11.2.10` | Installed but not yet wired in (use for future animations) |
| **date-fns** | `^3.3.1` | `formatDistanceToNow()` for "2h ago" timestamps |
| **DOMPurify** | `^3.1.5` | Installed, not yet used — for sanitizing HTML in article content |
| **clsx** | `^2.1.1` | Conditional class names (replaces `classnames`) |
| **lucide-react** | `^0.378.0` | Icon set — all icons imported from here |
| **Express** | `^4.19.2` | Proxy server only — very minimal use |
| **cors** | `^2.8.5` | CORS middleware for the proxy |
| **concurrently** | `^8.2.2` | Runs proxy + vite at the same time with `npm run dev` |

### What's NOT used (installed but dormant)
- `framer-motion` — installed, ready for animations, not yet used in any component
- `dompurify` — installed for sanitizing `item.content` HTML, not yet hooked in
- `fast-xml-parser` — was considered, replaced with manual regex parser in `server/index.js` to avoid an ESM/CJS issue

---

## 3. File Map

```
apps/rss-commander/
│
├── package.json              # Dependencies, npm scripts
├── vite.config.ts            # Dev server port 5174, React plugin
├── tsconfig.json             # TypeScript: strict, no-emit (Vite handles build)
├── tailwind.config.js        # Custom colors, fonts, animations
├── postcss.config.js         # Required by Tailwind
├── index.html                # Entry HTML, loads Google Fonts
│
├── server/
│   └── index.js             # Express proxy server — ALL RSS fetching happens here
│
└── src/
    ├── main.tsx             # React entry point — createRoot, StrictMode
    ├── App.tsx              # Root component — view switcher, auto-refresh timer
    ├── index.css            # ALL global styles — CSS vars, animations, classes
    │
    ├── types/
    │   └── index.ts         # Every TypeScript type + DEFAULT_FEEDS + CATEGORY_CONFIGS
    │
    ├── store/
    │   └── useStore.ts      # Zustand store — ALL state and actions (the brain)
    │
    ├── services/
    │   ├── exportService.ts # OPML generate/parse, JSON export, file download
    │   └── vaultService.ts  # Key masking, service icons, ID generation
    │
    └── components/
        ├── Layout/
        │   └── AppLayout.tsx        # Sidebar + TopBar + DetailPane (the shell)
        ├── Ticker/
        │   └── NewsTicker.tsx       # Scrolling news ticker + live clock
        ├── Dashboard/
        │   ├── FeedDashboard.tsx    # Article list with filtering/sorting
        │   └── ArticleCard.tsx      # Single article (cards/list/compact mode)
        ├── FeedManager/
        │   └── FeedManager.tsx      # Add/remove/toggle feeds, URL testing
        ├── Settings/
        │   └── SettingsPanel.tsx    # 7-tab settings panel
        ├── Profile/
        │   └── UserProfile.tsx      # User profile + feed sharing
        └── Vault/
            └── ApiVault.tsx         # API key storage
```

---

## 4. Data Flow

### Startup sequence (App.tsx `useEffect`)
```
App mounts
  → initDefaultFeeds()     // if store is empty, load 30 default feeds from types/index.ts
  → computeStats()         // count totals from current store state
  → fetchAllFeeds()        // fire off all enabled feeds → proxy → items into store
```

### Feed fetch cycle
```
store.fetchAllFeeds()
  → for each enabled feed:
      POST http://localhost:3001/api/rss/parse { url: feed.url }
      ← { success: true, items: [...], feedTitle, itemCount }
  → map raw items to RSSItem shape (assign id, category, read=false, starred=false)
  → dedup: merge with existing items (preserve read/star/saved state by matching id)
  → sort newest first
  → limit to 2000 total items
  → set({ feeds: updatedFeeds, items: allItems })
  → computeStats()
```

### Item ID generation
```typescript
id = `item_${feedId}_${hashCode(link || guid)}`
```
This is **deterministic** — same article from same feed always gets same ID. This is how read/star state is preserved across refreshes. If you change the hash function, all read states will be lost.

### State persistence (Zustand persist)
- Stored in `localStorage` under key `'rss-commander-store'`
- Only persists: `feeds`, `items`, `settings`, `profile`, `vault`
- Does NOT persist: `ui`, `stats`, `isLoading`, `isFetching`, `error`
- On reload: store hydrates from localStorage, then `computeStats()` runs to rebuild derived stats

---

## 5. The Zustand Store

**File**: `src/store/useStore.ts` (381 lines — biggest file)

The store is the single source of truth. Every component reads from it and writes to it. There is no local state for data (only for UI interactions like form fields).

### State shape
```typescript
feeds: RSSFeed[]          // feed config (url, category, enabled, lastFetched...)
items: RSSItem[]          // article items (title, link, read, starred...)
settings: RSSSettings     // all user preferences
profile: UserProfile      // name, handle, role etc
vault: VaultEntry[]       // API keys
stats: AppStats           // computed counts (not persisted)
ui: UIState               // view, activeCategory, searchQuery, selectedItemId
isLoading: boolean        // unused currently (use for future heavy operations)
isFetching: boolean       // true while feeds are being fetched
error: string | null      // last error message
```

### Key actions quick reference

| Action | What it does |
|--------|-------------|
| `initDefaultFeeds()` | Loads 30 default feeds IF store is empty |
| `addFeed(data)` | Creates feed with generated ID, adds to `feeds[]` |
| `removeFeed(id)` | Removes feed AND all its items from store |
| `toggleFeed(id)` | Flips `enabled` boolean |
| `fetchAllFeeds()` | Fetches all enabled feeds via proxy, merges into items |
| `markRead(id)` | Sets `item.read = true` |
| `markAllRead(cat?)` | Marks all (or all in category) as read |
| `toggleStar(id)` | Flips `item.starred` |
| `toggleSaved(id)` | Flips `item.saved` |
| `setView(view)` | Changes `ui.view` → triggers App.tsx to render different panel |
| `setSelectedItem(id)` | Opens detail pane, sets `ui.detailPaneOpen = true` |
| `exportOPML()` | Calls exportService, triggers browser download |
| `exportJSON()` | Same for full JSON backup |
| `importOPML(xml)` | Parses OPML, adds new feeds (skips duplicates by URL) |
| `computeStats()` | Rebuilds all counts from current state |

### Adding a new store action
1. Add it to the `AppState` interface at the top
2. Implement it in the `create()` body
3. Call `get().computeStats()` if it changes feeds or items
4. Access in components with `const { myAction } = useStore()`

---

## 6. The Proxy Server

**File**: `server/index.js` (146 lines)

**Why it's simple regex-based**: Originally planned to use `fast-xml-parser` but ran into ESM/CJS import issues. The manual regex parser works for 95% of feeds and avoids the dependency.

### How the XML parser works
```javascript
// Tries RSS 2.0 first:
/<item[^>]*>([\s\S]*?)<\/item>/gi  → for each match, extract title/link/pubDate/description/guid

// Falls back to Atom if no items found:
/<entry[^>]*>([\s\S]*?)<\/entry>/gi → title + href attribute + updated/published + summary
```

**CDATA handling**: `replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')` — strips CDATA wrappers from all extracted text.

### When to update the proxy
- **New endpoint needed**: Add a new `app.post('/api/...')` route
- **Feed won't parse**: Check if it's RSS 2.0 or Atom. Look at the raw XML. The regex might need a tweak.
- **Timeout issues**: Default is `AbortSignal.timeout(10000)` (10s). Lower it if you want faster failures.
- **Auth headers needed**: Some premium feeds require `Authorization: Bearer TOKEN`. Add it to the fetch headers.

---

## 7. The Ticker

**File**: `src/components/Ticker/NewsTicker.tsx` (129 lines)

The ticker is a pure CSS animation approach — no JavaScript moving elements.

### How seamless looping works
```tsx
// Original items: [A, B, C, D, E]
const displayItems = [...tickerItems, ...tickerItems]; // [A, B, C, D, E, A, B, C, D, E]

// CSS animation moves the whole strip from 0% to -50%
// At -50%, we're exactly where we started (because it's doubled)
// Loop restarts invisibly
@keyframes ticker {
  0%   { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}
```

### Speed control
```tsx
const SPEED_MAP = { slow: '80s', normal: '50s', fast: '28s', turbo: '14s' };
// Applied as CSS custom property --ticker-duration
style={{ '--ticker-duration': SPEED_MAP[settings.tickerSpeed] }}
```

### Pause on hover
```tsx
// CSS animation-play-state is toggled
style={{ animationPlayState: isPaused ? 'paused' : 'running' }}
onMouseEnter={() => settings.tickerPauseOnHover && setIsPaused(true)}
onMouseLeave={() => setIsPaused(false)}
```

### Standalone ticker mode
In `App.tsx`, when `ui.view === 'ticker'`, the whole UI is replaced with just the ticker + a centered logo. This is the M3 Pro scrolling display mode. Open in a small window and pin it to the edge of the screen.

### To add a new ticker feature
- **Click opens URL directly**: In `handleItemClick`, call `window.open(item.link)` instead of `setSelectedItem`
- **Color-code headlines by category**: Add `style={{ color: cfg.color }}` to `.ticker-title`
- **Show source logo/favicon**: Add a `<img>` with `feed.favicon` before the title
- **Emergency alert ticker** (red background for malware): Check category before rendering, apply different class

---

## 8. CSS Architecture

**File**: `src/index.css` (~250 lines)
**No CSS modules, no styled-components** — everything is either Tailwind utilities or hand-written global classes in `index.css`.

### CSS Custom Properties (design tokens)
```css
:root {
  --bg-primary: #070709;      /* main background */
  --bg-secondary: #0d0d14;    /* sidebar, top bar */
  --bg-card: #111118;         /* article cards */
  --bg-hover: #16161f;        /* hover state */
  --border: #1e1e2e;          /* default border */
  --border-bright: #2a2a3e;   /* highlighted border */
  --brand: #22d3ee;           /* cyan accent */
  --brand-dim: rgba(34,211,238,0.12); /* cyan glow bg */
  --text-primary: #f1f5f9;
  --text-secondary: #94a3b8;
  --text-muted: #475569;
  --ticker-duration: 50s;     /* controlled by JS via style attribute */
}
```

**To change a color**: Update the CSS variable in `:root`. It cascades everywhere. No need to hunt Tailwind classes.

### The global class system

| Class | Where used | What it does |
|-------|-----------|-------------|
| `.ticker-band` | NewsTicker | The ticker container — border, bg, overflow |
| `.ticker-scroll` | NewsTicker | The animated strip — CSS animation target |
| `.ticker-item` | NewsTicker | Each headline — font, cursor, hover |
| `.cat-badge` | Everywhere | Category label chip — per-category color via child class |
| `.feed-card` | ArticleCard | Article card — border, bg, hover, `::before` color bar |
| `.sidebar` | AppLayout | Sidebar container — transitions for collapse |
| `.nav-item` | AppLayout | Sidebar nav button — hover, active state |
| `.cyber-input` | Forms everywhere | Dark styled input with cyan focus ring |
| `.cyber-btn` | Buttons | Cyan gradient primary button |
| `.cyber-btn-ghost` | Buttons | Ghost/outline button |
| `.toggle-switch` | Settings | Custom CSS checkbox toggle |
| `.pulse-dot` | Ticker, Sidebar | Animated green dot for "live" indicator |
| `.skeleton` | Dashboard | Loading shimmer animation |
| `.glass-card` | Modals (future) | Glassmorphism card |
| `.section-header` | All panels | Small uppercase gray section dividers |

### Fonts
```
Barlow Condensed → headings, ticker, titles (font-display class)
Rajdhani         → UI labels, buttons, badges (font-ui class, default body font)
JetBrains Mono   → URLs, code, timestamps, stats (font-mono class)
```
All loaded from Google Fonts in `index.html`. If offline, falls back to system sans-serif.

### Tailwind custom config
In `tailwind.config.js`:
- `brand.*` — cyan colors + glow
- `surface.*` — background scale
- `border.*` — border scale
- `cat.*` — category colors (pentesting/malware/etc)
- `fontFamily.display/ui/mono` — the three fonts
- `animation.ticker` + `keyframes.ticker` — CSS ticker animation

---

## 9. Component Reference

### `App.tsx` — Root
- **State it reads**: `ui.view`, `settings.tickerEnabled`, `settings.autoRefreshInterval`
- **On mount**: `initDefaultFeeds()` → `computeStats()` → `fetchAllFeeds()`
- **Auto-refresh**: `setInterval(fetchAllFeeds, interval * 60000)` — cleaned up on unmount
- **Standalone ticker**: `if (ui.view === 'ticker')` renders fullscreen ticker

### `AppLayout.tsx` — Shell (283 lines)
Contains THREE inline components: **Sidebar**, **TopBar**, **DetailPane**

**Sidebar** reads:
- `ui.view` — highlights active nav item
- `ui.activeCategory` — highlights active category
- `stats` — shows counts in sidebar footer
- `feeds` — for category unread counts

**TopBar** reads:
- `ui.searchQuery` — controlled search input
- `settings.articleLayout` — highlights active layout button

**DetailPane** renders when:
- `ui.detailPaneOpen === true` AND `ui.selectedItemId !== null`
- Reads `items` to find the selected item by ID
- Has: star, save, external link, close buttons

### `NewsTicker.tsx` — Ticker (129 lines)
- Only reads `items`, `settings`, `isFetching` from store
- Local state: `time` (clock), `isPaused` (hover pause)
- Filters items by `settings.enabledCategories`
- Limits to `settings.tickerMaxItems`
- Doubles the array for seamless loop

### `FeedDashboard.tsx` — Main panel (199 lines)
- Heavy `useMemo` for filtering — recalculates only when deps change
- Filter pipeline: category → enabled categories → search → blacklist → hideRead → starred → sort → slice(200)
- Renders: stats row, toolbar with "mark all read", article grid/list

### `ArticleCard.tsx` — Article card (152 lines)
- Renders differently for `'cards'`, `'list'`, `'compact'` (magazine = cards with bigger text)
- `--cat-color` CSS variable injected via `style` for the left border color
- All click handlers are passed as props (no store access here, keeps it dumb)

### `FeedManager.tsx` — Feed management (260 lines)
- Local state: `newUrl`, `newName`, `newCategory`, `testState`, `testPreview`, `addOpen`
- Tests feed by calling proxy directly: `fetch(proxyUrl + '/api/rss/test', ...)`
- Auto-populates feed name from test result's `feedTitle`
- Shows real-time status per feed: `✓ 12 items` or `✗ Error`

### `SettingsPanel.tsx` — Settings (346 lines — largest component)
- 7 tabs: Ticker | Display | Feeds | Notifications | AI | Advanced | About
- All settings wired to `updateSettings({ key: value })`
- Reset uses local `resetConfirm` state for safety confirmation
- Import uses `<label>` wrapping hidden `<input type="file">` trick

### `UserProfile.tsx` — Profile (157 lines)
- Local `form` state mirrors `profile` store state
- Save button calls `updateProfile(form)`
- Feed sharing: copies text or triggers OPML export download
- Shows enabled feeds preview in a scrollable box

### `ApiVault.tsx` — Vault (217 lines)
- `revealedIds: Set<string>` — tracks which keys are shown
- `confirmDelete` — stores the ID of entry pending deletion (two-click delete)
- `maskValue()` from vaultService: `••••••••••ab3f`
- Uses `<datalist>` for service name autocomplete
- Copy to clipboard: `navigator.clipboard.writeText(entry.value)`

---

## 10. Adding New Features

### Add a new RSS category
1. **`src/types/index.ts`**: Add to `RSSCategory` union type, add entry to `CATEGORY_CONFIGS`, add feeds to `DEFAULT_FEEDS`
2. **`src/index.css`**: Add `.cat-badge.yourCategory { }` rule with color
3. **`tailwind.config.js`**: Add `cat-yourcategory: '#hexcolor'` to colors
4. That's it — everything else (sidebar counts, ticker badges, filtering) is data-driven

### Add a new settings option
1. **`src/types/index.ts`**: Add field to `RSSSettings` interface, add default value to `DEFAULT_SETTINGS`
2. **`src/components/Settings/SettingsPanel.tsx`**: Add a `<Row>` in the appropriate tab
3. Wire it to `updateSettings({ newField: value })`
4. Use it in whichever component needs it via `settings.newField`

### Add a new view/panel
1. **`src/types/index.ts`**: Add the view name to `ViewMode` type
2. **`src/App.tsx`**: Add `case 'myview': return <MyComponent />;`
3. **`src/components/Layout/AppLayout.tsx`**: Add to `NAV_ITEMS` array with icon
4. Create `src/components/MyView/MyComponent.tsx`

### Add AI summarization
The groundwork is in `settings.aiEnabled`, `settings.aiProvider`, `settings.aiModel`.
To implement:
1. Add a button "Summarize" in `ArticleCard.tsx` (visible when `settings.aiEnabled`)
2. Read the API key from `vault` store: `vault.find(v => v.service === 'OpenAI')?.value`
3. Call the API with the article's `description` or fetch full content
4. Store summary in `RSSItem` (add `summary?: string` to the type)

### Add desktop notifications
The setting is in `settings.desktopNotifications` + `settings.notifyCategories`.
To implement:
1. In `fetchAllFeeds()` in the store, after loading new items, compare with previous item IDs
2. For truly new items in notify categories: `new Notification(item.title, { body: item.description })`
3. Request permission is already handled in the Settings panel toggle

### Add keyboard shortcuts
1. Create `src/hooks/useKeyboard.ts`
2. Use `useEffect` with `document.addEventListener('keydown', handler)`
3. Map: `j/k` = next/prev article, `r` = mark read, `s` = star, `o` = open link, `?` = help modal
4. Call store actions directly

### Add full-content fetching (Mercury/Readability)
The `fetchFullContent` field already exists on `RSSFeed`.
To implement:
1. In `server/index.js`, add a new endpoint `POST /api/rss/fulltext` that fetches the article URL and strips HTML with a basic parser
2. In the store's `fetchAllFeeds`, if `feed.fetchFullContent`, call the new endpoint
3. Store result in `item.content`

---

## 11. Removing Features

### Remove the API Vault
1. Delete `src/components/Vault/ApiVault.tsx`
2. Delete `src/services/vaultService.ts`
3. In `src/types/index.ts`: remove `VaultEntry` interface, remove from `DEFAULT_SETTINGS` if referenced
4. In `src/store/useStore.ts`: remove `vault: VaultEntry[]`, `addVaultEntry`, `removeVaultEntry`, `updateVaultEntry` from state and interface
5. In `src/components/Layout/AppLayout.tsx`: remove `vault` from `NAV_ITEMS`
6. In `App.tsx`: remove `case 'vault'` and the import

### Remove the User Profile
1. Delete `src/components/Profile/UserProfile.tsx`
2. In `src/store/useStore.ts`: remove `profile`, `updateProfile`
3. In `src/types/index.ts`: remove `UserProfile` interface
4. In `App.tsx` + `AppLayout.tsx`: remove references

### Remove Ticker completely
1. Delete `src/components/Ticker/NewsTicker.tsx`
2. In `App.tsx`: remove `{settings.tickerEnabled && <NewsTicker />}` and the ticker mode block
3. In `src/index.css`: remove all `.ticker-*` classes
4. In `src/types/index.ts`: remove ticker-related settings from `RSSSettings`, update `DEFAULT_SETTINGS`
5. In `SettingsPanel.tsx`: remove the Ticker tab

### Remove a settings tab
Just delete the JSX block inside `SettingsPanel.tsx` for that tab, and remove the tab from the `TABS` array. Nothing else breaks.

---

## 12. Common Patterns Used Throughout

### Reading from the store
```tsx
// Pick only what you need (prevents unnecessary re-renders)
const { items, settings, fetchAllFeeds } = useStore();

// NOT this (subscribes to ALL store changes):
const store = useStore();
```

### Conditional classes with clsx
```tsx
import clsx from 'clsx';

<div className={clsx(
  'base-classes',
  isActive && 'active-class',
  isDisabled && 'opacity-50 cursor-not-allowed',
  variant === 'ghost' ? 'border border-zinc-700' : 'bg-brand',
)} />
```

### Category-colored elements
```tsx
import { CATEGORY_CONFIGS } from '../../types';

const cfg = CATEGORY_CONFIGS[item.category];
// Use cfg.color for inline styles
// Use cfg.textClass, cfg.bgClass, cfg.borderClass for Tailwind classes
// Use cfg.shortName for badge text
// Use cfg.emoji for emoji display
```

### File download (export)
```tsx
import { downloadFile } from '../../services/exportService';

downloadFile(content, 'filename.opml', 'text/xml');
// Creates a blob URL, clicks a hidden <a> tag, removes it
```

### File upload (import)
```tsx
// Hidden input triggered by label click
<label className="...cursor-pointer">
  Import
  <input type="file" accept=".opml" className="hidden" onChange={handleImport} />
</label>

// Handler:
const handleImport = async (e) => {
  const content = await readFile(e.target.files[0]);
  // process...
  e.target.value = ''; // reset so same file can be re-imported
};
```

### Two-step delete confirmation (no modal needed)
```tsx
const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

// First click:
<button onClick={() => setConfirmDelete(entry.id)}>Delete</button>

// Confirmation appears inline:
{confirmDelete === entry.id && (
  <>
    <button onClick={() => { deleteItem(entry.id); setConfirmDelete(null); }}>Confirm</button>
    <button onClick={() => setConfirmDelete(null)}>Cancel</button>
  </>
)}
```

---

## 13. Known Limitations & Future Work

### Current limitations

| Issue | Where | Fix |
|-------|-------|-----|
| XML parsing is regex-based | `server/index.js` | Replace with `fast-xml-parser` (needs ESM import handling) |
| No real encryption for vault | `ApiVault.tsx` | Use Web Crypto API: `AES-GCM` with a master password |
| Items capped at 2000 | `useStore.ts` line ~140 | Add pagination or virtual scroll |
| No image extraction | `types/index.ts` | Parse `<enclosure>`, `<media:content>`, og:image from description |
| OPML parser uses regex | `exportService.ts` | Replace with proper DOMParser for edge cases |
| No feed grouping | `FeedManager` | Add `FeedGroup` type (already in original design spec) |
| framer-motion unused | `package.json` | Wire in page transitions and card animations |
| DOMPurify unused | `package.json` | Use to sanitize `item.content` when displaying HTML |
| Auto-refresh doesn't debounce | `App.tsx` | Multiple refreshes can stack up |

### Planned features (from original design)
- Feed health monitoring with status history
- Keyword boost (show matching items higher, not just filter)
- Article reading time estimate (word count / 200 wpm)
- Tag-based RSS export (custom feed per tag, like NewsBlur)
- Multi-device sync via RangerBlock P2P network
- AI daily briefing (summary of top stories across all feeds)

---

## 14. Environment

### Running locally
```bash
cd apps/rss-commander
npm install          # first time only
npm run dev          # starts both proxy (3001) and vite (5174)
```

### Ports
| Port | Process |
|------|---------|
| `5174` | Vite dev server (React app) |
| `3001` | Express proxy server (RSS fetching) |

**If port 5174 is taken**: Change in `vite.config.ts` → `server.port`
**If port 3001 is taken**: Change in `server/index.js` → `const PORT` AND `src/types/index.ts` → `DEFAULT_SETTINGS.proxyUrl`

### Build for production
```bash
npm run build        # TypeScript compile + Vite bundle → dist/
npm run preview      # Preview the production build locally
```
The proxy server (`server/index.js`) still needs to run separately in production. It's not bundled.

### Standalone ticker on M3 Pro
1. Run `npm run dev`
2. Open `http://localhost:5174` in a small browser window (e.g. 1440×50px)
3. Click **Ticker View** in the sidebar
4. The full UI collapses to just the scrolling ticker + logo
5. Pin the window to the top/bottom of the screen

---

## Quick Reference Card

```
WANT TO...                          FILE TO EDIT
─────────────────────────────────────────────────────────────
Change ticker speed defaults        src/types/index.ts → DEFAULT_SETTINGS.tickerSpeed
Add a new feed category             src/types/index.ts → RSSCategory + CATEGORY_CONFIGS
Add default feeds                   src/types/index.ts → DEFAULT_FEEDS array
Change the color scheme             src/index.css → :root variables
Add a setting                       src/types/index.ts + src/components/Settings/SettingsPanel.tsx
Add a nav item / new page           src/components/Layout/AppLayout.tsx (NAV_ITEMS)
Change proxy port                   server/index.js + src/types/index.ts DEFAULT_SETTINGS.proxyUrl
Fix a broken feed parser            server/index.js → parseRSSItems()
Add vault credential type           src/types/index.ts → VaultEntry.keyType union
Change fonts                        index.html (Google Fonts link) + tailwind.config.js + index.css
Add keyboard shortcuts              New: src/hooks/useKeyboard.ts
Add animations                      Use framer-motion (already installed)
Sanitize article HTML               Use DOMPurify (already installed)
Export a new format                 src/services/exportService.ts
Encrypt vault entries               src/services/vaultService.ts → add encrypt/decrypt with Web Crypto
```

---

*Document maintained alongside the codebase. Update this when you make architectural changes.*
*Built 2026-03-15 | RSS Commander v1.0.0 | RangerPlex ecosystem 🎖️*
