# API Handler Mapping: Cloudflare Workers → Devvit

This document maps the original REST API (Hono) to the new Devvit RPC handlers.

## Architecture Differences

### Original (Cloudflare Workers + Hono)
- REST API with HTTP routes
- D1 (SQLite) database
- Session-based authentication (Bearer tokens)
- CORS middleware for web clients
- Rate limiting by IP/player

### Target (Devvit)
- RPC-style handlers (`Devvit.addHandler()`)
- Redis for data storage
- Reddit user authentication (built-in)
- Webview messaging (no CORS needed)
- Devvit's built-in rate limiting

## Handler Mapping

### 🔐 Authentication (2 endpoints → 1 handler)

| Original REST | Devvit RPC | Notes |
|--------------|------------|-------|
| `POST /api/auth/anonymous` | Not needed | Use Reddit auth instead |
| `GET /api/auth/me` | `getPlayer()` | Get Reddit user profile |

**Implementation:**
```typescript
Devvit.addHandler('game.getPlayer', async (context) => {
  const userId = context.userId; // Built-in Reddit ID
  const username = context.username; // Built-in Reddit username

  // Load or create player profile in Redis
  const player = await UserOperations.getOrCreate(context.redis, userId, username);
  return player;
});
```

---

### 🎮 Game Management (4 endpoints → 4 handlers)

| Original REST | Devvit RPC | Description |
|--------------|------------|-------------|
| `POST /api/game/new` | `game.create` | Start new game |
| `POST /api/game/abandon` | `game.abandon` | Abandon current game |
| `GET /api/game/current` | `game.getCurrent` | Get active game state |
| `GET /api/game/:id` | `game.get` | Get specific game by ID |

**Key Changes:**
- Replace session auth with `context.userId`
- Replace `db.getGameRun(c.env.DB)` with `GameOperations.get(context.redis)`
- Replace `db.saveGameRun(c.env.DB)` with `GameOperations.save(context.redis)`
- Handle corrupted game data gracefully (same error recovery pattern)

---

### ⚔️ Turn Actions (4 endpoints → 4 handlers)

| Original REST | Devvit RPC | Description |
|--------------|------------|-------------|
| `POST /api/game/:id/action` | `game.executeTurn` | Execute turn action |
| `POST /api/game/:id/settings` | `game.updateSettings` | Update tax/industry |
| `GET /api/game/:id/combat-preview/:targetId` | `game.getCombatPreview` | Preview attack |
| `POST /api/game/:id/end-player-phase` | `game.endPlayerPhase` | End player phase |

**Core Logic (unchanged):**
```typescript
// Same game logic calls in all versions:
const result = executeTurn(run, request);
const preview = getCombatPreview(empire, target, turnsRemaining);
endPlayerPhase(run);
```

---

### 🛒 Market & Bank (3 endpoints → 3 handlers)

| Original REST | Devvit RPC | Description |
|--------------|------------|-------------|
| `POST /api/game/:id/market` | `game.marketTransaction` | Buy/sell resources |
| `GET /api/game/:id/bank` | `game.getBankInfo` | Get bank status |
| `POST /api/game/:id/bank` | `game.bankTransaction` | Deposit/withdraw/loan |

**Core Logic (unchanged):**
```typescript
// Same functions work in both:
const result = executeMarketTransaction(empire, transaction, prices, stock, isShopPhase);
const info = getBankInfo(empire);
const result = processBankTransaction(empire, transaction);
```

---

### 🏪 Shop Phase (5 endpoints → 5 handlers)

| Original REST | Devvit RPC | Description |
|--------------|------------|-------------|
| `POST /api/game/:id/draft` | `game.selectDraft` | Pick draft option |
| `GET /api/game/:id/reroll` | `game.getRerollInfo` | Get reroll status |
| `POST /api/game/:id/reroll` | `game.rerollDraft` | Reroll draft |
| `POST /api/game/:id/dismiss-advisor` | `game.dismissAdvisor` | Dismiss advisor |
| `POST /api/game/:id/end-shop-phase` | `game.endShopPhase` | End shop phase |

**Core Logic (unchanged):**
```typescript
// All shop logic stays the same:
const result = selectDraft(run, optionIndex);
const rerollResult = rerollDraft(run);
const dismissResult = dismissAdvisor(empire, advisorId);
endShopPhase(run);
```

---

### 🤖 Bot Phase (1 endpoint → 1 handler)

| Original REST | Devvit RPC | Description |
|--------------|------------|-------------|
| `POST /api/game/:id/bot-phase` | `game.executeBotPhase` | Process all bot turns |

**Core Logic (unchanged):**
```typescript
const result = executeBotPhase(run);
// Error recovery logic also stays the same
```

---

### 🏆 Leaderboard (3 endpoints → 3 handlers)

| Original REST | Devvit RPC | Description |
|--------------|------------|-------------|
| `GET /api/leaderboard` | `game.getLeaderboard` | Get leaderboard entries |
| `GET /api/leaderboard/rank` | `game.getPlayerRank` | Get player's rank |
| `GET /api/games/history` | `game.getHistory` | Get player's games |

**Implementation:**
```typescript
Devvit.addHandler('game.getLeaderboard', async (context, options) => {
  const entries = await LeaderboardOperations.get(
    context.redis,
    options.timeframe,
    options.limit
  );
  return entries;
});
```

---

## Complete Handler List (21 total)

### Must Implement (21 handlers):

1. ✅ `game.getPlayer` - Get/create player profile
2. ✅ `game.create` - Start new game
3. ✅ `game.abandon` - Abandon game
4. ✅ `game.getCurrent` - Get active game
5. ✅ `game.get` - Get game by ID
6. ✅ `game.executeTurn` - Execute turn action
7. ✅ `game.updateSettings` - Update empire settings
8. ✅ `game.getCombatPreview` - Preview attack
9. ✅ `game.endPlayerPhase` - End player phase
10. ✅ `game.marketTransaction` - Market buy/sell
11. ✅ `game.getBankInfo` - Get bank status
12. ✅ `game.bankTransaction` - Bank operations
13. ✅ `game.selectDraft` - Pick draft option
14. ✅ `game.getRerollInfo` - Get reroll status
15. ✅ `game.rerollDraft` - Reroll draft
16. ✅ `game.dismissAdvisor` - Dismiss advisor
17. ✅ `game.endShopPhase` - End shop phase
18. ✅ `game.executeBotPhase` - Process bot turns
19. ✅ `game.getLeaderboard` - Get leaderboard
20. ✅ `game.getPlayerRank` - Get player rank
21. ✅ `game.getHistory` - Get game history

---

## Implementation Pattern

Each handler follows this pattern:

```typescript
import { Devvit } from '@devvit/public-api';
import * as GameOps from './redis/operations';
import * as game from './game';

Devvit.addHandler('game.handlerName', async (context, request) => {
  // 1. Get Reddit user (built-in auth)
  const userId = context.userId;
  if (!userId) {
    throw new Error('Unauthorized');
  }

  // 2. Load game state from Redis
  const run = await GameOps.getGameRun(context.redis, request.gameId);
  if (!run || run.playerId !== userId) {
    throw new Error('Game not found');
  }

  // 3. Execute game logic (same as original!)
  const result = game.executeTurn(run, request);

  // 4. Save to Redis (with optimistic locking)
  const saved = await GameOps.saveGameRun(context.redis, run);
  if (!saved) {
    throw new Error('Conflict: game state changed');
  }

  // 5. Return result
  return result;
});
```

---

## Key Differences from Original

### What Changes:
- ❌ No CORS middleware (webview is same-origin)
- ❌ No session management (Reddit auth built-in)
- ❌ No rate limiting middleware (Devvit handles this)
- ❌ No static asset serving (webview handles this)
- ✅ Replace `c.env.DB` with `context.redis`
- ✅ Replace `c.get('playerId')` with `context.userId`
- ✅ Replace `c.json()` with `return`

### What Stays the Same:
- ✅ All game logic functions (no changes!)
- ✅ Optimistic locking pattern
- ✅ Error recovery for bot phase
- ✅ Corrupted game handling
- ✅ Validation logic
- ✅ Helper functions (withSpellCosts, mapBotToSummary, etc.)

---

## Optimistic Locking

Both versions use the same pattern:

```typescript
// Load with version
const run = await GameOps.getGameRun(redis, gameId);
const currentVersion = run.version;

// Modify game state
executeTurn(run, request);
run.version = currentVersion + 1;

// Save with version check
const saved = await GameOps.saveGameRun(redis, run);
if (!saved) {
  throw new Error('Conflict'); // Another request modified the game
}
```

Redis implementation uses WATCH/MULTI/EXEC for atomic updates.

---

## Next Steps

1. ✅ Copy helper functions to `devvit/src/server/api.ts`
2. ✅ Implement all 21 handlers using the pattern above
3. ✅ Register handlers in `main.tsx`
4. ✅ Test each handler with mock data
5. ✅ Wire up webview messaging

**Estimated effort:** 4-6 hours (most handlers are 10-20 lines each, logic already exists)
