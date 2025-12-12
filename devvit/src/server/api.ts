/**
 * Devvit API Handlers
 *
 * Maps original REST endpoints to Devvit RPC-style handlers
 * All game logic is reused unchanged from /game - only persistence layer changes
 */

import type { Context } from '@devvit/public-api';
import type {
  Race,
  TurnActionRequest,
  ShopTransaction,
  BankTransaction,
  BotEmpire,
  SpyIntel,
  Empire,
  GameRun,
  MarketPrices,
} from './types';

// Import game logic (unchanged from original)
import {
  createGameRun,
  executeTurn,
  endPlayerPhase,
  selectDraft,
  rerollDraft,
  getRerollInfo,
  endShopPhase,
  executeBotPhase,
  getGameSummary,
  isGameComplete,
} from './game/run';

import {
  executeMarketTransaction,
  dismissAdvisor,
  getAdvisorCapacity,
  getEffectiveTroopPrices,
} from './game/shop';

import { calculateNetworth } from './game/empire';
import { calculateAllSpellCosts } from './game/spells';
import { getCombatPreview } from './game/combat';
import { processBankTransaction, getBankInfo } from './game/bank';
import { TOTAL_ROUNDS, TURNS_PER_ROUND } from './game/constants';

// Import Redis operations
import { GameOperations, UserOperations, LeaderboardOperations } from './redis/operations';

// ============================================
// HELPER FUNCTIONS
// ============================================

// Bot summary with limited info (no troop/resource details unless spied)
interface BotSummaryResponse {
  id: string;
  name: string;
  race: string;
  era: string;
  networth: number;
  land: number;
}

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

// Add spell costs to empire for client display
function empireWithSpellCosts(empire: Empire) {
  return {
    ...empire,
    spellCosts: calculateAllSpellCosts(empire),
  };
}

// Get current market prices based on phase
function getCurrentMarketPrices(run: GameRun): MarketPrices {
  return run.round.phase === 'shop' ? run.shopMarketPrices : run.playerMarketPrices;
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

// Helper to require auth
function requireAuth(context: Context): string {
  const userId = context.userId;
  if (!userId) {
    throw new Error('Unauthorized');
  }
  return userId;
}

// ============================================
// AUTH HANDLER
// ============================================

export async function getPlayer(context: Context) {
  const userId = requireAuth(context);
  const username = context.username || 'Anonymous';

  // Get or create player in Redis
  const player = await UserOperations.getOrCreate(context.redis, userId, username);
  return player;
}

// ============================================
// GAME MANAGEMENT HANDLERS
// ============================================

export async function createGame(
  context: Context,
  request: { empireName: string; race: Race; seed?: number }
) {
  const userId = requireAuth(context);

  // Validate inputs
  if (!request.empireName || request.empireName.length < 1 || request.empireName.length > 32) {
    throw new Error('Invalid empire name');
  }

  const validRaces: Race[] = ['human', 'elf', 'dwarf', 'troll', 'gnome', 'gremlin', 'orc', 'drow', 'goblin'];
  if (!validRaces.includes(request.race)) {
    throw new Error('Invalid race');
  }

  // Validate seed if provided
  let validatedSeed: number | undefined;
  if (request.seed !== undefined) {
    validatedSeed = Math.floor(Math.abs(request.seed)) % 2147483647;
    if (validatedSeed === 0) validatedSeed = 1;
  }

  // Check for existing active game
  const existingRun = await GameOperations.getActiveGame(context.redis, userId);
  if (existingRun) {
    throw new Error(`Active game exists: ${existingRun.id}`);
  }

  // Create new game
  const gameId = crypto.randomUUID();
  const run = createGameRun(gameId, userId, request.empireName, request.race, validatedSeed);

  await GameOperations.save(context.redis, run);

  return {
    gameId: run.id,
    seed: run.seed,
    summary: getGameSummary(run),
  };
}

export async function abandonGame(context: Context) {
  const userId = requireAuth(context);

  const run = await GameOperations.getActiveGame(context.redis, userId);
  if (!run) {
    throw new Error('No active game to abandon');
  }

  // Mark as complete (abandoned)
  run.round.phase = 'complete';
  run.playerDefeated = 'abandoned';
  await GameOperations.save(context.redis, run);

  return { success: true, gameId: run.id };
}

export async function getCurrentGame(context: Context) {
  const userId = requireAuth(context);

  try {
    const run = await GameOperations.getActiveGame(context.redis, userId);

    if (!run) {
      return { hasActiveGame: false };
    }

    const hasFullIntel = run.playerEmpire.policies?.includes('full_intel') ?? false;
    return {
      hasActiveGame: true,
      game: {
        id: run.id,
        seed: run.seed,
        round: run.round,
        playerEmpire: empireWithSpellCosts(run.playerEmpire),
        botEmpires: run.botEmpires.map(mapBotToSummary),
        intel: getIntelWithPolicy(run.intel ?? {}, run.botEmpires, hasFullIntel, run.round.number),
        marketPrices: getCurrentMarketPrices(run),
        effectivePrices: getEffectiveTroopPrices(run.playerEmpire, getCurrentMarketPrices(run)),
        shopStock: run.shopStock,
        draftOptions: run.draftOptions,
        playerDefeated: run.playerDefeated,
        stats: run.stats,
      },
    };
  } catch (error) {
    console.error('Error loading current game:', error);
    return {
      error: 'Your saved game appears to be corrupted. You can start a new game.',
      hasActiveGame: false,
      corrupted: true,
    };
  }
}

export async function getGame(context: Context, request: { gameId: string }) {
  const userId = requireAuth(context);

  const run = await GameOperations.get(context.redis, request.gameId);
  if (!run) {
    throw new Error('Game not found');
  }

  if (run.playerId !== userId) {
    throw new Error('Unauthorized');
  }

  const hasFullIntel = run.playerEmpire.policies.includes('full_intel');
  const currentPrices = getCurrentMarketPrices(run);

  return {
    game: {
      id: run.id,
      seed: run.seed,
      round: run.round,
      playerEmpire: empireWithSpellCosts(run.playerEmpire),
      botEmpires: run.botEmpires.map(mapBotToSummary),
      intel: getIntelWithPolicy(run.intel, run.botEmpires, hasFullIntel, run.round.number),
      marketPrices: currentPrices,
      effectivePrices: getEffectiveTroopPrices(run.playerEmpire, currentPrices),
      shopStock: run.shopStock,
      draftOptions: run.draftOptions,
      isComplete: isGameComplete(run),
      playerDefeated: run.playerDefeated,
      stats: run.stats,
    },
  };
}

// ============================================
// TURN ACTION HANDLERS
// ============================================

export async function executeTurnAction(
  context: Context,
  request: { gameId: string } & TurnActionRequest
) {
  const userId = requireAuth(context);

  const run = await GameOperations.get(context.redis, request.gameId);
  if (!run || run.playerId !== userId) {
    throw new Error('Game not found');
  }

  if (run.round.phase !== 'player') {
    throw new Error('Not in player phase');
  }

  const result = executeTurn(run, request);

  if (result.success) {
    const saved = await GameOperations.save(context.redis, run);
    if (!saved) {
      throw new Error('Conflict: game state was modified. Please refresh and try again.');
    }
  }

  return {
    result: {
      ...result,
      empire: empireWithSpellCosts(result.empire),
    },
    summary: getGameSummary(run),
    botEmpires: run.botEmpires.map(mapBotToSummary),
  };
}

export async function updateSettings(
  context: Context,
  request: {
    gameId: string;
    industryAllocation?: { trparm: number; trplnd: number; trpfly: number; trpsea: number };
    taxRate?: number;
  }
) {
  const userId = requireAuth(context);

  const run = await GameOperations.get(context.redis, request.gameId);
  if (!run || run.playerId !== userId) {
    throw new Error('Game not found');
  }

  // Validate and apply industry allocation
  if (request.industryAllocation) {
    const total =
      request.industryAllocation.trparm +
      request.industryAllocation.trplnd +
      request.industryAllocation.trpfly +
      request.industryAllocation.trpsea;
    if (total !== 100) {
      throw new Error('Industry allocation must sum to 100%');
    }
    if (Object.values(request.industryAllocation).some((v) => v < 0 || v > 100)) {
      throw new Error('Allocation values must be between 0 and 100');
    }
    run.playerEmpire.industryAllocation = request.industryAllocation;
  }

  // Validate and apply tax rate
  if (request.taxRate !== undefined) {
    if (request.taxRate < 0 || request.taxRate > 100) {
      throw new Error('Tax rate must be between 0 and 100');
    }
    run.playerEmpire.taxRate = request.taxRate;
  }

  const saved = await GameOperations.save(context.redis, run);
  if (!saved) {
    throw new Error('Conflict: game state was modified. Please refresh and try again.');
  }

  return {
    success: true,
    empire: empireWithSpellCosts(run.playerEmpire),
  };
}

export async function getCombatPreviewHandler(
  context: Context,
  request: { gameId: string; targetId: string }
) {
  const userId = requireAuth(context);

  const run = await GameOperations.get(context.redis, request.gameId);
  if (!run || run.playerId !== userId) {
    throw new Error('Game not found');
  }

  const target = run.botEmpires.find((b) => b.id === request.targetId);
  if (!target) {
    throw new Error('Target not found');
  }

  const preview = getCombatPreview(run.playerEmpire, target, run.round.turnsRemaining);
  return preview;
}

export async function endPlayerPhaseHandler(context: Context, request: { gameId: string }) {
  const userId = requireAuth(context);

  const run = await GameOperations.get(context.redis, request.gameId);
  if (!run || run.playerId !== userId) {
    throw new Error('Game not found');
  }

  if (run.round.phase !== 'player') {
    throw new Error('Not in player phase');
  }

  endPlayerPhase(run);

  // If game is complete (final round), record to leaderboard
  if (isGameComplete(run)) {
    await LeaderboardOperations.addEntry(context.redis, run);
    await UserOperations.updateStats(context.redis, userId, run.playerEmpire.networth);
  }

  await GameOperations.save(context.redis, run);

  return {
    phase: run.round.phase,
    marketPrices: getCurrentMarketPrices(run),
    shopStock: run.shopStock,
    draftOptions: run.draftOptions,
    isComplete: isGameComplete(run),
    stats: run.stats,
    playerDefeated: run.playerDefeated,
  };
}

// ============================================
// MARKET & BANK HANDLERS
// ============================================

export async function marketTransaction(
  context: Context,
  request: { gameId: string; transaction: ShopTransaction }
) {
  const userId = requireAuth(context);

  const run = await GameOperations.get(context.redis, request.gameId);
  if (!run || run.playerId !== userId) {
    throw new Error('Game not found');
  }

  // Allow market transactions during both player and shop phases
  if (run.round.phase !== 'player' && run.round.phase !== 'shop') {
    throw new Error('Market not available in this phase');
  }

  const isShopPhase = run.round.phase === 'shop';
  const currentPrices = getCurrentMarketPrices(run);

  const result = executeMarketTransaction(
    run.playerEmpire,
    request.transaction,
    currentPrices,
    run.shopStock,
    isShopPhase
  );

  if (result.success) {
    run.playerEmpire.networth = calculateNetworth(run.playerEmpire);
    const saved = await GameOperations.save(context.redis, run);
    if (!saved) {
      throw new Error('Conflict: game state was modified. Please refresh and try again.');
    }
  }

  return {
    result,
    empire: empireWithSpellCosts(run.playerEmpire),
    shopStock: run.shopStock,
    effectivePrices: getEffectiveTroopPrices(run.playerEmpire, currentPrices),
  };
}

export async function getBankInfoHandler(context: Context, request: { gameId: string }) {
  const userId = requireAuth(context);

  const run = await GameOperations.get(context.redis, request.gameId);
  if (!run || run.playerId !== userId) {
    throw new Error('Game not found');
  }

  const bankInfo = getBankInfo(run.playerEmpire);
  return bankInfo;
}

export async function bankTransaction(
  context: Context,
  request: { gameId: string; transaction: BankTransaction }
) {
  const userId = requireAuth(context);

  const run = await GameOperations.get(context.redis, request.gameId);
  if (!run || run.playerId !== userId) {
    throw new Error('Game not found');
  }

  // Allow bank transactions during both player and shop phases
  if (run.round.phase !== 'player' && run.round.phase !== 'shop') {
    throw new Error('Bank not available in this phase');
  }

  const result = processBankTransaction(run.playerEmpire, request.transaction);

  if (result.success) {
    const saved = await GameOperations.save(context.redis, run);
    if (!saved) {
      throw new Error('Conflict: game state was modified. Please refresh and try again.');
    }
  }

  return {
    result,
    empire: empireWithSpellCosts(run.playerEmpire),
    bankInfo: getBankInfo(run.playerEmpire),
  };
}

// ============================================
// SHOP PHASE HANDLERS
// ============================================

export async function selectDraftHandler(
  context: Context,
  request: { gameId: string; optionIndex: number }
) {
  const userId = requireAuth(context);

  const run = await GameOperations.get(context.redis, request.gameId);
  if (!run || run.playerId !== userId) {
    throw new Error('Game not found');
  }

  if (run.round.phase !== 'shop') {
    throw new Error('Not in shop phase');
  }

  const result = selectDraft(run, request.optionIndex);

  if (result.success) {
    const saved = await GameOperations.save(context.redis, run);
    if (!saved) {
      throw new Error('Conflict: game state was modified. Please refresh and try again.');
    }
  }

  return {
    success: result.success,
    error: result.error,
    empire: empireWithSpellCosts(run.playerEmpire),
    draftOptions: run.draftOptions,
    edictResult: result.edictResult,
  };
}

export async function getRerollInfoHandler(context: Context, request: { gameId: string }) {
  const userId = requireAuth(context);

  const run = await GameOperations.get(context.redis, request.gameId);
  if (!run || run.playerId !== userId) {
    throw new Error('Game not found');
  }

  const rerollInfo = getRerollInfo(run);
  const advisorCapacity = getAdvisorCapacity(run.playerEmpire);

  return {
    ...rerollInfo,
    advisorCapacity,
  };
}

export async function rerollDraftHandler(context: Context, request: { gameId: string }) {
  const userId = requireAuth(context);

  const run = await GameOperations.get(context.redis, request.gameId);
  if (!run || run.playerId !== userId) {
    throw new Error('Game not found');
  }

  if (run.round.phase !== 'shop') {
    throw new Error('Not in shop phase');
  }

  const result = rerollDraft(run);

  if (result.success) {
    const saved = await GameOperations.save(context.redis, run);
    if (!saved) {
      throw new Error('Conflict: game state was modified. Please refresh and try again.');
    }
  }

  return {
    ...result,
    empire: empireWithSpellCosts(run.playerEmpire),
    draftOptions: run.draftOptions,
    rerollInfo: getRerollInfo(run),
  };
}

export async function dismissAdvisorHandler(
  context: Context,
  request: { gameId: string; advisorId: string }
) {
  const userId = requireAuth(context);

  const run = await GameOperations.get(context.redis, request.gameId);
  if (!run || run.playerId !== userId) {
    throw new Error('Game not found');
  }

  const result = dismissAdvisor(run.playerEmpire, request.advisorId);

  if (result.success) {
    await GameOperations.save(context.redis, run);
  }

  return {
    ...result,
    empire: empireWithSpellCosts(run.playerEmpire),
    advisorCapacity: getAdvisorCapacity(run.playerEmpire),
  };
}

export async function endShopPhaseHandler(context: Context, request: { gameId: string }) {
  const userId = requireAuth(context);

  const run = await GameOperations.get(context.redis, request.gameId);
  if (!run || run.playerId !== userId) {
    throw new Error('Game not found');
  }

  if (run.round.phase !== 'shop') {
    throw new Error('Not in shop phase');
  }

  endShopPhase(run);
  await GameOperations.save(context.redis, run);

  return { phase: run.round.phase };
}

// ============================================
// BOT PHASE HANDLER
// ============================================

export async function executeBotPhaseHandler(context: Context, request: { gameId: string }) {
  const userId = requireAuth(context);

  const run = await GameOperations.get(context.redis, request.gameId);
  if (!run || run.playerId !== userId) {
    throw new Error('Game not found');
  }

  if (run.round.phase !== 'bot') {
    throw new Error('Not in bot phase');
  }

  let result;
  try {
    result = executeBotPhase(run);
  } catch (error) {
    console.error('Bot phase error:', error);

    // Recovery: Skip bot phase and advance to next round
    if (run.round.number >= TOTAL_ROUNDS) {
      run.round.phase = 'complete';
    } else {
      run.round.number++;
      run.round.turnsRemaining = TURNS_PER_ROUND;
      run.round.phase = 'player';
      run.playerEmpire.attacksThisRound = 0;
      run.playerEmpire.offensiveSpellsThisRound = 0;
    }

    await GameOperations.save(context.redis, run);

    return {
      error: 'Bot phase encountered an error and was skipped',
      recovered: true,
      news: [],
      standings: [],
      round: run.round,
      playerEmpire: empireWithSpellCosts(run.playerEmpire),
      botEmpires: run.botEmpires.map(mapBotToSummary),
      intel: getIntelWithPolicy(
        run.intel,
        run.botEmpires,
        run.playerEmpire.policies.includes('full_intel'),
        run.round.number
      ),
      isComplete: run.round.phase === 'complete',
      playerDefeated: run.playerDefeated,
      stats: run.stats,
    };
  }

  await GameOperations.save(context.redis, run);

  // If game is complete, record to leaderboard
  if (isGameComplete(run)) {
    await LeaderboardOperations.addEntry(context.redis, run);
    await UserOperations.updateStats(context.redis, userId, run.playerEmpire.networth);
  }

  const hasFullIntel = run.playerEmpire.policies.includes('full_intel');
  return {
    news: result.news,
    standings: result.standings,
    round: run.round,
    playerEmpire: empireWithSpellCosts(run.playerEmpire),
    botEmpires: run.botEmpires.map(mapBotToSummary),
    intel: getIntelWithPolicy(run.intel, run.botEmpires, hasFullIntel, run.round.number),
    isComplete: isGameComplete(run),
    playerDefeated: run.playerDefeated,
    stats: run.stats,
  };
}

// ============================================
// LEADERBOARD HANDLERS
// ============================================

export async function getLeaderboard(
  context: Context,
  request?: {
    timeframe?: 'all' | 'daily' | 'weekly';
    race?: string;
    limit?: number;
    offset?: number;
  }
) {
  const timeframe = request?.timeframe ?? 'all';
  const limit = Math.min(request?.limit ?? 50, 100);
  const offset = request?.offset ?? 0;

  const entries = await LeaderboardOperations.get(context.redis, {
    timeframe,
    race: request?.race,
    limit,
    offset,
  });

  return { entries };
}

export async function getPlayerRank(context: Context) {
  const userId = requireAuth(context);

  const rank = await LeaderboardOperations.getPlayerRank(context.redis, userId);
  return rank ?? { rank: null, score: null };
}

export async function getHistory(context: Context, request?: { limit?: number }) {
  const userId = requireAuth(context);
  const limit = Math.min(request?.limit ?? 10, 50);

  const runs = await GameOperations.getPlayerHistory(context.redis, userId, limit);

  return {
    games: runs.map((run) => ({
      id: run.id,
      round: run.round.number,
      phase: run.round.phase,
      networth: run.playerEmpire.networth,
      race: run.playerEmpire.race,
      createdAt: run.createdAt,
      updatedAt: run.updatedAt,
    })),
  };
}
