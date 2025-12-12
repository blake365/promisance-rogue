# Migration Guide: Cloudflare Workers → Devvit

Step-by-step guide for porting Promisance Rogue to native Devvit.

## 🎯 Current Status

**Last Updated:** 2025-12-12

**Completed Phases:** 1, 2, 3 (Game Logic), 4 (API Layer)
**Next Up:** Phase 5 (Frontend Integration)

### Recent Progress
- ✅ All game logic files copied (11 core files + bonuses + bot AI)
- ✅ Redis operations layer fully implemented
- ✅ No modifications needed to game logic (clean separation of concerns)
- ✅ **API handlers implemented** (21 handlers in `server/api.ts`)
- ✅ **Types copied** (`server/types.ts`)
- ✅ **Handlers registered** in `main.tsx` (all 21 wired up)
- 🎯 **Next:** Copy React frontend components and implement webview messaging

## Phase 1: Project Setup ✅

- [x] Create folder structure
- [x] Initialize npm project (`npm init`)
- [x] Install Devvit CLI (`npm install -g devvit`)
- [x] Configure `devvit.yaml`
- [x] Set up TypeScript configuration

## Phase 2: Redis Data Layer ✅

### 2.1 Design Schema ✅
- [x] Map SQLite tables to Redis keys
- [x] Define key naming conventions
- [x] Plan data serialization strategy
- [x] Design index structures for queries

### 2.2 Implement Operations ✅
- [x] Complete `redis/operations.ts`
- [x] Implement game state CRUD
- [x] Implement user operations
- [x] Implement leaderboard operations
- [x] Add data migration utilities

### 2.3 Testing
- [ ] Write unit tests for Redis operations
- [ ] Test data serialization/deserialization
- [ ] Verify key expiration logic
- [ ] Benchmark performance

## Phase 3: Game Logic Port ✅

### 3.1 Copy Core Files ✅
- [x] Copy `game/constants.ts`
- [x] Copy `game/empire.ts`
- [x] Copy `game/turns.ts`
- [x] Copy `game/combat.ts`
- [x] Copy `game/spells.ts`
- [x] Copy `game/shop.ts`
- [x] Copy `game/bank.ts`
- [x] Copy `game/rng.ts`
- [x] Copy `game/stats.ts`
- [x] Copy `game/bonuses/` directory
- [x] Copy `game/bot/` directory

### 3.2 Adapt Dependencies ✅
- [x] Copy `run.ts` (no changes needed - pure game logic)
- [x] Remove D1-specific code (none found - DB handled in API layer)
- [x] Update imports/exports
- [x] Ensure type compatibility

### 3.3 Testing
- [ ] Unit test each game module
- [ ] Integration test game flow
- [ ] Test bot AI behavior
- [ ] Verify RNG consistency

## Phase 4: API Layer ✅

### 4.1 Implement Handlers ✅
- [x] Complete `server/api.ts` (771 lines, 21 handlers)
- [x] Map REST endpoints to RPC functions
- [x] Implement authentication (Reddit user ID)
- [x] Add error handling (optimistic locking, corruption recovery)

### 4.2 Core Endpoints ✅
- [x] `createGame` - Start new game
- [x] `getGameState` - Load game
- [x] `executeTurn` - Process turn action
- [x] `shopPhase` - Draft and market
- [x] `getLeaderboard` - Rankings
- [x] All 16 other handlers (see API_MAPPING.md)

### 4.3 Handler Registration ✅
- [x] Import all handlers in main.tsx
- [x] Register all 21 handlers with Devvit.addHandler()
- [x] Copy types.ts to devvit/src/server/

### 4.4 Testing
- [ ] Test each endpoint independently
- [ ] Integration test full game flow
- [ ] Load testing with concurrent users
- [ ] Error scenario testing

## Phase 5: Frontend Integration

### 5.1 Copy React App
- [ ] Copy components from `/web/src/components/`
- [ ] Copy screens from `/web/src/screens/`
- [ ] Copy styles and assets
- [ ] Set up build configuration

### 5.2 Adapt for Devvit
- [ ] Replace API calls with webview messaging
- [ ] Remove authentication UI
- [ ] Update routing if needed
- [ ] Bundle for webview

### 5.3 Communication Layer
- [ ] Implement webview message handlers
- [ ] Set up bidirectional messaging
- [ ] Handle async operations
- [ ] Add loading states

### 5.4 Testing
- [ ] Test in Devvit webview
- [ ] Verify all user flows
- [ ] Test on mobile and desktop
- [ ] Performance testing

## Phase 6: Devvit Features

### 6.1 Reddit Integration
- [ ] User authentication via Reddit
- [ ] Profile creation/loading
- [ ] Username display

### 6.2 Social Features
- [ ] Post game results to subreddit
- [ ] Share empire builds
- [ ] Victory posts with stats

### 6.3 Leaderboards
- [ ] Daily challenge system
- [ ] All-time high scores
- [ ] Subreddit rankings
- [ ] Leaderboard posts

### 6.4 Scheduling
- [ ] Daily challenge posts (automated)
- [ ] Weekly tournament setup
- [ ] Leaderboard updates

## Phase 7: Polish & Deployment

### 7.1 Testing
- [ ] End-to-end testing
- [ ] Reddit community alpha test
- [ ] Bug fixes and iteration
- [ ] Performance optimization

### 7.2 Documentation
- [ ] User guide for Reddit
- [ ] Moderator setup instructions
- [ ] Developer documentation
- [ ] Update README

### 7.3 Deployment
- [ ] Deploy to test subreddit
- [ ] Monitor logs and errors
- [ ] Gather feedback
- [ ] Deploy to production
- [ ] Submit to Reddit App Directory

## Technical Debt & Nice-to-Haves

- [ ] Rate limiting per user
- [ ] Game replay/history viewer
- [ ] Achievement system
- [ ] Custom game modes
- [ ] Multiplayer support (future)
- [ ] Mobile app integration

## Estimated Timeline

- Phase 1: 1 day
- Phase 2: 3-4 days
- Phase 3: 2-3 days
- Phase 4: 3-4 days
- Phase 5: 4-5 days
- Phase 6: 3-4 days
- Phase 7: 3-5 days

**Total: 2-4 weeks** (depending on complexity and testing)

## Resources

- [Devvit Documentation](https://developers.reddit.com/docs)
- [Redis Commands](https://redis.io/commands)
- [Original Codebase](../)
- [Game Guide](../cli/docs/GAME_GUIDE.md)

---

## 📦 Migration File Summary

### Game Logic (`src/server/game/`) - ✅ COMPLETE

**Core Files (11):**
- ✅ `constants.ts` - Game configuration and balance values
- ✅ `empire.ts` - Empire creation and networth calculation
- ✅ `turns.ts` - Turn action processing and economy
- ✅ `combat.ts` - Attack resolution and combat mechanics
- ✅ `spells.ts` - All spell casting logic
- ✅ `shop.ts` - Draft system and market transactions
- ✅ `bank.ts` - Savings/loan operations
- ✅ `rng.ts` - Seeded random number generator
- ✅ `stats.ts` - Statistics tracking
- ✅ `run.ts` - GameRun lifecycle and phase management
- ✅ `index.ts` - Module exports

**Bonuses (`game/bonuses/`) - ✅ COMPLETE (5 files):**
- ✅ `advisors.ts` - All 30+ advisor definitions
- ✅ `techs.ts` - Mastery system
- ✅ `edicts.ts` - Edict definitions
- ✅ `policies.ts` - Policy system
- ✅ `index.ts` - Exports

**Bot AI (`game/bot/`) - ✅ COMPLETE (10+ files):**
- ✅ `definitions.ts` - Bot personality definitions
- ✅ `generation.ts` - Bot empire creation
- ✅ `decisions.ts` - Turn action decision making
- ✅ `strategies.ts` - Strategic planning
- ✅ `targeting.ts` - Attack target selection
- ✅ `phase.ts` - Bot phase execution
- ✅ `memory.ts` - Attack memory system
- ✅ `state.ts` - Bot state management
- ✅ `types.ts` - Bot type definitions
- ✅ `index.ts` - Exports

### Redis Layer (`src/server/redis/`) - ✅ COMPLETE

- ✅ `operations.ts` - Complete implementation with GameOperations, UserOperations, LeaderboardOperations

### API Layer (`src/server/`) - ⏳ IN PROGRESS

- ⏳ `api.ts` - Stub functions exist, need implementation

### Frontend (`src/webview/`) - ⏸️ PENDING

- ⏸️ React components need to be copied from `/web/src/` or `/cli/src/`
- ⏸️ Webview communication layer needs implementation

### Main Entry (`src/`) - ⏸️ PENDING

- ⏸️ `main.tsx` - Has skeleton, needs full implementation
