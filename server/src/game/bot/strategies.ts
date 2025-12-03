/**
 * Bot Strategies
 *
 * Defines committed strategies for each bot archetype.
 * Strategies determine building ratios, turn priorities, attack behavior,
 * and explore allocation - replacing the old weighted random system.
 *
 * Design philosophy: Bots should play like humans - pick a strategy and commit to it.
 * See STRATEGY_DESIGN.md for full documentation.
 */

import type { Race, Era, TurnAction, SpellType, BotArchetype, IndustryAllocation } from '../../types';

// ============================================
// STRATEGY INTERFACE
// ============================================

export interface BuildingRatio {
  bldfood: number;  // Farms (food production)
  bldcash: number;  // Markets (income)
  bldtrp: number;   // Barracks (troop production)
  bldwiz: number;   // Towers (runes + wizards)
  bldcost: number;  // Exchanges (reduce expenses)
}

/**
 * Innate bonuses that bots receive to compensate for not having advisors.
 * These are applied automatically based on archetype.
 */
export interface InnateBonuses {
  offense?: number;              // +X% offense power (e.g., 0.15 = +15%)
  defense?: number;              // +X% defense power
  troopProduction?: number;      // +X% troop production
  foodProduction?: number;       // +X% food production
  income?: number;               // +X% income
  exploreMultiplier?: number;    // Xn explore land (e.g., 2.0 = 2x)
  spellCost?: number;            // -X% spell cost (negative value)
  magicPower?: number;           // +X% wizard power
  marketBonus?: number;          // +X% market effectiveness
  permanentShield?: boolean;     // Always shielded
  crossEraAttacks?: boolean;     // Can attack any era (all bots get this)
}

export interface BotStrategy {
  // Identity
  archetype: BotArchetype;
  name: string;
  description: string;

  // Race and era preferences (ordered by preference)
  preferredRaces: Race[];
  preferredEra: Era;

  // Building target ratios (must sum to 100)
  buildingRatio: BuildingRatio;

  // Turn allocation
  turnPriority: TurnAction[];           // Actions in priority order (after land acquisition)
  exploreTurnsPerRound: [number, number]; // [min, max] explore turns per round
  exploreBeforeAttack: boolean;          // If true, explore first then attack

  // Attack behavior
  attackHealthThreshold: number;         // Stop attacking below this health %
  minPowerRatioToAttack: number;         // Minimum offense/defense ratio to attack
  attackStartRound: number;              // Don't attack before this round (1 = immediate)
  maxAttacksPerRound: number;            // Cap on attacks (up to game limit of 10)

  // Industry allocation (troop production mix, must sum to 100)
  industryAllocation: IndustryAllocation;

  // Spell behavior
  maintainShield: boolean;               // Always keep shield active?
  useOffensiveSpells: boolean;           // Use spells offensively instead of/alongside attacks?
  preferredOffensiveSpells: SpellType[]; // Offensive spells in priority order

  // Innate bonuses (compensation for not having advisors)
  innateBonuses: InnateBonuses;
}

// ============================================
// STRATEGY DEFINITIONS
// ============================================

export const BOT_STRATEGIES: Record<BotArchetype, BotStrategy> = {
  /**
   * GENERAL VASK - Aggressive Attacker
   *
   * Dominates through military pressure. Attacks early and often,
   * uses Future era for explore + industry bonuses. Takes player's land.
   */
  general_vask: {
    archetype: 'general_vask',
    name: 'General Vask',
    description: 'Aggressive military leader who attacks early and often',

    preferredRaces: ['orc', 'troll', 'dwarf'],
    preferredEra: 'future',

    buildingRatio: {
      bldfood: 25,
      bldcash: 0,
      bldtrp: 65,
      bldwiz: 10,
      bldcost: 0,
    },

    turnPriority: ['industry', 'farm', 'cash'],
    exploreTurnsPerRound: [5, 8],
    exploreBeforeAttack: false,  // Attack first, explore with remaining turns

    attackHealthThreshold: 60,
    minPowerRatioToAttack: 0.8,  // Will attack even at slight disadvantage
    attackStartRound: 2,
    maxAttacksPerRound: 10,      // Use all attacks

    industryAllocation: {
      trparm: 45,
      trplnd: 45,
      trpfly: 10,
      trpsea: 0,
    },

    maintainShield: true,
    useOffensiveSpells: false,   // Prefers physical attacks
    preferredOffensiveSpells: ['fight', 'blast'],

    // Innate bonuses: Military focus
    innateBonuses: {
      offense: 0.15,           // +15% offense
      troopProduction: 0.25,   // +25% troop production
      crossEraAttacks: true,
    },
  },

  /**
   * GRAIN MOTHER - Survival Farmer
   *
   * Passive farmer who survives through food surplus.
   * Avoids combat, grows via explore, builds networth passively.
   */
  grain_mother: {
    archetype: 'grain_mother',
    name: 'The Grain Mother',
    description: 'Peaceful empire focused on food production and survival',

    preferredRaces: ['gremlin', 'elf', 'human'],
    preferredEra: 'present',  // +40% explore for safe growth

    buildingRatio: {
      bldfood: 85,
      bldcash: 0,
      bldtrp: 5,
      bldwiz: 10,
      bldcost: 0,
    },

    turnPriority: ['farm', 'cash', 'meditate'],
    exploreTurnsPerRound: [10, 12],
    exploreBeforeAttack: true,  // Explore is primary land source

    attackHealthThreshold: 90,   // Very conservative
    minPowerRatioToAttack: 1.5,  // Only attack when dominant
    attackStartRound: 4,         // Late attacker
    maxAttacksPerRound: 3,       // Few attacks

    industryAllocation: {
      trparm: 90,
      trplnd: 10,
      trpfly: 0,
      trpsea: 0,
    },

    maintainShield: true,
    useOffensiveSpells: false,
    preferredOffensiveSpells: [],

    // Innate bonuses: Peaceful growth
    innateBonuses: {
      foodProduction: 0.50,    // +50% food production
      defense: 0.25,           // +25% defense
      crossEraAttacks: true,
    },
  },

  /**
   * ARCHON NYX - Battle Mage
   *
   * Magic-focused empire that meditates and uses spells offensively.
   * Stays in Past for rune bonus, harasses through magical attacks.
   */
  archon_nyx: {
    archetype: 'archon_nyx',
    name: 'Archon Nyx',
    description: 'Archmage who dominates through magical warfare',

    preferredRaces: ['elf', 'drow', 'human'],
    preferredEra: 'past',  // +20% rune production

    buildingRatio: {
      bldfood: 20,
      bldcash: 0,
      bldtrp: 5,
      bldwiz: 75,
      bldcost: 0,
    },

    turnPriority: ['meditate', 'farm', 'industry'],
    exploreTurnsPerRound: [4, 6],
    exploreBeforeAttack: true,

    attackHealthThreshold: 70,
    minPowerRatioToAttack: 1.0,  // Uses spells, less reliant on troop power
    attackStartRound: 2,
    maxAttacksPerRound: 5,       // Mix of spell attacks

    industryAllocation: {
      trparm: 30,
      trplnd: 10,
      trpfly: 60,
      trpsea: 0,
    },

    maintainShield: true,
    useOffensiveSpells: true,    // Primary attack method
    preferredOffensiveSpells: ['fight', 'blast', 'storm', 'steal'],

    // Innate bonuses: Magical mastery
    innateBonuses: {
      magicPower: 0.30,        // +30% wizard power
      spellCost: -0.20,        // -20% spell rune costs
      crossEraAttacks: true,
    },
  },

  /**
   * IRON BARON - Industrial Tank
   *
   * Maximum troop production, late-game dominance.
   * Patient early game, builds unstoppable army, crushes in rounds 5+.
   */
  iron_baron: {
    archetype: 'iron_baron',
    name: 'Iron Baron',
    description: 'Industrial powerhouse who builds an unstoppable late-game army',

    preferredRaces: ['dwarf', 'goblin', 'orc'],
    preferredEra: 'future',  // +15% industry, +80% explore

    buildingRatio: {
      bldfood: 15,
      bldcash: 0,
      bldtrp: 80,
      bldwiz: 0,
      bldcost: 5,
    },

    turnPriority: ['industry', 'cash', 'farm'],
    exploreTurnsPerRound: [8, 10],
    exploreBeforeAttack: true,  // Build first

    attackHealthThreshold: 70,
    minPowerRatioToAttack: 1.2,  // Waits for advantage
    attackStartRound: 5,         // Patient - builds first
    maxAttacksPerRound: 10,      // All-out when ready

    industryAllocation: {
      trparm: 25,
      trplnd: 70,  // Tank-heavy
      trpfly: 5,
      trpsea: 0,
    },

    maintainShield: false,       // Relies on army strength
    useOffensiveSpells: false,
    preferredOffensiveSpells: ['struct'],  // Destroy enemy production if used

    // Innate bonuses: Industrial might
    innateBonuses: {
      troopProduction: 0.50,   // +50% troop production
      defense: 0.15,           // +15% defense
      crossEraAttacks: true,
    },
  },

  /**
   * THE LOCUST - Land Rush
   *
   * Maximizes land through massive exploration and opportunistic attacks.
   * Uses Future era's +80% explore bonus to outgrow everyone.
   */
  the_locust: {
    archetype: 'the_locust',
    name: 'The Locust',
    description: 'Land-hungry empire that explores aggressively and raids',

    preferredRaces: ['orc', 'troll', 'elf'],
    preferredEra: 'future',  // +80% explore!

    buildingRatio: {
      bldfood: 35,
      bldcash: 0,
      bldtrp: 55,
      bldwiz: 10,
      bldcost: 0,
    },

    turnPriority: ['industry', 'farm', 'cash'],
    exploreTurnsPerRound: [15, 20],  // Primary land source!
    exploreBeforeAttack: true,       // Explore is main strategy

    attackHealthThreshold: 65,
    minPowerRatioToAttack: 0.9,  // Opportunistic
    attackStartRound: 2,
    maxAttacksPerRound: 6,       // Attacks supplement explore

    industryAllocation: {
      trparm: 50,
      trplnd: 20,
      trpfly: 30,
      trpsea: 0,
    },

    maintainShield: true,
    useOffensiveSpells: false,
    preferredOffensiveSpells: ['steal', 'storm'],

    // Innate bonuses: Expansion focus
    innateBonuses: {
      exploreMultiplier: 2.0,  // 2x explore land
      offense: 0.15,           // +15% offense
      crossEraAttacks: true,
    },
  },

  /**
   * SHADOW MERCHANT - Economic
   *
   * Maximizes gold and networth. Avoids combat, grows via explore,
   * wins through pure economic power.
   */
  shadow_merchant: {
    archetype: 'shadow_merchant',
    name: 'Shadow Merchant',
    description: 'Wealthy empire focused on economic dominance',

    preferredRaces: ['gnome', 'human', 'elf'],
    preferredEra: 'present',  // Safe middle ground

    buildingRatio: {
      bldfood: 30,
      bldcash: 55,
      bldtrp: 10,
      bldwiz: 0,
      bldcost: 5,
    },

    turnPriority: ['cash', 'farm', 'industry'],
    exploreTurnsPerRound: [10, 12],
    exploreBeforeAttack: true,  // Safe growth priority

    attackHealthThreshold: 85,
    minPowerRatioToAttack: 2.0,  // Only attacks when vastly superior
    attackStartRound: 6,         // Very late attacker
    maxAttacksPerRound: 2,       // Minimal attacks

    industryAllocation: {
      trparm: 60,
      trplnd: 40,
      trpfly: 0,
      trpsea: 0,
    },

    maintainShield: true,
    useOffensiveSpells: false,
    preferredOffensiveSpells: ['steal'],  // If anything, steal gold

    // Innate bonuses: Economic mastery
    innateBonuses: {
      income: 0.25,            // +25% income
      marketBonus: 0.50,       // +50% market effectiveness
      crossEraAttacks: true,
    },
  },

  /**
   * THE FORTRESS - Defensive Wall
   *
   * Pure defense strategy. Too costly to attack, survives to end,
   * wins through sustained networth without provoking others.
   */
  the_fortress: {
    archetype: 'the_fortress',
    name: 'The Fortress',
    description: 'Impenetrable defensive empire that outlasts opponents',

    preferredRaces: ['dwarf', 'human', 'goblin'],
    preferredEra: 'present',  // Balanced bonuses

    buildingRatio: {
      bldfood: 35,
      bldcash: 5,
      bldtrp: 45,
      bldwiz: 10,
      bldcost: 5,
    },

    turnPriority: ['industry', 'farm', 'cash', 'meditate'],
    exploreTurnsPerRound: [8, 10],
    exploreBeforeAttack: true,  // Doesn't want to provoke

    attackHealthThreshold: 95,   // Almost never attacks
    minPowerRatioToAttack: 2.5,  // Only when completely dominant
    attackStartRound: 8,         // Very late if at all
    maxAttacksPerRound: 2,       // Retaliation only

    industryAllocation: {
      trparm: 40,
      trplnd: 40,  // High defense cavalry
      trpfly: 0,
      trpsea: 20,  // Ships have good defense
    },

    maintainShield: true,        // Always shielded
    useOffensiveSpells: false,
    preferredOffensiveSpells: ['struct'],  // Counter-attack infrastructure

    // Innate bonuses: Defensive wall
    innateBonuses: {
      defense: 0.25,           // +25% defense
      permanentShield: true,   // Always shielded
      crossEraAttacks: true,
    },
  },
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get strategy for an archetype
 */
export function getStrategy(archetype: BotArchetype): BotStrategy {
  return BOT_STRATEGIES[archetype];
}

/**
 * Get innate bonuses for an archetype
 */
export function getInnateBonuses(archetype: BotArchetype): InnateBonuses {
  return BOT_STRATEGIES[archetype].innateBonuses;
}

/**
 * Default (empty) innate bonuses for non-bot empires
 */
const DEFAULT_BONUSES: InnateBonuses = {};

/**
 * Get innate bonus value for a specific stat.
 * Returns undefined if empire is not a bot or doesn't have that bonus.
 *
 * Usage: getBotInnateBonusValue(empire, 'offense') returns 0.15 for General Vask
 *
 * This function accepts any empire-like object and checks at runtime
 * if it's a bot with the appropriate properties.
 */
export function getBotInnateBonusValue<K extends keyof InnateBonuses>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  empire: any,
  stat: K
): InnateBonuses[K] | undefined {
  // Runtime check: is this a bot empire?
  if (!empire || !empire.isBot || !empire.personality?.archetype) {
    return undefined;
  }
  const bonuses = getInnateBonuses(empire.personality.archetype);
  return bonuses[stat];
}

/**
 * Get random explore turns within strategy's range
 */
export function getExploreTurns(strategy: BotStrategy, seed: number): number {
  const [min, max] = strategy.exploreTurnsPerRound;
  const range = max - min + 1;
  return min + (seed % range);
}

/**
 * Check if bot should attack based on strategy and current state
 */
export function shouldAttack(
  strategy: BotStrategy,
  currentRound: number,
  currentHealth: number,
  powerRatio: number,  // attacker offense / defender defense
  attacksUsed: number
): boolean {
  // Not attacking before start round
  if (currentRound < strategy.attackStartRound) {
    return false;
  }

  // Health too low
  if (currentHealth < strategy.attackHealthThreshold) {
    return false;
  }

  // Not strong enough
  if (powerRatio < strategy.minPowerRatioToAttack) {
    return false;
  }

  // Already used max attacks
  if (attacksUsed >= strategy.maxAttacksPerRound) {
    return false;
  }

  return true;
}

/**
 * Calculate target building counts based on strategy ratios and available land
 */
export function getTargetBuildings(
  strategy: BotStrategy,
  totalLand: number,
  currentBuildings: { bldfood: number; bldcash: number; bldtrp: number; bldwiz: number; bldcost: number }
): { bldfood: number; bldcash: number; bldtrp: number; bldwiz: number; bldcost: number } {
  // Calculate target counts based on ratios
  // Leave some land free for flexibility (5%)
  const buildableLand = Math.floor(totalLand * 0.95);

  return {
    bldfood: Math.floor(buildableLand * strategy.buildingRatio.bldfood / 100),
    bldcash: Math.floor(buildableLand * strategy.buildingRatio.bldcash / 100),
    bldtrp: Math.floor(buildableLand * strategy.buildingRatio.bldtrp / 100),
    bldwiz: Math.floor(buildableLand * strategy.buildingRatio.bldwiz / 100),
    bldcost: Math.floor(buildableLand * strategy.buildingRatio.bldcost / 100),
  };
}

/**
 * Calculate what buildings to construct this turn to move toward target ratios.
 *
 * Building ratios are strictly enforced by:
 * 1. Calculating the deficit for each building type based on target ratios
 * 2. Prioritizing buildings by their target ratio (most important = highest ratio)
 * 3. Filling deficits proportionally based on ratio weights
 */
export function getBuildingsToBuild(
  strategy: BotStrategy,
  totalLand: number,
  freeLand: number,
  currentBuildings: { bldfood: number; bldcash: number; bldtrp: number; bldwiz: number; bldcost: number }
): Partial<{ bldfood: number; bldcash: number; bldtrp: number; bldwiz: number; bldcost: number }> {
  if (freeLand <= 0) {
    return {};
  }

  const targets = getTargetBuildings(strategy, totalLand, currentBuildings);
  const allocation: Partial<{ bldfood: number; bldcash: number; bldtrp: number; bldwiz: number; bldcost: number }> = {};

  // Calculate deficits for each building type
  const deficits = {
    bldfood: Math.max(0, targets.bldfood - currentBuildings.bldfood),
    bldcash: Math.max(0, targets.bldcash - currentBuildings.bldcash),
    bldtrp: Math.max(0, targets.bldtrp - currentBuildings.bldtrp),
    bldwiz: Math.max(0, targets.bldwiz - currentBuildings.bldwiz),
    bldcost: Math.max(0, targets.bldcost - currentBuildings.bldcost),
  };

  const totalDeficit = deficits.bldfood + deficits.bldcash + deficits.bldtrp + deficits.bldwiz + deficits.bldcost;

  // Sort building types by their target ratio (highest first = most important)
  const types: (keyof typeof deficits)[] = ['bldfood', 'bldcash', 'bldtrp', 'bldwiz', 'bldcost'];
  const sortedTypes = types.sort((a, b) => strategy.buildingRatio[b] - strategy.buildingRatio[a]);

  if (totalDeficit === 0) {
    // Already at target ratios, build proportionally to maintain them
    let remaining = freeLand;

    for (const type of sortedTypes) {
      const ratio = strategy.buildingRatio[type];
      if (ratio > 0) {
        const amount = Math.floor(freeLand * ratio / 100);
        if (amount > 0) {
          allocation[type] = Math.min(amount, remaining);
          remaining -= allocation[type]!;
        }
      }
    }
  } else {
    // Build to fill deficits, prioritized by strategy importance AND deficit size
    let remaining = freeLand;

    // Calculate priority score for each building type:
    // Priority = deficit * (1 + ratio/100)
    // This weights buildings that are both behind AND important higher
    const priorityScores = sortedTypes.map(type => ({
      type,
      deficit: deficits[type],
      ratio: strategy.buildingRatio[type],
      score: deficits[type] * (1 + strategy.buildingRatio[type] / 100),
    })).filter(item => item.deficit > 0)
      .sort((a, b) => b.score - a.score);

    // First pass: Fill the most critical deficits (buildings with high priority scores)
    for (const { type, deficit } of priorityScores) {
      if (remaining <= 0) break;

      // Allocate up to the full deficit, but proportional to available land
      const amount = Math.min(deficit, remaining);
      allocation[type] = amount;
      remaining -= amount;
    }

    // If we have remaining land and all deficits are filled, distribute by ratio
    if (remaining > 0 && totalDeficit < freeLand) {
      for (const type of sortedTypes) {
        const ratio = strategy.buildingRatio[type];
        if (ratio > 0 && remaining > 0) {
          const extraAmount = Math.floor(remaining * ratio / 100);
          if (extraAmount > 0) {
            allocation[type] = (allocation[type] ?? 0) + extraAmount;
            remaining -= extraAmount;
          }
        }
      }
    }
  }

  return allocation;
}

/**
 * Get the next turn action based on strategy priority and current resources
 */
export function getNextTurnAction(
  strategy: BotStrategy,
  currentResources: { gold: number; food: number; runes: number },
  peasants: number,
  wizards: number
): TurnAction {
  // Check for critical resource shortages
  const foodPerPeasant = 10;  // Approximate consumption
  if (currentResources.food < peasants * foodPerPeasant * 5) {
    // Critical food shortage - override to farm
    return 'farm';
  }

  if (currentResources.gold < 5000) {
    // Critical gold shortage - override to cash
    return 'cash';
  }

  // Mages need runes for spells
  if (strategy.useOffensiveSpells && currentResources.runes < 500 && wizards > 20) {
    return 'meditate';
  }

  // Follow strategy priority
  return strategy.turnPriority[0] || 'cash';
}
