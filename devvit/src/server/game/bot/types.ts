/**
 * Bot System Types
 *
 * Re-exports bot types from main types file and adds internal types.
 */

import type { Empire } from '../../types';

// Re-export all bot types from main types file
export type {
  BotArchetype,
  BotPersonality,
  BotState,
  BotMemory,
  BotEmpire,
  NewsAction,
  NewsItem,
  BotPhaseResult,
  BotStanding,
} from '../../types';

// ============================================
// INTERNAL TYPES (not exported from main types)
// ============================================

// Re-import for local use
import type { BotEmpire, NewsItem } from '../../types';

export interface TargetScore {
  target: Empire | BotEmpire;
  score: number;
  reasons: string[];
}

export interface BotActionContext {
  bot: BotEmpire;
  player: Empire;
  otherBots: BotEmpire[];
  currentRound: number;
  turnsRemaining: number;
  seed: number;
}

export interface BotTurnResult {
  turnsSpent: number;
  action: string;
  targetId?: string;
  news?: NewsItem;
  newSeed: number;
}
