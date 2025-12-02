/**
 * Bot Generation
 *
 * Creates bot empires with personalities, races, and industry allocations based on seed.
 */

import type { Race, BotArchetype, BotEmpire, BotPersonality, IndustryAllocation } from '../../types';
import {
  BOT_PERSONALITIES,
  BOT_RACE_PREFERENCES,
  BOT_INDUSTRY_PREFERENCES,
  INDUSTRY_VARIATION,
  BOT_CONSTANTS,
} from './definitions';
import { createEmptyMemory } from './memory';
import { createEmpire } from '../empire';

// ============================================
// RNG HELPER
// ============================================

function advanceRng(rng: number): number {
  return (rng * 1103515245 + 12345) & 0x7fffffff;
}

// ============================================
// BOT ARCHETYPE SELECTION
// ============================================

export function selectBotArchetypes(count: number, seed: number): BotArchetype[] {
  const allArchetypes = Object.keys(BOT_PERSONALITIES) as BotArchetype[];

  // Seeded shuffle using LCG
  const shuffled = [...allArchetypes];
  let rng = seed;

  for (let i = shuffled.length - 1; i > 0; i--) {
    rng = advanceRng(rng);
    const j = rng % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled.slice(0, count);
}

// ============================================
// INDUSTRY ALLOCATION GENERATION
// ============================================

/**
 * Generate a seeded industry allocation based on archetype preferences.
 * Applies random variation (±INDUSTRY_VARIATION) while ensuring sum = 100.
 */
export function generateIndustryAllocation(
  archetype: BotArchetype,
  seed: number
): IndustryAllocation {
  const base = BOT_INDUSTRY_PREFERENCES[archetype];
  let rng = seed;

  // Apply variation to each type
  const varied = {
    trparm: base.trparm,
    trplnd: base.trplnd,
    trpfly: base.trpfly,
    trpsea: base.trpsea,
  };

  // Generate random variations for each type
  const types: (keyof IndustryAllocation)[] = ['trparm', 'trplnd', 'trpfly', 'trpsea'];

  for (const type of types) {
    rng = advanceRng(rng);
    // Random value between -INDUSTRY_VARIATION and +INDUSTRY_VARIATION
    const variation = (rng % (INDUSTRY_VARIATION * 2 + 1)) - INDUSTRY_VARIATION;
    varied[type] = Math.max(0, Math.min(100, varied[type] + variation));
  }

  // Normalize to ensure sum = 100
  const total = varied.trparm + varied.trplnd + varied.trpfly + varied.trpsea;

  if (total === 0) {
    // Fallback if everything went to 0
    return { trparm: 100, trplnd: 0, trpfly: 0, trpsea: 0 };
  }

  // Scale proportionally to sum to 100
  const scale = 100 / total;
  const normalized: IndustryAllocation = {
    trparm: Math.round(varied.trparm * scale),
    trplnd: Math.round(varied.trplnd * scale),
    trpfly: Math.round(varied.trpfly * scale),
    trpsea: Math.round(varied.trpsea * scale),
  };

  // Fix rounding errors by adjusting the largest value
  const finalTotal = normalized.trparm + normalized.trplnd + normalized.trpfly + normalized.trpsea;
  if (finalTotal !== 100) {
    // Find the largest allocation and adjust it
    const diff = 100 - finalTotal;
    let maxType: keyof IndustryAllocation = 'trparm';
    for (const type of types) {
      if (normalized[type] > normalized[maxType]) {
        maxType = type;
      }
    }
    normalized[maxType] += diff;
  }

  return normalized;
}

// ============================================
// BOT GENERATION
// ============================================

export function generateBots(
  seed: number,
  count: number = BOT_CONSTANTS.botsPerGame
): BotEmpire[] {
  const archetypes = selectBotArchetypes(count, seed);
  const bots: BotEmpire[] = [];

  let rng = seed + 1000; // Offset for race selection

  for (let i = 0; i < archetypes.length; i++) {
    const archetype = archetypes[i];
    const personality = BOT_PERSONALITIES[archetype];

    // Select race based on preferences with seeded randomness
    rng = advanceRng(rng);
    const racePrefs = BOT_RACE_PREFERENCES[archetype];
    const raceIndex = rng % racePrefs.length;
    const race = racePrefs[raceIndex];

    // Generate seeded industry allocation for this bot
    // Use a unique seed per bot: base seed + bot index offset
    const industrySeed = seed + 2000 + i * 100;
    const industryAllocation = generateIndustryAllocation(archetype, industrySeed);

    const bot = createBotEmpire(
      `bot_${i}_${archetype}`,
      personality,
      race,
      industryAllocation
    );

    bots.push(bot);
  }

  return bots;
}

// ============================================
// SINGLE BOT CREATION
// ============================================

export function createBotEmpire(
  id: string,
  personality: BotPersonality,
  race: Race,
  industryAllocation?: IndustryAllocation
): BotEmpire {
  // Create base empire with standard starting values
  const baseEmpire = createEmpire(
    id,
    personality.name,
    race,
    personality.preferredEra
  );

  // Apply custom industry allocation if provided
  if (industryAllocation) {
    baseEmpire.industryAllocation = industryAllocation;
  }

  // Extend with bot-specific properties
  return {
    ...baseEmpire,
    isBot: true as const,
    personality,
    memory: createEmptyMemory(),
    currentState: 'developing',
  };
}
