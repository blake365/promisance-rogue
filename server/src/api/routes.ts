import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env, Race, TurnActionRequest, ShopTransaction, BankTransaction, BotEmpire, SpyIntel } from '../types';
import { createGameRun, executeTurn, endPlayerPhase, selectDraft, rerollDraft, getRerollInfo, endShopPhase, executeBotPhase, getGameSummary, isGameComplete } from '../game/run';
import { executeMarketTransaction, dismissAdvisor, getAdvisorCapacity, getEffectiveTroopPrices } from '../game/shop';
import { calculateNetworth } from '../game/empire';
import { calculateAllSpellCosts } from '../game/spells';
import { getCombatPreview } from '../game/combat';
import { processBankTransaction, getBankInfo } from '../game/bank';
import { rateLimit, getClientIP, getPlayerId } from '../middleware/rateLimit';
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

// Helper to add spell costs to empire for accurate client display
function withSpellCosts<T extends { playerEmpire: import('../types').Empire }>(data: T): T {
  return {
    ...data,
    playerEmpire: {
      ...data.playerEmpire,
      spellCosts: calculateAllSpellCosts(data.playerEmpire),
    },
  };
}

// Generate intel for a bot (used for full_intel policy)
function generateBotIntel(bot: BotEmpire, round: number): SpyIntel {
  return {
    targetId: bot.id,
    targetName: bot.personality.name,
    round,
    era: bot.era,
    race: bot.race,
    land: bot.resources.land,
    networth: bot.networth,
    peasants: bot.peasants,
    health: bot.health,
    taxRate: bot.taxRate,
    gold: bot.resources.gold,
    food: bot.resources.food,
    runes: bot.resources.runes,
    troops: { ...bot.troops },
  };
}

// Get intel with full_intel policy check
function getIntelWithPolicy(
  existingIntel: Record<string, SpyIntel>,
  bots: BotEmpire[],
  hasFullIntel: boolean,
  currentRound: number
): Record<string, SpyIntel> {
  if (!hasFullIntel) {
    return existingIntel;
  }

  // Generate fresh intel for all living bots
  const fullIntel: Record<string, SpyIntel> = {};
  for (const bot of bots) {
    if (bot.health > 0) {
      fullIntel[bot.id] = generateBotIntel(bot, currentRound);
    }
  }
  return fullIntel;
}

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// CORS for frontend - uses CORS_ORIGIN env var in production
// Set CORS_ORIGIN to comma-separated list of allowed origins (e.g., "https://example.com,https://app.example.com")
app.use('*', async (c, next) => {
  const allowedOrigins = c.env.CORS_ORIGIN?.split(',').map((o: string) => o.trim()) || ['*'];
  const origin = c.req.header('Origin') || '';

  // Check if origin is allowed (or if wildcard is set)
  const isAllowed = allowedOrigins.includes('*') || allowedOrigins.includes(origin);

  return cors({
    origin: isAllowed ? origin || '*' : allowedOrigins[0],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  })(c, next);
});

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

// Rate limiting for auth endpoints (5 requests per minute by IP)
app.use('/api/auth/*', rateLimit({
  maxRequests: 5,
  windowMs: 60 * 1000,
  keyGenerator: (c) => `auth:${getClientIP(c)}`,
  message: 'Too many auth requests. Please try again later.',
}));

// Rate limiting for game actions (60 requests per minute by player)
app.use('/api/game/:id/action', rateLimit({
  maxRequests: 60,
  windowMs: 60 * 1000,
  keyGenerator: (c) => `action:${getPlayerId(c)}`,
  message: 'Too many actions. Please slow down.',
}));

// Rate limiting for market transactions (30 requests per minute by player)
app.use('/api/game/:id/market', rateLimit({
  maxRequests: 30,
  windowMs: 60 * 1000,
  keyGenerator: (c) => `market:${getPlayerId(c)}`,
  message: 'Too many market requests. Please slow down.',
}));

// Helper to require auth
function requireAuth(c: any): string | Response {
  const playerId = c.get('playerId');
  if (!playerId) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  return playerId;
}

// Helper to handle optimistic locking conflicts
function conflictResponse(c: any): Response {
  return c.json(
    { error: 'Conflict: game state was modified. Please refresh and try again.' },
    409
  );
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

  const { empireName, race, seed } = await c.req.json<{
    empireName: string;
    race: Race;
    seed?: number;
  }>();

  // Validate inputs
  if (!empireName || empireName.length < 1 || empireName.length > 32) {
    return c.json({ error: 'Invalid empire name' }, 400);
  }

  const validRaces: Race[] = ['human', 'elf', 'dwarf', 'troll', 'gnome', 'gremlin', 'orc', 'drow', 'goblin'];
  if (!validRaces.includes(race)) {
    return c.json({ error: 'Invalid race' }, 400);
  }

  // Validate seed if provided (must be a positive integer)
  let validatedSeed: number | undefined;
  if (seed !== undefined) {
    validatedSeed = Math.floor(Math.abs(seed)) % 2147483647;
    if (validatedSeed === 0) validatedSeed = 1; // Avoid seed of 0
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
  const run = createGameRun(gameId, playerId, empireName, race, validatedSeed);

  await db.saveGameRun(c.env.DB, run);

  return c.json({
    gameId: run.id,
    seed: run.seed,
    summary: getGameSummary(run),
  });
});

// Abandon current game
app.post('/api/game/abandon', async (c) => {
  const playerId = requireAuth(c);
  if (typeof playerId !== 'string') return playerId;

  const run = await db.getActiveGameRun(c.env.DB, playerId);

  if (!run) {
    return c.json({ error: 'No active game to abandon' }, 404);
  }

  // Mark the game as complete (abandoned)
  run.round.phase = 'complete';
  run.playerDefeated = 'abandoned';
  await db.saveGameRun(c.env.DB, run);

  return c.json({ success: true, gameId: run.id });
});

// Get current game state
app.get('/api/game/current', async (c) => {
  const playerId = requireAuth(c);
  if (typeof playerId !== 'string') return playerId;

  const run = await db.getActiveGameRun(c.env.DB, playerId);

  if (!run) {
    return c.json({ hasActiveGame: false });
  }

  const hasFullIntel = run.playerEmpire.policies.includes('full_intel');
  return c.json({
    hasActiveGame: true,
    game: {
      id: run.id,
      seed: run.seed,
      round: run.round,
      playerEmpire: {
        ...run.playerEmpire,
        spellCosts: calculateAllSpellCosts(run.playerEmpire),
      },
      botEmpires: run.botEmpires.map(mapBotToSummary),
      intel: getIntelWithPolicy(run.intel, run.botEmpires, hasFullIntel, run.round.number),
      marketPrices: run.marketPrices,
      effectivePrices: getEffectiveTroopPrices(run.playerEmpire, run.marketPrices),
      shopStock: run.shopStock,
      draftOptions: run.draftOptions,
      playerDefeated: run.playerDefeated,
      stats: run.stats,
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

  const hasFullIntel = run.playerEmpire.policies.includes('full_intel');
  return c.json({
    game: {
      id: run.id,
      seed: run.seed,
      round: run.round,
      playerEmpire: {
        ...run.playerEmpire,
        spellCosts: calculateAllSpellCosts(run.playerEmpire),
      },
      botEmpires: run.botEmpires.map(mapBotToSummary),
      intel: getIntelWithPolicy(run.intel, run.botEmpires, hasFullIntel, run.round.number),
      marketPrices: run.marketPrices,
      effectivePrices: getEffectiveTroopPrices(run.playerEmpire, run.marketPrices),
      shopStock: run.shopStock,
      draftOptions: run.draftOptions,
      isComplete: isGameComplete(run),
      playerDefeated: run.playerDefeated,
      stats: run.stats,
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
    const saved = await db.saveGameRun(c.env.DB, run);
    if (!saved) {
      return conflictResponse(c);
    }
  }

  return c.json({
    result,
    summary: getGameSummary(run),
    // Include updated bot data after attacks so client can reflect land changes
    botEmpires: run.botEmpires.map(mapBotToSummary),
  });
});

// Update empire settings (industry allocation, tax rate)
app.post('/api/game/:id/settings', async (c) => {
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

  const { industryAllocation, taxRate } = await c.req.json<{
    industryAllocation?: { trparm: number; trplnd: number; trpfly: number; trpsea: number };
    taxRate?: number;
  }>();

  // Validate and apply industry allocation
  if (industryAllocation) {
    const total = industryAllocation.trparm + industryAllocation.trplnd +
                  industryAllocation.trpfly + industryAllocation.trpsea;
    if (total !== 100) {
      return c.json({ error: 'Industry allocation must sum to 100%' }, 400);
    }
    if (Object.values(industryAllocation).some(v => v < 0 || v > 100)) {
      return c.json({ error: 'Allocation values must be between 0 and 100' }, 400);
    }
    run.playerEmpire.industryAllocation = industryAllocation;
  }

  // Validate and apply tax rate
  if (taxRate !== undefined) {
    if (taxRate < 0 || taxRate > 100) {
      return c.json({ error: 'Tax rate must be between 0 and 100' }, 400);
    }
    run.playerEmpire.taxRate = taxRate;
  }

  const saved = await db.saveGameRun(c.env.DB, run);
  if (!saved) {
    return conflictResponse(c);
  }

  return c.json({
    success: true,
    empire: run.playerEmpire,
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

  // If game is complete (final round), record to leaderboard
  if (isGameComplete(run)) {
    await db.addLeaderboardEntry(c.env.DB, run);
    await db.updatePlayerStats(c.env.DB, playerId, run.playerEmpire.networth);
  }

  await db.saveGameRun(c.env.DB, run);

  return c.json({
    phase: run.round.phase,
    marketPrices: run.marketPrices,
    shopStock: run.shopStock,
    draftOptions: run.draftOptions,
    isComplete: isGameComplete(run),
    stats: run.stats,
    playerDefeated: run.playerDefeated,
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
    // Update networth after market transaction
    run.playerEmpire.networth = calculateNetworth(run.playerEmpire);
    const saved = await db.saveGameRun(c.env.DB, run);
    if (!saved) {
      return conflictResponse(c);
    }
  }

  return c.json({
    result,
    empire: run.playerEmpire,
    shopStock: run.shopStock,
    effectivePrices: getEffectiveTroopPrices(run.playerEmpire, run.marketPrices),
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
    const saved = await db.saveGameRun(c.env.DB, run);
    if (!saved) {
      return conflictResponse(c);
    }
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

  const result = selectDraft(run, optionIndex);

  if (result.success) {
    const saved = await db.saveGameRun(c.env.DB, run);
    if (!saved) {
      return conflictResponse(c);
    }
  }

  return c.json({
    success: result.success,
    error: result.error,
    empire: run.playerEmpire,
    draftOptions: run.draftOptions,
    edictResult: result.edictResult,
  });
});

// Get reroll info
app.get('/api/game/:id/reroll', async (c) => {
  const playerId = requireAuth(c);
  if (typeof playerId !== 'string') return playerId;

  const gameId = c.req.param('id');
  const run = await db.getGameRun(c.env.DB, gameId);

  if (!run || run.playerId !== playerId) {
    return c.json({ error: 'Game not found' }, 404);
  }

  const rerollInfo = getRerollInfo(run);
  const advisorCapacity = getAdvisorCapacity(run.playerEmpire);

  return c.json({
    ...rerollInfo,
    advisorCapacity,
  });
});

// Reroll draft options
app.post('/api/game/:id/reroll', async (c) => {
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

  const result = rerollDraft(run);

  if (result.success) {
    const saved = await db.saveGameRun(c.env.DB, run);
    if (!saved) {
      return conflictResponse(c);
    }
  }

  return c.json({
    ...result,
    empire: run.playerEmpire,
    draftOptions: run.draftOptions,
    rerollInfo: getRerollInfo(run),
  });
});

// Dismiss advisor
app.post('/api/game/:id/dismiss-advisor', async (c) => {
  const playerId = requireAuth(c);
  if (typeof playerId !== 'string') return playerId;

  const gameId = c.req.param('id');
  const run = await db.getGameRun(c.env.DB, gameId);

  if (!run || run.playerId !== playerId) {
    return c.json({ error: 'Game not found' }, 404);
  }

  const { advisorId } = await c.req.json<{ advisorId: string }>();

  const result = dismissAdvisor(run.playerEmpire, advisorId);

  if (result.success) {
    await db.saveGameRun(c.env.DB, run);
  }

  return c.json({
    ...result,
    empire: run.playerEmpire,
    advisorCapacity: getAdvisorCapacity(run.playerEmpire),
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

  const hasFullIntel = run.playerEmpire.policies.includes('full_intel');
  return c.json({
    news: result.news,
    standings: result.standings,
    round: run.round,
    playerEmpire: {
      ...run.playerEmpire,
      spellCosts: calculateAllSpellCosts(run.playerEmpire),
    },
    botEmpires: run.botEmpires.map(mapBotToSummary),
    intel: getIntelWithPolicy(run.intel, run.botEmpires, hasFullIntel, run.round.number),
    isComplete: isGameComplete(run),
    playerDefeated: run.playerDefeated,
    stats: run.stats,
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

// ============================================
// STATIC ASSETS FALLBACK
// ============================================

// Serve static assets for non-API routes
app.get('*', async (c) => {
  // Let the ASSETS binding handle static files
  const response = await c.env.ASSETS.fetch(c.req.raw);

  // If asset not found, serve index.html for SPA routing
  if (response.status === 404) {
    const indexRequest = new Request(new URL('/', c.req.url).toString(), c.req.raw);
    return c.env.ASSETS.fetch(indexRequest);
  }

  return response;
});

export default app;
