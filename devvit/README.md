# Promisance Rogue - Devvit Native Port

Native Reddit Developer Platform (Devvit) implementation of Promisance Rogue.

## Architecture

This is a complete port of the game to run on Reddit's infrastructure:

- **Backend**: Devvit server runtime + Redis (replaces Cloudflare Workers + D1)
- **Frontend**: Devvit webview with React app (adapted from `/web`)
- **Game Logic**: TypeScript modules from `/server/src/game` (minimal changes)

## Structure

```
devvit/
├── src/
│   ├── main.tsx           # Devvit app entry point
│   ├── server/            # Backend logic
│   │   ├── game/          # Core game logic (from /server/src/game)
│   │   ├── redis/         # Redis operations (replaces D1)
│   │   └── api.ts         # Devvit API handlers
│   └── webview/           # React frontend (from /web/src)
│       ├── components/    # UI components
│       ├── screens/       # Screen views
│       └── index.tsx      # Webview entry
├── devvit.yaml            # Devvit configuration
└── package.json           # Dependencies
```

## Development

```bash
# Install Devvit CLI
npm install -g devvit

# Install dependencies
npm install

# Local development
devvit upload --bump-version

# Test in playground
devvit playtest <subreddit>
```

## Migration Status

- [ ] Project setup and configuration
- [ ] Redis data layer implementation
- [ ] Core game logic port
- [ ] React webview integration
- [ ] Devvit API handlers
- [ ] Authentication integration
- [ ] Leaderboard system
- [ ] Social features (posting, sharing)
- [ ] Testing and deployment

## Key Changes from Original

1. **Database**: Redis key-value store instead of SQLite/D1
2. **Auth**: Reddit user authentication (no custom auth)
3. **Frontend**: Bundled React app in Devvit webview
4. **Hosting**: Fully managed by Reddit platform
5. **Social**: Native Reddit integration for leaderboards and sharing

## Redis Data Model

```
game:{gameId}:state          → JSON: Complete GameRun state
game:{gameId}:empire         → JSON: Player empire
game:{gameId}:bots           → JSON: Array of bot empires
game:{gameId}:round          → Number: Current round
user:{userId}:games          → List: Active game IDs
user:{userId}:profile        → JSON: Player stats/preferences
leaderboard:daily:{date}     → SortedSet: Daily rankings by networth
leaderboard:alltime          → SortedSet: All-time high scores
```

## Documentation

- [Devvit Documentation](https://developers.reddit.com/docs)
- [Original Game Guide](../cli/docs/GAME_GUIDE.md)
- [Migration Plan](./MIGRATION.md)
