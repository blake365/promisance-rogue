/**
 * Redis Operations
 *
 * Replaces D1/SQLite operations from /server/src/db/operations.ts
 * Implements key-value storage patterns for game state
 */

import type { RedisClient } from '@devvit/public-api';

/**
 * Redis key patterns
 */
export const Keys = {
  gameState: (gameId: string) => `game:${gameId}:state`,
  gameEmpire: (gameId: string) => `game:${gameId}:empire`,
  gameBots: (gameId: string) => `game:${gameId}:bots`,
  gameRound: (gameId: string) => `game:${gameId}:round`,
  userGames: (userId: string) => `user:${userId}:games`,
  userProfile: (userId: string) => `user:${userId}:profile`,
  leaderboardDaily: (date: string) => `leaderboard:daily:${date}`,
  leaderboardAllTime: () => `leaderboard:alltime`,
} as const;

/**
 * Game state operations
 */
export class GameOperations {
  constructor(private redis: RedisClient) {}

  async create(gameId: string, state: any): Promise<void> {
    // Store complete game state as JSON
    await this.redis.set(Keys.gameState(gameId), JSON.stringify(state));

    // Set initial round
    await this.redis.set(Keys.gameRound(gameId), '1');

    // Set TTL (30 days for inactive games)
    await this.redis.expire(Keys.gameState(gameId), 30 * 24 * 60 * 60);
  }

  async get(gameId: string): Promise<any | null> {
    const data = await this.redis.get(Keys.gameState(gameId));
    return data ? JSON.parse(data) : null;
  }

  async update(gameId: string, state: any): Promise<void> {
    await this.redis.set(Keys.gameState(gameId), JSON.stringify(state));
  }

  async delete(gameId: string): Promise<void> {
    await this.redis.del(Keys.gameState(gameId));
    await this.redis.del(Keys.gameRound(gameId));
  }

  async getCurrentRound(gameId: string): Promise<number> {
    const round = await this.redis.get(Keys.gameRound(gameId));
    return round ? parseInt(round, 10) : 1;
  }

  async incrementRound(gameId: string): Promise<number> {
    const newRound = await this.redis.incrBy(Keys.gameRound(gameId), 1);
    return newRound;
  }
}

/**
 * User operations
 */
export class UserOperations {
  constructor(private redis: RedisClient) {}

  async addGame(userId: string, gameId: string): Promise<void> {
    await this.redis.lPush(Keys.userGames(userId), [gameId]);
  }

  async getGames(userId: string): Promise<string[]> {
    return await this.redis.lRange(Keys.userGames(userId), 0, -1);
  }

  async removeGame(userId: string, gameId: string): Promise<void> {
    await this.redis.lRem(Keys.userGames(userId), 1, gameId);
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
    return new Date().toISOString().split('T')[0];
  }
}

/**
 * Factory function to create all operation instances
 */
export function createOperations(redis: RedisClient) {
  return {
    games: new GameOperations(redis),
    users: new UserOperations(redis),
    leaderboard: new LeaderboardOperations(redis),
  };
}
