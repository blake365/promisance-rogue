/**
 * Bot Decision Making
 *
 * Combines personality weights, state modifiers, and situational
 * adjustments to decide what action a bot should take.
 */

import type { TurnAction, Buildings, SpellType, Empire, BotEmpire } from '../../types';
import type { BotActionContext } from './types';
import {
  STATE_WEIGHT_MODIFIERS,
  BUILDING_PRIORITIES,
  BOT_SPELL_PREFERENCES,
  BOT_CONSTANTS,
} from './definitions';
import { determineBotState } from './state';
import { selectAttackTarget, selectSpellTarget } from './targeting';
import { calculateOffensePower, calculateDefensePower } from '../combat';

// ============================================
// ACTION SELECTION
// ============================================

export interface BotDecision {
  action: TurnAction;
  turns: number;
  targetId?: string;
  spell?: SpellType;
  buildingAllocation?: Partial<Buildings>;
}

export function decideBotAction(ctx: BotActionContext): BotDecision {
  const { bot, player, otherBots, currentRound, turnsRemaining, seed } = ctx;

  // Update bot state
  bot.currentState = determineBotState(bot, player, otherBots, currentRound);

  // Calculate effective weights
  const weights = calculateEffectiveWeights(bot);

  // Apply situational adjustments
  applySituationalAdjustments(bot, weights);

  // Select action by weighted random
  let rng = advanceRng(seed);
  const action = selectActionByWeight(weights, rng);

  // Build the decision with action-specific details
  return buildDecision(ctx, action, rng);
}

// ============================================
// WEIGHT CALCULATION
// ============================================

function calculateEffectiveWeights(bot: BotEmpire): Record<TurnAction, number> {
  const baseWeights = { ...bot.personality.weights };
  const stateModifiers = STATE_WEIGHT_MODIFIERS[bot.currentState];

  // Apply state modifiers
  for (const action of Object.keys(baseWeights) as TurnAction[]) {
    const modifier = stateModifiers[action] ?? 1.0;
    baseWeights[action] *= modifier;
  }

  return baseWeights;
}

function applySituationalAdjustments(
  bot: BotEmpire,
  weights: Record<TurnAction, number>
): void {
  // Low food = farm more
  if (bot.resources.food < bot.peasants * 10) {
    weights.farm *= 2;
  }

  // Low gold = cash more
  if (bot.resources.gold < 10000) {
    weights.cash *= 2;
  }

  // Low runes but has wizards = meditate more
  if (bot.resources.runes < BOT_CONSTANTS.minRunesForSpells &&
      bot.troops.trpwiz >= BOT_CONSTANTS.minWizardsForSpells) {
    weights.meditate *= 2;
  }

  // Lots of free land = build more
  if (bot.resources.freeland > bot.resources.land * 0.3) {
    weights.build *= 2;
  }

  // Can't cast spells = reduce spell weight
  if (bot.troops.trpwiz < BOT_CONSTANTS.minWizardsForSpells ||
      bot.resources.runes < BOT_CONSTANTS.minRunesForSpells) {
    weights.spell *= 0.1;
  }

  // Very low health = no attacking
  if (bot.health < 30) {
    weights.attack *= 0.2;
  }
}

// ============================================
// ACTION SELECTION BY WEIGHT
// ============================================

function selectActionByWeight(
  weights: Record<TurnAction, number>,
  rng: number
): TurnAction {
  const actions = Object.entries(weights) as [TurnAction, number][];
  const totalWeight = actions.reduce((sum, [, weight]) => sum + weight, 0);

  let random = (rng % 10000) / 10000 * totalWeight;

  for (const [action, weight] of actions) {
    random -= weight;
    if (random <= 0) {
      return action;
    }
  }

  return 'cash'; // Fallback
}

// ============================================
// BUILD DECISION DETAILS
// ============================================

function buildDecision(
  ctx: BotActionContext,
  action: TurnAction,
  rng: number
): BotDecision {
  const { bot, player, otherBots, currentRound, turnsRemaining } = ctx;

  switch (action) {
    case 'explore':
    case 'farm':
    case 'cash':
    case 'meditate':
    case 'industry': {
      const turns = Math.min(BOT_CONSTANTS.maxTurnsPerAction, turnsRemaining);
      return { action, turns };
    }

    case 'build': {
      const allocation = decideBuildAllocation(bot);
      return { action, turns: 1, buildingAllocation: allocation };
    }

    case 'attack': {
      rng = advanceRng(rng);
      const target = selectAttackTarget(bot, player, otherBots, currentRound, rng);

      if (target && turnsRemaining >= 2) {
        // Check if we actually want to attack this target
        const botPower = calculateOffensePower(bot);
        const targetPower = calculateDefensePower(target);
        const powerRatio = botPower / (targetPower + 1);

        if (powerRatio >= bot.personality.aggressionThreshold) {
          return {
            action: 'attack',
            turns: 2,
            targetId: target.id,
          };
        }
      }

      // Fall back to industry if can't/won't attack
      return {
        action: 'industry',
        turns: Math.min(2, turnsRemaining),
      };
    }

    case 'spell': {
      rng = advanceRng(rng);
      const spellDecision = decideSpell(ctx, rng);

      if (spellDecision) {
        return spellDecision;
      }

      // Fall back to meditate if can't cast
      return {
        action: 'meditate',
        turns: Math.min(2, turnsRemaining),
      };
    }

    default:
      return { action: 'cash', turns: 1 };
  }
}

// ============================================
// BUILDING ALLOCATION
// ============================================

function decideBuildAllocation(bot: BotEmpire): Partial<Buildings> {
  const freeland = bot.resources.freeland;
  const maxBuildings = Math.min(freeland, 10);

  if (maxBuildings <= 0) {
    return {};
  }

  // Select priority based on defense focus
  const priorities = bot.personality.defenseFocus > 0.5
    ? BUILDING_PRIORITIES.defensive
    : BUILDING_PRIORITIES.offensive;

  const allocation: Partial<Buildings> = {};

  // bldpop and blddef removed from game
  allocation.bldfood = Math.floor(maxBuildings * priorities.bldfood);
  allocation.bldtrp = Math.floor(maxBuildings * priorities.bldtrp);
  allocation.bldcash = Math.floor(maxBuildings * priorities.bldcash);
  allocation.bldwiz = Math.floor(maxBuildings * priorities.bldwiz);

  return allocation;
}

// ============================================
// SPELL DECISIONS
// ============================================

function decideSpell(ctx: BotActionContext, rng: number): BotDecision | null {
  const { bot, player, otherBots, currentRound, turnsRemaining } = ctx;

  // Check if can cast spells
  if (bot.troops.trpwiz < BOT_CONSTANTS.minWizardsForSpells ||
      bot.resources.runes < BOT_CONSTANTS.minRunesForSpells ||
      turnsRemaining < 2) {
    return null;
  }

  const spellPrefs = BOT_SPELL_PREFERENCES[bot.personality.archetype];

  // Decide: offensive or defensive spell?
  // Defensive if: in defensive state, or no shield and have enemies
  const needsShield = !bot.shieldExpiresRound || bot.shieldExpiresRound < currentRound;
  const inDefensiveState = bot.currentState === 'defensive';

  if ((needsShield || inDefensiveState) && spellPrefs.defensive.length > 0) {
    // Cast defensive spell
    const spell = selectSpellFromList(spellPrefs.defensive, bot, rng);
    if (spell) {
      return {
        action: 'spell',
        turns: 2,
        spell,
      };
    }
  }

  // Try offensive spell
  if (spellPrefs.offensive.length > 0 &&
      (bot.currentState === 'aggressive' || bot.currentState === 'retaliating')) {
    rng = advanceRng(rng);
    const target = selectSpellTarget(bot, player, otherBots, currentRound, rng);

    if (target) {
      rng = advanceRng(rng);
      const spell = selectSpellFromList(spellPrefs.offensive, bot, rng);
      if (spell) {
        return {
          action: 'spell',
          turns: 2,
          spell,
          targetId: target.id,
        };
      }
    }
  }

  // Fall back to defensive spell
  if (spellPrefs.defensive.length > 0) {
    const spell = selectSpellFromList(spellPrefs.defensive, bot, rng);
    if (spell) {
      return {
        action: 'spell',
        turns: 2,
        spell,
      };
    }
  }

  return null;
}

function selectSpellFromList(
  spells: SpellType[],
  bot: BotEmpire,
  rng: number
): SpellType | null {
  if (spells.length === 0) return null;

  // Prioritize shield if not active
  if (spells.includes('shield') && !bot.shieldExpiresRound) {
    return 'shield';
  }

  // Prioritize food if low
  if (spells.includes('food') && bot.resources.food < bot.peasants * 15) {
    return 'food';
  }

  // Otherwise random from list
  const index = rng % spells.length;
  return spells[index];
}

// ============================================
// RNG HELPER
// ============================================

function advanceRng(rng: number): number {
  return (rng * 1103515245 + 12345) & 0x7fffffff;
}

export { advanceRng };
