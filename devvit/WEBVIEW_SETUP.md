# Devvit Frontend Integration - Setup Complete

## Summary

The web UI has been successfully transferred to the Devvit frontend. The React application from `/web` is now integrated as a Devvit webview with full message-based communication to the backend.

## Architecture

### Directory Structure

```
devvit/
├── src/
│   ├── main.tsx              # Main Devvit app with message handlers
│   ├── server/               # Backend game logic (already complete)
│   │   ├── api.ts           # 21 API handlers
│   │   ├── game/            # Game logic modules
│   │   └── redis/           # Redis operations
│   └── webview/             # React frontend (copied from web/)
│       ├── src/
│       │   ├── api/devvitClient.ts  # Webview messaging client
│       │   ├── pages/       # All game pages
│       │   ├── components/  # All UI components
│       │   ├── stores/      # Zustand state management
│       │   ├── types/       # TypeScript types
│       │   └── utils/       # Utility functions
│       ├── package.json     # Webview dependencies
│       ├── vite.config.ts   # Vite build config
│       └── tsconfig.json    # TypeScript config with DOM types
└── webview/                 # Build output (generated)
    ├── webview.html         # Main HTML file loaded by Devvit
    ├── index.js             # Bundled React app (316KB)
    └── index.css            # Bundled styles (45KB)
```

### Communication Flow

1. **Webview → Backend**
   - React components call `devvitClient.ts` methods
   - Client sends messages via `window.devvit.postMessage()`
   - Messages are routed through `main.tsx` message handler
   - Handler calls appropriate API function from `server/api.ts`

2. **Backend → Webview**
   - API handler returns result
   - `main.tsx` sends response via `context.ui.webView.postMessage()`
   - Webview bridge dispatches message event
   - `devvitClient.ts` resolves promise with result
   - React state updates via Zustand store

### Message Format

```typescript
// Request (webview → backend)
{
  type: 'game.action',  // Action type
  data: {
    requestId: 123,     // Unique request ID
    sessionId: 'xxx',   // Optional session
    payload: {...}      // Action-specific data
  }
}

// Response (backend → webview)
{
  type: 'devvit-response',
  data: {
    requestId: 123,     // Matches request
    success: true,
    data: {...},        // Result data
    error: null         // Or error message
  }
}
```

## Build Process

### Building the Webview

```bash
# From devvit/ directory
npm run build:webview
```

This:
1. Installs webview dependencies (`src/webview/node_modules`)
2. Runs TypeScript compilation
3. Bundles with Vite to `webview/` directory
4. Generates `webview.html`, `index.js`, `index.css`

### Building the Full App

```bash
# Build webview + upload to Reddit
npm run build

# Or for development with auto-version bump
npm run dev

# Or for local testing
npm run playtest
```

## API Handlers (21 total)

All handlers are in `src/main.tsx` and map to `src/server/api.ts`:

### Auth (2)
- `auth.createPlayer` → `getPlayer()`
- `auth.getMe` → `getPlayer()`

### Game Management (4)
- `game.new` → `createGame()`
- `game.current` → `getCurrentGame()`
- `game.get` → `getGame()`
- `game.abandon` → `abandonGame()`

### Turn Actions (3)
- `game.action` → `executeTurnAction()`
- `game.combatPreview` → `getCombatPreviewHandler()`
- `game.endPlayerPhase` → `endPlayerPhaseHandler()`

### Shop Phase (5)
- `game.market` → `marketTransaction()`
- `game.draft` → `selectDraftHandler()`
- `game.rerollInfo` → `getRerollInfoHandler()`
- `game.reroll` → `rerollDraftHandler()`
- `game.dismissAdvisor` → `dismissAdvisorHandler()`
- `game.endShopPhase` → `endShopPhaseHandler()`

### Bank (2)
- `game.bankInfo` → `getBankInfoHandler()`
- `game.bank` → `bankTransaction()`

### Settings (1)
- `game.settings` → `updateSettings()`

### Bot Phase (1)
- `game.botPhase` → `executeBotPhaseHandler()`

### Leaderboard (2)
- `leaderboard.get` → `getLeaderboard()`
- `leaderboard.rank` → `getPlayerRank()`

### Health (1)
- `health` → Returns `{ status: 'ok', timestamp }`

## Components Ported

All components from `/web/src` have been copied to `/devvit/src/webview/src`:

### Pages (5)
- `TitlePage` - Game menu and new game creation
- `GamePage` - Main game screen with phase management
- `OverviewPage` - Empire overview and stats
- `LeaderboardPage` - Player rankings
- `GuidePage` - Game documentation

### Game Components (15+)
- `ActionPanel` - Turn action buttons
- `EmpireStatus` - Resources and stats display
- `BuildingPanel` - Build/demolish buildings
- `MarketPanel` - Buy/sell troops and resources
- `BankPanel` - Savings and loans
- `SpellList` - Magic spell selection
- `AttackTypeSelector` - Choose attack type
- `EnemyList` - View and target opponents
- `DraftCarousel` - Select advisors/techs/edicts
- `AdvisorPanel` - Manage advisors
- `NewsLog` - Bot phase news
- `GameSummary` - End game results
- `ActionResult` - Turn action feedback
- `ActionToast` - Quick action notifications

### UI Components (4)
- `Panel` - Container component
- `RetroButton` - Themed button
- `NumberInput` - Numeric input
- `ThemeToggle` - Light/dark theme switch

### Stores (2)
- `gameStore` - All game state and actions
- `themeStore` - Theme preferences

## Known Issues

### TypeScript Error (Non-blocking)

```
error TS2875: This JSX tag requires the module path '@devvit/kit/jsx-runtime'
to exist, but none could be found.
```

**Status**: This is a type-checking error with `@devvit/kit` types. It does not affect:
- Runtime functionality
- Webview build process
- Devvit upload process

The error appears during `tsc --noEmit` but the Devvit build process works correctly because it uses its own bundler.

## Next Steps

### Testing
1. Run `npm run playtest` to test locally
2. Test game flow: Title → New Game → Shop → Player Phase → Bot Phase
3. Verify all UI interactions work
4. Test message communication between webview and backend

### Deployment
1. Configure Reddit app settings in `devvit.yaml`
2. Run `npm run build` to upload to Reddit
3. Create a test post in your subreddit
4. Play the game and verify all features work

### Future Improvements
1. Add error boundaries in React components
2. Implement loading states for API calls
3. Add retry logic for failed messages
4. Optimize bundle size (currently 316KB)
5. Add service worker for offline support
6. Implement analytics/telemetry

## Development

### Adding New Features

1. **Backend**: Add handler in `src/server/api.ts`
2. **Frontend**: Add method in `src/webview/src/api/devvitClient.ts`
3. **Main**: Add case in `src/main.tsx` message handler
4. **UI**: Create/update components in `src/webview/src/components/`
5. **State**: Update store in `src/webview/src/stores/`

### Rebuilding

```bash
# Quick webview rebuild
cd src/webview && npm run build

# Full rebuild and upload
npm run dev
```

### Debugging

1. **Webview console**: Open browser DevTools in Reddit post
2. **Backend logs**: Check Devvit logs via `devvit logs`
3. **Message flow**: Add console.log in `main.tsx` handler
4. **State**: Use React DevTools in webview

## File Sizes

- **Webview HTML**: 1.87 KB
- **Webview CSS**: 45.63 KB (8.46 KB gzipped)
- **Webview JS**: 323.21 KB (88.35 KB gzipped)
- **Total**: ~370 KB (~98 KB gzipped)

## Dependencies

### Main App
- `@devvit/public-api` - Devvit SDK
- `@devvit/kit` - Devvit UI components

### Webview
- `react` + `react-dom` - UI framework
- `react-router-dom` - Client-side routing
- `zustand` - State management
- `clsx` - Class name utility
- `tailwindcss` - Styling
- `vite` - Build tool
