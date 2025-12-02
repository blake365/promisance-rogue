/**
 * Bot System
 *
 * Main exports for the bot AI system.
 */

// Re-export types from main types file
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

// Internal types
export type {
  TargetScore,
  BotActionContext,
  BotTurnResult,
} from './types';

// Definitions (editable bot attributes)
export {
  BOT_PERSONALITIES,
  BOT_RACE_PREFERENCES,
  BOT_SPELL_PREFERENCES,
  BOT_INDUSTRY_PREFERENCES,
  INDUSTRY_VARIATION,
  STATE_WEIGHT_MODIFIERS,
  TARGETING_WEIGHTS,
  BUILDING_PRIORITIES,
  BOT_CONSTANTS,
} from './definitions';

// Memory
export {
  createEmptyMemory,
  recordAttackReceived,
  recordSpellReceived,
  getGrudgeLevel,
  getTopGrudge,
  updateBotMemoryAfterAttack,
  updateBotMemoryAfterSpell,
} from './memory';

// State
export {
  determineBotState,
  STATE_DESCRIPTIONS,
} from './state';

// Targeting
export {
  scoreTargets,
  selectAttackTarget,
  selectSpellTarget,
} from './targeting';

// Decisions
export {
  decideBotAction,
  advanceRng,
} from './decisions';
export type { BotDecision } from './decisions';

// Phase processing
export { processBotPhase } from './phase';

// Bot generation
export {
  generateBots,
  selectBotArchetypes,
  createBotEmpire,
  generateIndustryAllocation,
} from './generation';
