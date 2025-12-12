/**
 * Bot Generation
 *
 * Creates bot empires with personalities, races, and industry allocations based on seed.
 */

import type { Race, BotArchetype, BotEmpire, BotPersonality, IndustryAllocation } from '../../types';
import {
  BOT_PERSONALITIES,
  BOT_RACE_PREFERENCES,
  INDUSTRY_VARIATION,
  BOT_CONSTANTS,
  BOT_RARITY,
  RARITY_WEIGHTS,
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

/**
 * Select bot archetypes using weighted random selection based on rarity.
 * Common bots appear more often, rare bots are special encounters.
 */
export function selectBotArchetypes(count: number, seed: number): BotArchetype[] {
  const allArchetypes = Object.keys(BOT_PERSONALITIES) as BotArchetype[];
  let rng = seed;

  // Build weighted list: each archetype appears with weight based on rarity
  const weightedArchetypes: { archetype: BotArchetype; weight: number }[] = allArchetypes.map(archetype => ({
    archetype,
    weight: RARITY_WEIGHTS[BOT_RARITY[archetype]],
  }));

  const totalWeight = weightedArchetypes.reduce((sum, a) => sum + a.weight, 0);
  const selected: BotArchetype[] = [];

  // Select 'count' unique archetypes using weighted random selection
  const remaining = [...weightedArchetypes];

  while (selected.length < count && remaining.length > 0) {
    // Calculate current total weight of remaining options
    const currentTotal = remaining.reduce((sum, a) => sum + a.weight, 0);

    // Pick a random value in the weight range
    rng = advanceRng(rng);
    let roll = rng % currentTotal;

    // Find which archetype this roll lands on
    let chosenIndex = 0;
    for (let i = 0; i < remaining.length; i++) {
      roll -= remaining[i].weight;
      if (roll < 0) {
        chosenIndex = i;
        break;
      }
    }

    // Add to selected and remove from remaining (no duplicates)
    selected.push(remaining[chosenIndex].archetype);
    remaining.splice(chosenIndex, 1);
  }

  return selected;
}

// ============================================
// INDUSTRY ALLOCATION GENERATION
// ============================================

/**
 * Industry allocation templates for variety.
 * Bots randomly select from these base profiles, then apply variation.
 */
const INDUSTRY_TEMPLATES: IndustryAllocation[] = [
  // Balanced mixed forces
  { trparm: 30, trplnd: 30, trpfly: 20, trpsea: 20 },
  { trparm: 25, trplnd: 25, trpfly: 25, trpsea: 25 },

  // Infantry-heavy
  { trparm: 50, trplnd: 25, trpfly: 15, trpsea: 10 },
  { trparm: 60, trplnd: 20, trpfly: 10, trpsea: 10 },

  // Armor-heavy (cavalry/tanks)
  { trparm: 20, trplnd: 50, trpfly: 20, trpsea: 10 },
  { trparm: 15, trplnd: 60, trpfly: 15, trpsea: 10 },

  // Air superiority
  { trparm: 20, trplnd: 15, trpfly: 50, trpsea: 15 },
  { trparm: 15, trplnd: 10, trpfly: 60, trpsea: 15 },

  // Naval dominance
  { trparm: 20, trplnd: 15, trpfly: 15, trpsea: 50 },
  { trparm: 15, trplnd: 10, trpfly: 20, trpsea: 55 },

  // Combined arms (various specializations)
  { trparm: 40, trplnd: 40, trpfly: 10, trpsea: 10 },  // Ground war
  { trparm: 10, trplnd: 10, trpfly: 40, trpsea: 40 },  // Air-sea power
  { trparm: 35, trplnd: 20, trpfly: 35, trpsea: 10 },  // Infantry + air
  { trparm: 20, trplnd: 35, trpfly: 10, trpsea: 35 },  // Armor + navy
];

/**
 * Generate a random industry allocation for a bot.
 * Selects a random template and applies variation for uniqueness.
 */
export function generateIndustryAllocation(
  _archetype: BotArchetype,  // Kept for API compatibility but no longer used
  seed: number
): IndustryAllocation {
  let rng = seed;

  // Select a random template
  rng = advanceRng(rng);
  const templateIndex = rng % INDUSTRY_TEMPLATES.length;
  const template = INDUSTRY_TEMPLATES[templateIndex];

  // Apply random variation to each type
  const varied = {
    trparm: template.trparm,
    trplnd: template.trplnd,
    trpfly: template.trpfly,
    trpsea: template.trpsea,
  };

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
    return { trparm: 25, trplnd: 25, trpfly: 25, trpsea: 25 };
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

/**
 * Chance to shift industry allocation mid-game.
 * Returns a new allocation if shift occurs, or null if no change.
 *
 * @param currentAllocation - The bot's current industry allocation
 * @param seed - RNG seed for this decision
 * @param chancePercent - Percentage chance to shift (default 10%)
 * @returns New allocation if shifted, null otherwise
 */
export function maybeShiftIndustryAllocation(
  currentAllocation: IndustryAllocation,
  seed: number,
  chancePercent: number = 10
): IndustryAllocation | null {
  let rng = seed;

  // Check if shift occurs
  rng = advanceRng(rng);
  if (rng % 100 >= chancePercent) {
    return null; // No shift
  }

  // Shift by picking a new template and blending with current
  rng = advanceRng(rng);
  const templateIndex = rng % INDUSTRY_TEMPLATES.length;
  const template = INDUSTRY_TEMPLATES[templateIndex];

  // Blend: 60% old allocation, 40% new template (gradual shift)
  const blended = {
    trparm: Math.round(currentAllocation.trparm * 0.6 + template.trparm * 0.4),
    trplnd: Math.round(currentAllocation.trplnd * 0.6 + template.trplnd * 0.4),
    trpfly: Math.round(currentAllocation.trpfly * 0.6 + template.trpfly * 0.4),
    trpsea: Math.round(currentAllocation.trpsea * 0.6 + template.trpsea * 0.4),
  };

  // Normalize to 100
  const total = blended.trparm + blended.trplnd + blended.trpfly + blended.trpsea;
  if (total === 0) {
    return { trparm: 25, trplnd: 25, trpfly: 25, trpsea: 25 };
  }

  const scale = 100 / total;
  const normalized: IndustryAllocation = {
    trparm: Math.round(blended.trparm * scale),
    trplnd: Math.round(blended.trplnd * scale),
    trpfly: Math.round(blended.trpfly * scale),
    trpsea: Math.round(blended.trpsea * scale),
  };

  // Fix rounding
  const finalTotal = normalized.trparm + normalized.trplnd + normalized.trpfly + normalized.trpsea;
  if (finalTotal !== 100) {
    const diff = 100 - finalTotal;
    const types: (keyof IndustryAllocation)[] = ['trparm', 'trplnd', 'trpfly', 'trpsea'];
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
