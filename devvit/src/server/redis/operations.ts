/**
 * Redis Operations
 *
 * Replaces D1/SQLite operations from /server/src/db/operations.ts
 * Implements key-value storage patterns for game state
 */

import type { RedisClient } from '@devvit/public-api';
import type { GameRun } from '../types';

/**
 * Helper to get today's date in YYYY-MM-DD format
 */
function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Redis key patterns
 */
export const Keys = {
  gameState: (gameId: string) => `game:${gameId}:state`,
  gameEmpire: (gameId: string) => `game:${gameId}:empire`,
  gameBots: (gameId: string) => `game:${gameId}:bots`,
  gameRound: (gameId: string) => `game:${gameId}:round`,
  userGames: (userId: string) => `user:${userId}:games`,
  userActiveGame: (userId: string) => `user:${userId}:active`,
  userProfile: (userId: string) => `user:${userId}:profile`,
  leaderboardDaily: (date: string) => `leaderboard:daily:${date}`,
  leaderboardAllTime: () => `leaderboard:alltime`,
} as const;

/**
 * Game state operations
 */
export class GameOperations {
  /**
   * Get game by ID
   */
  static async get(redis: RedisClient, gameId: string): Promise<GameRun | null> {
    const data = await redis.get(Keys.gameState(gameId));
    return data ? JSON.parse(data) : null;
  }

  /**
   * Save game state with optimistic locking (version check)
   * Returns false if version mismatch (concurrent modification detected)
   */
  static async save(redis: RedisClient, run: GameRun): Promise<boolean> {
    const key = Keys.gameState(run.id);

    // Check if game exists and version matches
    const existingData = await redis.get(key);
    if (existingData) {
      const existing = JSON.parse(existingData);
      if (existing.version !== run.version - 1) {
        // Version mismatch - someone else modified it
        return false;
      }
    }

    // Save with incremented version
    await redis.set(key, JSON.stringify(run));

    // Update user's active game pointer
    await redis.set(Keys.userActiveGame(run.playerId), run.id);

    // Set TTL (30 days for inactive games)
    await redis.expire(key, 30 * 24 * 60 * 60);

    return true;
  }

  /**
   * Get active game for a user
   */
  static async getActiveGame(redis: RedisClient, userId: string): Promise<GameRun | null> {
    const activeGameId = await redis.get(Keys.userActiveGame(userId));
    if (!activeGameId) return null;

    const data = await redis.get(Keys.gameState(activeGameId));
    if (!data) return null;

    const run = JSON.parse(data);

    // Check if game is actually still active
    if (run.round.phase === 'complete') {
      // Clear the active game pointer
      await redis.del(Keys.userActiveGame(userId));
      return null;
    }

    return run;
  }

  /**
   * Get player's game history
   */
  static async getPlayerHistory(redis: RedisClient, userId: string, limit: number): Promise<GameRun[]> {
    // This would require scanning all games - for now return empty array
    // In production, you'd maintain a sorted set of user's games
    return [];
  }
}

/**
 * User operations
 */
export class UserOperations {
  constructor(private redis: RedisClient) {}

  /**
   * Get or create user profile
   */
  static async getOrCreate(redis: RedisClient, userId: string, username: string): Promise<any> {
    const key = Keys.userProfile(userId);
    const existing = await redis.get(key);

    if (existing) {
      return JSON.parse(existing);
    }

    // Create new profile
    const profile = {
      id: userId,
      displayName: username,
      gamesPlayed: 0,
      highScore: 0,
      createdAt: Date.now(),
    };

    await redis.set(key, JSON.stringify(profile));
    return profile;
  }

  /**
   * Update player stats after game completion
   */
  static async updateStats(redis: RedisClient, userId: string, networth: number): Promise<void> {
    const key = Keys.userProfile(userId);
    const data = await redis.get(key);

    if (data) {
      const profile = JSON.parse(data);
      profile.gamesPlayed = (profile.gamesPlayed || 0) + 1;
      profile.highScore = Math.max(profile.highScore || 0, networth);
      await redis.set(key, JSON.stringify(profile));
    }
  }

  async addGame(userId: string, gameId: string): Promise<void> {
    // Using zAdd instead of lPush for sorted sets
    const key = Keys.userGames(userId);
    await this.redis.zAdd(key, { member: gameId, score: Date.now() });
  }

  async getGames(userId: string): Promise<string[]> {
    const key = Keys.userGames(userId);
    const scores = await this.redis.zRange(key, 0, -1, { reverse: true, by: 'rank' });
    return scores.map((s) => s.member);
  }

  async removeGame(userId: string, gameId: string): Promise<void> {
    const key = Keys.userGames(userId);
    await this.redis.zRem(key, [gameId]);
  }

  async getProfile(userId: string): Promise<any | null> {
    const data = await this.redis.get(Keys.userProfile(userId));
    return data ? JSON.parse(data) : null;
  }

  async updateProfile(userId: string, profile: any): Promise<void> {
    await this.redis.set(Keys.userProfile(userId), JSON.stringify(profile));
  }
}

/**
 * Leaderboard operations
 */
export class LeaderboardOperations {
  constructor(private redis: RedisClient) {}

  /**
   * Add entry from completed game
   */
  static async addEntry(redis: RedisClient, run: GameRun): Promise<void> {
    const today = getTodayDate();

    // Add to all-time leaderboard
    await redis.zAdd(Keys.leaderboardAllTime(), {
      member: run.playerId,
      score: run.playerEmpire.networth,
    });

    // Add to daily leaderboard
    const dailyKey = Keys.leaderboardDaily(today);
    await redis.zAdd(dailyKey, {
      member: run.playerId,
      score: run.playerEmpire.networth,
    });

    // Set TTL for daily leaderboard (7 days)
    await redis.expire(dailyKey, 7 * 24 * 60 * 60);
  }

  /**
   * Get leaderboard entries with filters
   */
  static async get(
    redis: RedisClient,
    options: {
      timeframe: 'all' | 'daily' | 'weekly';
      race?: string;
      limit: number;
      offset: number;
    }
  ): Promise<any[]> {
    const key =
      options.timeframe === 'daily'
        ? Keys.leaderboardDaily(getTodayDate())
        : Keys.leaderboardAllTime();

    const start = options.offset;
    const stop = options.offset + options.limit - 1;

    const scores = await redis.zRange(key, start, stop, { reverse: true, by: 'rank' });

    return scores.map((item, index) => ({
      rank: options.offset + index + 1,
      userId: item.member,
      score: item.score,
    }));
  }

  /**
   * Get player's rank
   */
  static async getPlayerRank(redis: RedisClient, userId: string): Promise<{ rank: number; score: number } | null> {
    const key = Keys.leaderboardAllTime();
    const rank = await redis.zRank(key, userId);

    if (rank === undefined) return null;

    const score = await redis.zScore(key, userId);

    return {
      rank: rank + 1, // Convert 0-indexed to 1-indexed
      score: score || 0,
    };
  }

  async addScore(type: 'daily' | 'alltime', userId: string, networth: number, date?: string): Promise<void> {
    const key = type === 'daily'
      ? Keys.leaderboardDaily(date || this.getTodayDate())
      : Keys.leaderboardAllTime();

    await this.redis.zAdd(key, { member: userId, score: networth });

    // Set TTL for daily leaderboard (7 days)
    if (type === 'daily') {
      await this.redis.expire(key, 7 * 24 * 60 * 60);
    }
  }

  async getTopScores(type: 'daily' | 'alltime', limit: number = 100, date?: string): Promise<Array<{ userId: string; networth: number }>> {
    const key = type === 'daily'
      ? Keys.leaderboardDaily(date || this.getTodayDate())
      : Keys.leaderboardAllTime();

    const scores = await this.redis.zRange(key, 0, limit - 1, { reverse: true, by: 'rank' });

    return scores.map(item => ({
      userId: item.member,
      networth: item.score,
    }));
  }

  async getUserRank(type: 'daily' | 'alltime', userId: string, date?: string): Promise<number | null> {
    const key = type === 'daily'
      ? Keys.leaderboardDaily(date || this.getTodayDate())
      : Keys.leaderboardAllTime();

    const rank = await this.redis.zRank(key, userId);
    return rank !== undefined ? rank + 1 : null; // Convert 0-indexed to 1-indexed
  }

  private getTodayDate(): string {
    return getTodayDate();
  }
}

/**
 * Factory function to create all operation instances
 * Note: Most operations are now static and don't need instances
 */
export function createOperations(redis: RedisClient) {
  return {
    users: new UserOperations(redis),
    leaderboard: new LeaderboardOperations(redis),
  };
}
