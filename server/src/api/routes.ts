import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env, Race, TurnActionRequest, ShopTransaction, BankTransaction, BotEmpire, SpyIntel } from '../types';
import { createGameRun, executeTurn, endPlayerPhase, selectDraft, endShopPhase, executeBotPhase, getGameSummary, isGameComplete } from '../game/run';
import { executeMarketTransaction } from '../game/shop';
import { getCombatPreview } from '../game/combat';
import { processBankTransaction, getBankInfo } from '../game/bank';
import * as db from '../db/operations';

// Custom context with auth
type Variables = {
  playerId: string | null;
};

// Bot summary with optional intel (only included if spied)
interface BotSummaryResponse {
  id: string;
  name: string;
  race: string;
  era: string;
  networth: number;
  land: number;
}

// Helper to map bot to limited summary (no troop/resource details)
function mapBotToSummary(bot: BotEmpire): BotSummaryResponse {
  return {
    id: bot.id,
    name: bot.personality.name,
    race: bot.race,
    era: bot.era,
    networth: bot.networth,
    land: bot.resources.land,
  };
}

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// CORS for frontend
app.use('*', cors({
  origin: '*', // Configure for production
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// Auth middleware
app.use('/api/*', async (c, next) => {
  const authHeader = c.req.header('Authorization');

  if (authHeader?.startsWith('Bearer ')) {
    const sessionId = authHeader.slice(7);
    const session = await db.getSession(c.env.DB, sessionId);

    if (session) {
      c.set('playerId', session.playerId);
    }
  }

  await next();
});

// Helper to require auth
function requireAuth(c: any): string | Response {
  const playerId = c.get('playerId');
  if (!playerId) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  return playerId;
}

// ============================================
// AUTH ENDPOINTS
// ============================================

// Create anonymous player
app.post('/api/auth/anonymous', async (c) => {
  const { displayName } = await c.req.json<{ displayName: string }>();

  if (!displayName || displayName.length < 1 || displayName.length > 32) {
    return c.json({ error: 'Invalid display name' }, 400);
  }

  const playerId = crypto.randomUUID();
  const sessionId = crypto.randomUUID();

  await db.createPlayer(c.env.DB, playerId, displayName);
  const session = await db.createSession(c.env.DB, sessionId, playerId);

  return c.json({
    playerId,
    sessionId,
    expiresAt: session.expiresAt,
  });
});

// Get current player
app.get('/api/auth/me', async (c) => {
  const playerId = requireAuth(c);
  if (typeof playerId !== 'string') return playerId;

  const player = await db.getPlayer(c.env.DB, playerId);
  if (!player) {
    return c.json({ error: 'Player not found' }, 404);
  }

  return c.json(player);
});

// ============================================
// GAME RUN ENDPOINTS
// ============================================

// Start new game
app.post('/api/game/new', async (c) => {
  const playerId = requireAuth(c);
  if (typeof playerId !== 'string') return playerId;

  const { empireName, race } = await c.req.json<{
    empireName: string;
    race: Race;
  }>();

  // Validate inputs
  if (!empireName || empireName.length < 1 || empireName.length > 32) {
    return c.json({ error: 'Invalid empire name' }, 400);
  }

  const validRaces: Race[] = ['human', 'elf', 'dwarf', 'troll', 'gnome', 'gremlin', 'orc', 'drow', 'goblin'];
  if (!validRaces.includes(race)) {
    return c.json({ error: 'Invalid race' }, 400);
  }

  // Check for existing active game
  const existingRun = await db.getActiveGameRun(c.env.DB, playerId);
  if (existingRun) {
    return c.json({
      error: 'Active game exists',
      gameId: existingRun.id,
    }, 409);
  }

  // Create new game
  const gameId = crypto.randomUUID();
  const run = createGameRun(gameId, playerId, empireName, race);

  await db.saveGameRun(c.env.DB, run);

  return c.json({
    gameId: run.id,
    summary: getGameSummary(run),
  });
});

// Get current game state
app.get('/api/game/current', async (c) => {
  const playerId = requireAuth(c);
  if (typeof playerId !== 'string') return playerId;

  const run = await db.getActiveGameRun(c.env.DB, playerId);

  if (!run) {
    return c.json({ hasActiveGame: false });
  }

  return c.json({
    hasActiveGame: true,
    game: {
      id: run.id,
      round: run.round,
      playerEmpire: run.playerEmpire,
      botEmpires: run.botEmpires.map(mapBotToSummary),
      intel: run.intel,
      marketPrices: run.marketPrices,
      shopStock: run.shopStock,
      draftOptions: run.draftOptions,
      playerDefeated: run.playerDefeated,
    },
  });
});

// Get specific game
app.get('/api/game/:id', async (c) => {
  const playerId = requireAuth(c);
  if (typeof playerId !== 'string') return playerId;

  const gameId = c.req.param('id');
  const run = await db.getGameRun(c.env.DB, gameId);

  if (!run) {
    return c.json({ error: 'Game not found' }, 404);
  }

  if (run.playerId !== playerId) {
    return c.json({ error: 'Unauthorized' }, 403);
  }

  return c.json({
    game: {
      id: run.id,
      round: run.round,
      playerEmpire: run.playerEmpire,
      botEmpires: run.botEmpires.map(mapBotToSummary),
      intel: run.intel,
      marketPrices: run.marketPrices,
      shopStock: run.shopStock,
      draftOptions: run.draftOptions,
      isComplete: isGameComplete(run),
      playerDefeated: run.playerDefeated,
    },
  });
});

// ============================================
// TURN ACTION ENDPOINTS
// ============================================

// Execute turn action
app.post('/api/game/:id/action', async (c) => {
  const playerId = requireAuth(c);
  if (typeof playerId !== 'string') return playerId;

  const gameId = c.req.param('id');
  const run = await db.getGameRun(c.env.DB, gameId);

  if (!run) {
    return c.json({ error: 'Game not found' }, 404);
  }

  if (run.playerId !== playerId) {
    return c.json({ error: 'Unauthorized' }, 403);
  }

  if (run.round.phase !== 'player') {
    return c.json({ error: 'Not in player phase' }, 400);
  }

  const request = await c.req.json<TurnActionRequest>();

  const result = executeTurn(run, request);

  if (result.success) {
    await db.saveGameRun(c.env.DB, run);
  }

  return c.json({
    result,
    summary: getGameSummary(run),
  });
});

// Get combat preview
app.get('/api/game/:id/combat-preview/:targetId', async (c) => {
  const playerId = requireAuth(c);
  if (typeof playerId !== 'string') return playerId;

  const gameId = c.req.param('id');
  const targetId = c.req.param('targetId');

  const run = await db.getGameRun(c.env.DB, gameId);

  if (!run || run.playerId !== playerId) {
    return c.json({ error: 'Game not found' }, 404);
  }

  const target = run.botEmpires.find((b) => b.id === targetId);
  if (!target) {
    return c.json({ error: 'Target not found' }, 404);
  }

  const preview = getCombatPreview(run.playerEmpire, target, run.round.turnsRemaining);

  return c.json(preview);
});

// End player phase
app.post('/api/game/:id/end-player-phase', async (c) => {
  const playerId = requireAuth(c);
  if (typeof playerId !== 'string') return playerId;

  const gameId = c.req.param('id');
  const run = await db.getGameRun(c.env.DB, gameId);

  if (!run || run.playerId !== playerId) {
    return c.json({ error: 'Game not found' }, 404);
  }

  if (run.round.phase !== 'player') {
    return c.json({ error: 'Not in player phase' }, 400);
  }

  endPlayerPhase(run);
  await db.saveGameRun(c.env.DB, run);

  return c.json({
    phase: run.round.phase,
    marketPrices: run.marketPrices,
    shopStock: run.shopStock,
    draftOptions: run.draftOptions,
  });
});

// ============================================
// MARKET ENDPOINT (available in player and shop phases)
// ============================================

// Market transaction - buy/sell troops and food (no turn cost)
app.post('/api/game/:id/market', async (c) => {
  const playerId = requireAuth(c);
  if (typeof playerId !== 'string') return playerId;

  const gameId = c.req.param('id');
  const run = await db.getGameRun(c.env.DB, gameId);

  if (!run || run.playerId !== playerId) {
    return c.json({ error: 'Game not found' }, 404);
  }

  // Allow market transactions during both player and shop phases
  if (run.round.phase !== 'player' && run.round.phase !== 'shop') {
    return c.json({ error: 'Market not available in this phase' }, 400);
  }

  const transaction = await c.req.json<ShopTransaction>();
  const isShopPhase = run.round.phase === 'shop';

  const result = executeMarketTransaction(
    run.playerEmpire,
    transaction,
    run.marketPrices,
    run.shopStock,
    isShopPhase
  );

  if (result.success) {
    await db.saveGameRun(c.env.DB, run);
  }

  return c.json({
    result,
    empire: run.playerEmpire,
    shopStock: run.shopStock,
  });
});

// ============================================
// BANK ENDPOINTS (available in player and shop phases)
// ============================================

// Get bank info
app.get('/api/game/:id/bank', async (c) => {
  const playerId = requireAuth(c);
  if (typeof playerId !== 'string') return playerId;

  const gameId = c.req.param('id');
  const run = await db.getGameRun(c.env.DB, gameId);

  if (!run || run.playerId !== playerId) {
    return c.json({ error: 'Game not found' }, 404);
  }

  const bankInfo = getBankInfo(run.playerEmpire);
  return c.json(bankInfo);
});

// Bank transaction - deposit, withdraw, take loan, pay loan (no turn cost)
app.post('/api/game/:id/bank', async (c) => {
  const playerId = requireAuth(c);
  if (typeof playerId !== 'string') return playerId;

  const gameId = c.req.param('id');
  const run = await db.getGameRun(c.env.DB, gameId);

  if (!run || run.playerId !== playerId) {
    return c.json({ error: 'Game not found' }, 404);
  }

  // Allow bank transactions during both player and shop phases
  if (run.round.phase !== 'player' && run.round.phase !== 'shop') {
    return c.json({ error: 'Bank not available in this phase' }, 400);
  }

  const transaction = await c.req.json<BankTransaction>();

  const result = processBankTransaction(run.playerEmpire, transaction);

  if (result.success) {
    await db.saveGameRun(c.env.DB, run);
  }

  return c.json({
    result,
    empire: run.playerEmpire,
    bankInfo: getBankInfo(run.playerEmpire),
  });
});

// ============================================
// SHOP PHASE ENDPOINTS
// ============================================

// Select draft option
app.post('/api/game/:id/draft', async (c) => {
  const playerId = requireAuth(c);
  if (typeof playerId !== 'string') return playerId;

  const gameId = c.req.param('id');
  const run = await db.getGameRun(c.env.DB, gameId);

  if (!run || run.playerId !== playerId) {
    return c.json({ error: 'Game not found' }, 404);
  }

  if (run.round.phase !== 'shop') {
    return c.json({ error: 'Not in shop phase' }, 400);
  }

  const { optionIndex } = await c.req.json<{ optionIndex: number }>();

  const success = selectDraft(run, optionIndex);

  if (success) {
    await db.saveGameRun(c.env.DB, run);
  }

  return c.json({
    success,
    empire: run.playerEmpire,
    draftOptions: run.draftOptions,
  });
});

// End shop phase
app.post('/api/game/:id/end-shop-phase', async (c) => {
  const playerId = requireAuth(c);
  if (typeof playerId !== 'string') return playerId;

  const gameId = c.req.param('id');
  const run = await db.getGameRun(c.env.DB, gameId);

  if (!run || run.playerId !== playerId) {
    return c.json({ error: 'Game not found' }, 404);
  }

  if (run.round.phase !== 'shop') {
    return c.json({ error: 'Not in shop phase' }, 400);
  }

  endShopPhase(run);
  await db.saveGameRun(c.env.DB, run);

  return c.json({ phase: run.round.phase });
});

// Execute bot phase
app.post('/api/game/:id/bot-phase', async (c) => {
  const playerId = requireAuth(c);
  if (typeof playerId !== 'string') return playerId;

  const gameId = c.req.param('id');
  const run = await db.getGameRun(c.env.DB, gameId);

  if (!run || run.playerId !== playerId) {
    return c.json({ error: 'Game not found' }, 404);
  }

  if (run.round.phase !== 'bot') {
    return c.json({ error: 'Not in bot phase' }, 400);
  }

  const result = executeBotPhase(run);
  await db.saveGameRun(c.env.DB, run);

  // If game is complete, record to leaderboard
  if (isGameComplete(run)) {
    await db.addLeaderboardEntry(c.env.DB, run);
    await db.updatePlayerStats(c.env.DB, playerId, run.playerEmpire.networth);
  }

  return c.json({
    news: result.news,
    standings: result.standings,
    round: run.round,
    playerEmpire: run.playerEmpire,
    botEmpires: run.botEmpires.map(mapBotToSummary),
    intel: run.intel,
    isComplete: isGameComplete(run),
    playerDefeated: run.playerDefeated,
  });
});

// ============================================
// LEADERBOARD ENDPOINTS
// ============================================

// Get leaderboard
app.get('/api/leaderboard', async (c) => {
  const timeframe = (c.req.query('timeframe') as 'all' | 'daily' | 'weekly') ?? 'all';
  const race = c.req.query('race');
  const limit = parseInt(c.req.query('limit') ?? '50');
  const offset = parseInt(c.req.query('offset') ?? '0');

  const entries = await db.getLeaderboard(c.env.DB, {
    timeframe,
    race,
    limit: Math.min(limit, 100),
    offset,
  });

  return c.json({ entries });
});

// Get player's rank
app.get('/api/leaderboard/rank', async (c) => {
  const playerId = requireAuth(c);
  if (typeof playerId !== 'string') return playerId;

  const rank = await db.getPlayerRank(c.env.DB, playerId);

  return c.json(rank ?? { rank: null, score: null });
});

// ============================================
// PLAYER HISTORY
// ============================================

// Get player's game history
app.get('/api/games/history', async (c) => {
  const playerId = requireAuth(c);
  if (typeof playerId !== 'string') return playerId;

  const limit = parseInt(c.req.query('limit') ?? '10');
  const runs = await db.getPlayerGameRuns(c.env.DB, playerId, Math.min(limit, 50));

  return c.json({
    games: runs.map((run) => ({
      id: run.id,
      round: run.round.number,
      phase: run.round.phase,
      networth: run.playerEmpire.networth,
      race: run.playerEmpire.race,
      createdAt: run.createdAt,
      updatedAt: run.updatedAt,
    })),
  });
});

// ============================================
// HEALTH CHECK
// ============================================

app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: Date.now() });
});

export default app;
