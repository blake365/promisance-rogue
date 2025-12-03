# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Promisance Rogue is a roguelike version of the classic Promisance turn-based strategy game. It's a TypeScript monorepo with a Cloudflare Workers backend and an Ink-based CLI frontend.

**Architecture**: The CLI communicates with the server via REST API. Game state is managed server-side in Cloudflare D1 (SQLite).

## Commands

### Server (Cloudflare Workers + Hono)
```bash
cd server
npm install
npm run dev          # Start local Wrangler dev server (localhost:8787)
npm run test         # Run Vitest tests
npm run typecheck    # TypeScript type checking
npm run deploy       # Deploy to Cloudflare Workers
```

### CLI (Ink + React)
```bash
cd cli
npm install
npm run dev          # Start with tsx watch
npm run build        # Compile TypeScript
npm run start        # Run compiled CLI
npm run typecheck    # TypeScript type checking
```

### D1 Database
```bash
cd server
wrangler d1 execute promisance-rogue --local --command "SQL_HERE"
```

## Architecture

### Monorepo Structure
- `/server` - Cloudflare Workers API (Hono framework)
- `/cli` - Terminal UI client (Ink + React)

### Server (`/server/src/`)
- `api/routes.ts` - All REST endpoints, auth middleware, request handlers
- `db/operations.ts` - D1 database queries (players, sessions, game runs, leaderboard)
- `game/` - Core game logic:
  - `run.ts` - GameRun lifecycle: creation, turn execution, phase transitions
  - `empire.ts` - Empire creation, networth calculation, advisor effects
  - `turns.ts` - Turn action processing, economy calculations
  - `combat.ts` - Attack resolution, unit stats by era
  - `spells.ts` - Self and offensive spell casting
  - `shop.ts` - Draft system, market transactions, shop stock
  - `bank.ts` - Savings/loan operations
  - `bot/` - AI opponent system:
    - `generation.ts` - Bot personality and empire generation
    - `decisions.ts` - Bot turn action selection
    - `phase.ts` - Bot phase execution
    - `memory.ts` - Bot memory of player attacks
  - `bonuses/` - Advisors, techs, edicts, policies definitions
  - `constants.ts` - Game balance values (turn costs, era modifiers, etc.)

### CLI (`/cli/src/`)
- `index.tsx` - App entry, session persistence, screen routing
- `api/client.ts` - `PromisanceClient` class with typed API methods, also defines all shared types (Race, Era, Empire, etc.)
- `hooks/useGame.ts` - React hook managing game state and API calls
- `screens/` - TitleScreen, GameScreen top-level views
- `components/` - UI components (ActionMenu, EmpireStatus, MarketView, etc.)

### Game Flow
1. Game starts in `shop` phase (initial draft)
2. Player phase: execute turn actions (explore, farm, cash, industry, build, attack, spell)
3. Shop phase: market transactions + draft selection
4. Bot phase: AI opponents take turns, may attack player
5. Repeat rounds 1-10 or until player defeated

### Key Types
- `GameRun` - Complete game state including player/bot empires, round info, intel
- `Empire` - Full empire state (resources, buildings, troops, advisors, etc.)
- `BotEmpire` - Empire + personality + memory for AI opponents
- `TurnActionRequest/Result` - Turn action input/output
- `DraftOption` - Advisors/techs/edicts available in shop

## Development Notes

- Server uses Cloudflare D1 bindings accessed via `c.env.DB`
- CLI stores session in `~/.promisance-rogue.json`
- Types are duplicated in CLI's `api/client.ts` (no shared package)
- Wrangler config in `server/wrangler.toml` requires valid D1 database ID for deployment
- Game guide reference: `cli/docs/GAME_GUIDE.md`
