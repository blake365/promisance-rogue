# Migration Guide: Cloudflare Workers → Devvit

Step-by-step guide for porting Promisance Rogue to native Devvit.

## Phase 1: Project Setup ✅

- [x] Create folder structure
- [ ] Initialize npm project (`npm init`)
- [ ] Install Devvit CLI (`npm install -g devvit`)
- [ ] Configure `devvit.yaml`
- [ ] Set up TypeScript configuration

## Phase 2: Redis Data Layer

### 2.1 Design Schema
- [ ] Map SQLite tables to Redis keys
- [ ] Define key naming conventions
- [ ] Plan data serialization strategy
- [ ] Design index structures for queries

### 2.2 Implement Operations
- [ ] Complete `redis/operations.ts`
- [ ] Implement game state CRUD
- [ ] Implement user operations
- [ ] Implement leaderboard operations
- [ ] Add data migration utilities

### 2.3 Testing
- [ ] Write unit tests for Redis operations
- [ ] Test data serialization/deserialization
- [ ] Verify key expiration logic
- [ ] Benchmark performance

## Phase 3: Game Logic Port

### 3.1 Copy Core Files
- [ ] Copy `game/constants.ts`
- [ ] Copy `game/empire.ts`
- [ ] Copy `game/turns.ts`
- [ ] Copy `game/combat.ts`
- [ ] Copy `game/spells.ts`
- [ ] Copy `game/shop.ts`
- [ ] Copy `game/bank.ts`
- [ ] Copy `game/rng.ts`
- [ ] Copy `game/stats.ts`
- [ ] Copy `game/bonuses/` directory
- [ ] Copy `game/bot/` directory

### 3.2 Adapt Dependencies
- [ ] Update `run.ts` for Redis
- [ ] Remove D1-specific code
- [ ] Update imports/exports
- [ ] Ensure type compatibility

### 3.3 Testing
- [ ] Unit test each game module
- [ ] Integration test game flow
- [ ] Test bot AI behavior
- [ ] Verify RNG consistency

## Phase 4: API Layer

### 4.1 Implement Handlers
- [ ] Complete `server/api.ts`
- [ ] Map REST endpoints to RPC functions
- [ ] Implement authentication
- [ ] Add error handling

### 4.2 Core Endpoints
- [ ] `createGame` - Start new game
- [ ] `getGameState` - Load game
- [ ] `executeTurn` - Process turn action
- [ ] `shopPhase` - Draft and market
- [ ] `getLeaderboard` - Rankings

### 4.3 Testing
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
