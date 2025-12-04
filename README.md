# Promisance Rogue

A roguelike reimagining of the classic Promisance turn-based strategy game. Build your empire, manage resources, cast spells, and conquer AI opponents across 10 rounds of strategic gameplay.

## Game Overview

Promisance Rogue puts you in command of a fledgling empire competing against 4 AI opponents. Each game consists of 10 rounds with 50 turns per round. Victory is achieved by having the highest networth at the end or by eliminating all opponents.

### Core Mechanics

- **Races**: Choose from 9 races (Human, Elf, Dwarf, Troll, Gnome, Gremlin, Orc, Drow, Goblin), each with unique bonuses
- **Eras**: Play in Past, Present, or Future - each era affects economy, production, and unit stats
- **Buildings**: Construct Markets, Barracks, Farms, Exchanges, and Wizard Towers
- **Military**: Command Infantry, Land, Air, Sea, and Wizard units
- **Magic**: Cast self-buffs and offensive spells using runes
- **Advisors**: Collect up to 3 advisors with powerful effects (Common to Legendary rarity)
- **Masteries**: Stack bonuses in Farming, Commerce, Exploration, Industry, or Mysticism

### Turn Actions

| Action | Turns | Effect |
|--------|-------|--------|
| Explore | 1 | Gain new land |
| Farm | 1 | Boost food production |
| Cash | 1 | Boost gold income |
| Meditate | 1 | Boost rune production |
| Industry | 1 | Produce troops |
| Build | 1 | Construct buildings |
| Attack | 2 | Combat enemy empire |
| Spell | 2 | Cast magic spells |

## Project Structure

```
promisance-rogue/
├── server/     # Cloudflare Workers API (Hono)
├── cli/        # Terminal UI client (Ink + React)
└── web/        # Web client (Vite + React + Tailwind)
```

## Tech Stack

- **Backend**: Cloudflare Workers, Hono, D1 (SQLite)
- **CLI Client**: Ink, React, TypeScript
- **Web Client**: Vite, React, Tailwind CSS, Zustand

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Wrangler CLI (for server development)

### Server Setup

```bash
cd server
npm install
npm run dev          # Start local dev server on localhost:8787
```

### CLI Setup

```bash
cd cli
npm install
npm run dev          # Start CLI with hot reload
```

### Web Setup

```bash
cd web
npm install
npm run dev          # Start Vite dev server
```

## Development Commands

### Server

```bash
npm run dev          # Start Wrangler dev server
npm run test         # Run Vitest tests
npm run typecheck    # TypeScript type checking
npm run deploy       # Deploy to Cloudflare Workers
```

### CLI

```bash
npm run dev          # Start with tsx watch
npm run build        # Compile TypeScript
npm run start        # Run compiled CLI
npm run typecheck    # TypeScript type checking
```

### Web

```bash
npm run dev          # Start Vite dev server
npm run build        # Build for production
npm run preview      # Preview production build
npm run typecheck    # TypeScript type checking
npm run lint         # Run ESLint
```

### Database

```bash
cd server
wrangler d1 execute promisance-rogue --local --command "SQL_HERE"
```

## Game Guide

For detailed game mechanics, strategies, and reference tables, see the [Game Guide](cli/docs/GAME_GUIDE.md).

## Architecture

The game uses a client-server architecture where all game state is managed server-side in Cloudflare D1.

### Server (`/server/src/`)

- `api/routes.ts` - REST endpoints and request handlers
- `db/operations.ts` - Database queries
- `game/` - Core game logic:
  - `run.ts` - Game lifecycle and phase transitions
  - `empire.ts` - Empire creation and networth calculation
  - `turns.ts` - Turn action processing
  - `combat.ts` - Attack resolution
  - `spells.ts` - Spell casting
  - `shop.ts` - Draft system and market
  - `bot/` - AI opponent system

### CLI (`/cli/src/`)

- `index.tsx` - App entry and routing
- `api/client.ts` - API client with TypeScript types
- `hooks/useGame.ts` - Game state management
- `screens/` - Main screen components
- `components/` - UI components

### Web (`/web/src/`)

- React SPA with Vite
- Zustand for state management
- Tailwind CSS for styling

## License

This project is not currently licensed for public use.
