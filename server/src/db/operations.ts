import type { GameRun, LeaderboardEntry, Env, BotEmpire, MarketPrices } from '../types';
import { serializeGameRun, deserializeGameRun } from '../game/run';
import { createEmptyMemory } from '../game/bot/memory';

// ============================================
// PLAYER OPERATIONS
// ============================================

export interface Player {
  id: string;
  email: string | null;
  displayName: string;
  createdAt: number;
  lastLogin: number | null;
  totalRuns: number;
  bestScore: number;
}

export async function createPlayer(
  db: D1Database,
  id: string,
  displayName: string,
  email?: string,
  passwordHash?: string
): Promise<Player> {
  const now = Date.now();

  await db
    .prepare(
      `INSERT INTO players (id, email, password_hash, display_name, created_at)
       VALUES (?, ?, ?, ?, ?)`
    )
    .bind(id, email ?? null, passwordHash ?? null, displayName, now)
    .run();

  return {
    id,
    email: email ?? null,
    displayName,
    createdAt: now,
    lastLogin: null,
    totalRuns: 0,
    bestScore: 0,
  };
}

export async function getPlayer(db: D1Database, id: string): Promise<Player | null> {
  const result = await db
    .prepare('SELECT * FROM players WHERE id = ?')
    .bind(id)
    .first();

  if (!result) return null;

  return {
    id: result.id as string,
    email: result.email as string | null,
    displayName: result.display_name as string,
    createdAt: result.created_at as number,
    lastLogin: result.last_login as number | null,
    totalRuns: result.total_runs as number,
    bestScore: result.best_score as number,
  };
}

export async function getPlayerByEmail(db: D1Database, email: string): Promise<Player | null> {
  const result = await db
    .prepare('SELECT * FROM players WHERE email = ?')
    .bind(email)
    .first();

  if (!result) return null;

  return {
    id: result.id as string,
    email: result.email as string | null,
    displayName: result.display_name as string,
    createdAt: result.created_at as number,
    lastLogin: result.last_login as number | null,
    totalRuns: result.total_runs as number,
    bestScore: result.best_score as number,
  };
}

export async function updatePlayerStats(
  db: D1Database,
  playerId: string,
  score: number
): Promise<void> {
  await db
    .prepare(
      `UPDATE players
       SET total_runs = total_runs + 1,
           best_score = MAX(best_score, ?),
           last_login = ?
       WHERE id = ?`
    )
    .bind(score, Date.now(), playerId)
    .run();
}

// ============================================
// GAME RUN OPERATIONS
// ============================================

/**
 * Save game run with optimistic locking.
 * Returns true if save succeeded, false if there was a version conflict.
 */
export async function saveGameRun(db: D1Database, run: GameRun): Promise<boolean> {
  const currentVersion = run.version;
  const newVersion = currentVersion + 1;

  // Try to update with version check
  const result = await db
    .prepare(
      `UPDATE game_runs SET
        player_id = ?, initial_seed = ?, seed = ?, version = ?,
        round_number = ?, turns_remaining = ?, phase = ?,
        player_empire = ?, bot_empires = ?, market_prices = ?,
        shop_stock = ?, draft_options = ?, reroll_cost = ?, reroll_count = ?,
        intel = ?, offered_advisor_ids = ?, modifiers = ?,
        player_defeated = ?, stats = ?, updated_at = ?,
        completed_at = ?, final_score = ?
       WHERE id = ? AND version = ?`
    )
    .bind(
      run.playerId,
      run.seed,              // Original seed used to create the game
      run.rngState.current,  // Current RNG state (advances during play)
      newVersion,
      run.round.number,
      run.round.turnsRemaining,
      run.round.phase,
      JSON.stringify(run.playerEmpire),
      JSON.stringify(run.botEmpires),
      JSON.stringify({ shop: run.shopMarketPrices, player: run.playerMarketPrices }),
      run.shopStock ? JSON.stringify(run.shopStock) : null,
      run.draftOptions ? JSON.stringify(run.draftOptions) : null,
      run.rerollCost ?? null,
      run.rerollCount ?? 0,
      JSON.stringify(run.intel ?? {}),
      JSON.stringify(run.offeredAdvisorIds ?? []),
      JSON.stringify(run.modifiers ?? []),
      run.playerDefeated ?? null,
      JSON.stringify(run.stats),
      Date.now(),
      run.round.phase === 'complete' ? Date.now() : null,
      run.round.phase === 'complete' ? run.playerEmpire.networth : null,
      run.id,
      currentVersion
    )
    .run();

  // Check if the update affected any rows
  if (result.meta.changes === 0) {
    // Either record doesn't exist or version mismatch
    // Try insert for new records
    const existingRun = await db
      .prepare('SELECT version FROM game_runs WHERE id = ?')
      .bind(run.id)
      .first();

    if (!existingRun) {
      // New record - do an insert
      await db
        .prepare(
          `INSERT INTO game_runs
           (id, player_id, initial_seed, seed, version, round_number, turns_remaining, phase,
            player_empire, bot_empires, market_prices, shop_stock, draft_options,
            reroll_cost, reroll_count, intel, offered_advisor_ids, modifiers,
            player_defeated, stats, created_at, updated_at, completed_at, final_score)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          run.id,
          run.playerId,
          run.seed,
          run.rngState.current,
          1, // Initial version
          run.round.number,
          run.round.turnsRemaining,
          run.round.phase,
          JSON.stringify(run.playerEmpire),
          JSON.stringify(run.botEmpires),
          JSON.stringify({ shop: run.shopMarketPrices, player: run.playerMarketPrices }),
          run.shopStock ? JSON.stringify(run.shopStock) : null,
          run.draftOptions ? JSON.stringify(run.draftOptions) : null,
          run.rerollCost ?? null,
          run.rerollCount ?? 0,
          JSON.stringify(run.intel ?? {}),
          JSON.stringify(run.offeredAdvisorIds ?? []),
          JSON.stringify(run.modifiers ?? []),
          run.playerDefeated ?? null,
          JSON.stringify(run.stats),
          run.createdAt,
          Date.now(),
          run.round.phase === 'complete' ? Date.now() : null,
          run.round.phase === 'complete' ? run.playerEmpire.networth : null
        )
        .run();
      run.version = 1;
      return true;
    }

    // Version conflict - return false
    return false;
  }

  // Update succeeded - update the run's version
  run.version = newVersion;
  return true;
}

export async function getGameRun(db: D1Database, id: string): Promise<GameRun | null> {
  const result = await db
    .prepare('SELECT * FROM game_runs WHERE id = ?')
    .bind(id)
    .first();

  if (!result) return null;

  return reconstructGameRun(result);
}

export async function getActiveGameRun(
  db: D1Database,
  playerId: string
): Promise<GameRun | null> {
  const result = await db
    .prepare(
      `SELECT * FROM game_runs
       WHERE player_id = ? AND phase != 'complete'
       ORDER BY updated_at DESC
       LIMIT 1`
    )
    .bind(playerId)
    .first();

  if (!result) return null;

  return reconstructGameRun(result);
}

export async function getPlayerGameRuns(
  db: D1Database,
  playerId: string,
  limit: number = 10
): Promise<GameRun[]> {
  const results = await db
    .prepare(
      `SELECT * FROM game_runs
       WHERE player_id = ?
       ORDER BY updated_at DESC
       LIMIT ?`
    )
    .bind(playerId, limit)
    .all();

  return results.results.map(reconstructGameRun);
}

// Default stats for existing games that don't have stats tracked yet
function createDefaultStats(): GameRun['stats'] {
  return {
    totalIncome: 0,
    totalExpenses: 0,
    totalFoodProduction: 0,
    totalFoodConsumption: 0,
    totalRuneProduction: 0,
    totalTroopsProduced: { trparm: 0, trplnd: 0, trpfly: 0, trpsea: 0, trpwiz: 0 },
    totalAttacks: 0,
    totalAttackWins: 0,
    totalLandGained: 0,
    totalLandLost: 0,
    totalKills: 0,
    totalSpellsCast: 0,
    totalOffensiveSpells: 0,
    networthPerTurn: 0,
    turnsPlayed: 0,
    peakGold: 0,
    peakFood: 0,
    peakRunes: 0,
    peakLand: 0,
    peakNetworth: 0,
    peakPeasants: 0,
    peakTrparm: 0,
    peakTrplnd: 0,
    peakTrpfly: 0,
    peakTrpsea: 0,
    peakTrpwiz: 0,
  };
}

// Parse market prices from DB - handles both old single-price format and new dual-price format
function parseMarketPrices(json: string): { shopMarketPrices: MarketPrices; playerMarketPrices: MarketPrices } {
  const parsed = JSON.parse(json);

  // New format: { shop: {...}, player: {...} }
  if (parsed.shop && parsed.player) {
    return {
      shopMarketPrices: parsed.shop,
      playerMarketPrices: parsed.player,
    };
  }

  // Old format: single MarketPrices object - use same prices for both (backwards compatibility)
  return {
    shopMarketPrices: parsed,
    playerMarketPrices: parsed,
  };
}

function reconstructGameRun(row: Record<string, unknown>): GameRun {
  // Parse bot empires and ensure they have memory initialized
  const botEmpires = (JSON.parse(row.bot_empires as string) as BotEmpire[]).map(bot => ({
    ...bot,
    memory: bot.memory ?? createEmptyMemory(),
  }));

  return {
    id: row.id as string,
    playerId: row.player_id as string,
    seed: row.initial_seed as number,  // The original seed used to create the game
    rngState: { current: row.seed as number },  // Current RNG state (advances during play)
    version: (row.version as number) ?? 1,  // Optimistic locking version (default 1 for old records)
    round: {
      number: row.round_number as number,
      turnsRemaining: row.turns_remaining as number,
      phase: row.phase as GameRun['round']['phase'],
    },
    playerEmpire: JSON.parse(row.player_empire as string),
    botEmpires,
    ...parseMarketPrices(row.market_prices as string),
    shopStock: row.shop_stock ? JSON.parse(row.shop_stock as string) : null,
    draftOptions: row.draft_options ? JSON.parse(row.draft_options as string) : null,
    rerollCost: row.reroll_cost as number | null,
    rerollCount: (row.reroll_count as number) ?? 0,
    intel: row.intel ? JSON.parse(row.intel as string) : {},
    offeredAdvisorIds: row.offered_advisor_ids ? JSON.parse(row.offered_advisor_ids as string) : [],
    modifiers: JSON.parse(row.modifiers as string),
    playerDefeated: row.player_defeated ? (row.player_defeated as string) as GameRun['playerDefeated'] : null,
    stats: row.stats ? JSON.parse(row.stats as string) : createDefaultStats(),
    createdAt: row.created_at as number,
    updatedAt: row.updated_at as number,
  };
}

// ============================================
// LEADERBOARD OPERATIONS
// ============================================

export async function addLeaderboardEntry(
  db: D1Database,
  run: GameRun
): Promise<void> {
  const entry: LeaderboardEntry = {
    id: `lb_${run.id}`,
    playerId: run.playerId,
    playerName: run.playerEmpire.name,
    race: run.playerEmpire.race,
    finalNetworth: run.playerEmpire.networth,
    roundsCompleted: run.round.number,
    modifiers: run.modifiers.map((m) => m.id),
    seed: run.seed,
    createdAt: Date.now(),
  };

  await db
    .prepare(
      `INSERT INTO leaderboard
       (id, player_id, player_name, race, final_networth, rounds_completed, modifiers, seed, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      entry.id,
      entry.playerId,
      entry.playerName,
      entry.race,
      entry.finalNetworth,
      entry.roundsCompleted,
      JSON.stringify(entry.modifiers),
      entry.seed,
      entry.createdAt
    )
    .run();
}

export async function getLeaderboard(
  db: D1Database,
  options: {
    limit?: number;
    offset?: number;
    timeframe?: 'all' | 'daily' | 'weekly';
    race?: string;
  } = {}
): Promise<LeaderboardEntry[]> {
  const { limit = 50, offset = 0, timeframe = 'all', race } = options;

  let query = 'SELECT * FROM leaderboard';
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  // Time filter
  if (timeframe === 'daily') {
    conditions.push('created_at > ?');
    params.push(Date.now() - 24 * 60 * 60 * 1000);
  } else if (timeframe === 'weekly') {
    conditions.push('created_at > ?');
    params.push(Date.now() - 7 * 24 * 60 * 60 * 1000);
  }

  // Race filter
  if (race) {
    conditions.push('race = ?');
    params.push(race);
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  query += ' ORDER BY final_networth DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const results = await db.prepare(query).bind(...params).all();

  return results.results.map((row) => ({
    id: row.id as string,
    playerId: row.player_id as string,
    playerName: row.player_name as string,
    race: row.race as string,
    finalNetworth: row.final_networth as number,
    roundsCompleted: row.rounds_completed as number,
    modifiers: JSON.parse(row.modifiers as string),
    seed: row.seed as number,
    createdAt: row.created_at as number,
  })) as LeaderboardEntry[];
}

export async function getPlayerRank(
  db: D1Database,
  playerId: string
): Promise<{ rank: number; score: number } | null> {
  // Get player's best score
  const playerResult = await db
    .prepare(
      `SELECT final_networth FROM leaderboard
       WHERE player_id = ?
       ORDER BY final_networth DESC
       LIMIT 1`
    )
    .bind(playerId)
    .first();

  if (!playerResult) return null;

  const score = playerResult.final_networth as number;

  // Count how many scores are higher
  const rankResult = await db
    .prepare(
      `SELECT COUNT(*) as rank FROM leaderboard
       WHERE final_networth > ?`
    )
    .bind(score)
    .first();

  const rank = ((rankResult?.rank as number) ?? 0) + 1;

  return { rank, score };
}

// ============================================
// SESSION OPERATIONS
// ============================================

export async function createSession(
  db: D1Database,
  id: string,
  playerId: string,
  expiresIn: number = 7 * 24 * 60 * 60 * 1000 // 7 days
): Promise<{ id: string; expiresAt: number }> {
  const now = Date.now();
  const expiresAt = now + expiresIn;

  await db
    .prepare(
      `INSERT INTO sessions (id, player_id, created_at, expires_at)
       VALUES (?, ?, ?, ?)`
    )
    .bind(id, playerId, now, expiresAt)
    .run();

  return { id, expiresAt };
}

export async function getSession(
  db: D1Database,
  id: string
): Promise<{ playerId: string; expiresAt: number } | null> {
  const result = await db
    .prepare('SELECT * FROM sessions WHERE id = ? AND expires_at > ?')
    .bind(id, Date.now())
    .first();

  if (!result) return null;

  return {
    playerId: result.player_id as string,
    expiresAt: result.expires_at as number,
  };
}

export async function deleteSession(db: D1Database, id: string): Promise<void> {
  await db.prepare('DELETE FROM sessions WHERE id = ?').bind(id).run();
}

export async function cleanExpiredSessions(db: D1Database): Promise<void> {
  await db
    .prepare('DELETE FROM sessions WHERE expires_at < ?')
    .bind(Date.now())
    .run();
}

// ============================================
// UNLOCK OPERATIONS
// ============================================

export async function addUnlock(
  db: D1Database,
  playerId: string,
  unlockType: string,
  unlockId: string
): Promise<void> {
  await db
    .prepare(
      `INSERT OR IGNORE INTO unlocks (player_id, unlock_type, unlock_id, unlocked_at)
       VALUES (?, ?, ?, ?)`
    )
    .bind(playerId, unlockType, unlockId, Date.now())
    .run();
}

export async function getPlayerUnlocks(
  db: D1Database,
  playerId: string
): Promise<{ type: string; id: string; unlockedAt: number }[]> {
  const results = await db
    .prepare('SELECT * FROM unlocks WHERE player_id = ?')
    .bind(playerId)
    .all();

  return results.results.map((row) => ({
    type: row.unlock_type as string,
    id: row.unlock_id as string,
    unlockedAt: row.unlocked_at as number,
  }));
}

export async function hasUnlock(
  db: D1Database,
  playerId: string,
  unlockType: string,
  unlockId: string
): Promise<boolean> {
  const result = await db
    .prepare(
      `SELECT 1 FROM unlocks
       WHERE player_id = ? AND unlock_type = ? AND unlock_id = ?`
    )
    .bind(playerId, unlockType, unlockId)
    .first();

  return result !== null;
}
