import type { GameRun, LeaderboardEntry, Env, BotEmpire } from '../types';
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

export async function saveGameRun(db: D1Database, run: GameRun): Promise<void> {
  await db
    .prepare(
      `INSERT OR REPLACE INTO game_runs
       (id, player_id, seed, round_number, turns_remaining, phase,
        player_empire, bot_empires, market_prices, shop_stock, draft_options,
        reroll_cost, reroll_count, intel, modifiers,
        player_defeated, created_at, updated_at, completed_at, final_score)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      run.id,
      run.playerId,
      run.seed,
      run.round.number,
      run.round.turnsRemaining,
      run.round.phase,
      JSON.stringify(run.playerEmpire),
      JSON.stringify(run.botEmpires),
      JSON.stringify(run.marketPrices),
      run.shopStock ? JSON.stringify(run.shopStock) : null,
      run.draftOptions ? JSON.stringify(run.draftOptions) : null,
      run.rerollCost ?? null,
      run.rerollCount ?? 0,
      JSON.stringify(run.intel ?? {}),
      JSON.stringify(run.modifiers ?? []),
      run.playerDefeated ?? null,
      run.createdAt,
      run.updatedAt,
      run.round.phase === 'complete' ? Date.now() : null,
      run.round.phase === 'complete' ? run.playerEmpire.networth : null
    )
    .run();
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

function reconstructGameRun(row: Record<string, unknown>): GameRun {
  // Parse bot empires and ensure they have memory initialized
  const botEmpires = (JSON.parse(row.bot_empires as string) as BotEmpire[]).map(bot => ({
    ...bot,
    memory: bot.memory ?? createEmptyMemory(),
  }));

  return {
    id: row.id as string,
    playerId: row.player_id as string,
    seed: row.seed as number,
    round: {
      number: row.round_number as number,
      turnsRemaining: row.turns_remaining as number,
      phase: row.phase as GameRun['round']['phase'],
    },
    playerEmpire: JSON.parse(row.player_empire as string),
    botEmpires,
    marketPrices: JSON.parse(row.market_prices as string),
    shopStock: row.shop_stock ? JSON.parse(row.shop_stock as string) : null,
    draftOptions: row.draft_options ? JSON.parse(row.draft_options as string) : null,
    rerollCost: row.reroll_cost as number | null,
    rerollCount: (row.reroll_count as number) ?? 0,
    intel: row.intel ? JSON.parse(row.intel as string) : {},
    modifiers: JSON.parse(row.modifiers as string),
    playerDefeated: row.player_defeated ? (row.player_defeated as string) as GameRun['playerDefeated'] : null,
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
    createdAt: Date.now(),
  };

  await db
    .prepare(
      `INSERT INTO leaderboard
       (id, player_id, player_name, race, final_networth, rounds_completed, modifiers, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      entry.id,
      entry.playerId,
      entry.playerName,
      entry.race,
      entry.finalNetworth,
      entry.roundsCompleted,
      JSON.stringify(entry.modifiers),
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
