/**
 * Bot Definitions
 *
 * This file contains all editable bot attributes including:
 * - Personalities (action weights, aggression, defense focus)
 * - Race preferences per archetype
 * - Spell preferences (offensive and defensive)
 * - State weight modifiers
 *
 * Edit this file to tune bot behavior.
 */

import type { BotArchetype, BotPersonality, BotState, Race, SpellType, TurnAction } from '../../types';

// ============================================
// BOT PERSONALITIES
// ============================================

export const BOT_PERSONALITIES: Record<BotArchetype, BotPersonality> = {
  /**
   * GENERAL VASK - The Warmonger
   * Aggressive military leader who prioritizes attack and industry.
   * Low aggression threshold means attacks when slightly stronger.
   */
  general_vask: {
    archetype: 'general_vask',
    name: 'xX_Destroyer_Xx',
    preferredEra: 'present',
    weights: {
      explore: 5,
      farm: 10,
      cash: 10,
      meditate: 5,
      industry: 25,
      build: 10,
      demolish: 0,
      attack: 30,
      spell: 5,
    },
    aggressionThreshold: 0.8,  // Attacks when 80% of target's defense
    defenseFocus: 0.2,         // Prioritizes offense in building
  },

  /**
   * THE GRAIN MOTHER - The Farmer
   * Peaceful empire focused on food production and population.
   * Very high aggression threshold - only attacks when dominant.
   */
  grain_mother: {
    archetype: 'grain_mother',
    name: 'SunnyDays2019',
    preferredEra: 'past',
    weights: {
      explore: 10,
      farm: 35,
      cash: 15,
      meditate: 5,
      industry: 10,
      build: 15,
      demolish: 0,
      attack: 5,
      spell: 5,
    },
    aggressionThreshold: 1.5,  // Only attacks when 50% stronger
    defenseFocus: 0.7,         // Prioritizes homes and farms
  },

  /**
   * ARCHON NYX - The Archmage
   * Magic-focused empire that meditates and casts offensive spells.
   * Prefers magical warfare over physical attacks.
   */
  archon_nyx: {
    archetype: 'archon_nyx',
    name: 'Nightshade_XIII',
    preferredEra: 'past',
    weights: {
      explore: 5,
      farm: 10,
      cash: 10,
      meditate: 30,
      industry: 5,
      build: 10,
      demolish: 0,
      attack: 5,
      spell: 25,
    },
    aggressionThreshold: 1.2,
    defenseFocus: 0.3,
  },

  /**
   * IRON BARON - The Industrialist
   * Production-focused empire that builds military through industry.
   * Prefers to outproduce enemies rather than attack early.
   */
  iron_baron: {
    archetype: 'iron_baron',
    name: 'SteelReserve88',
    preferredEra: 'future',
    weights: {
      explore: 10,
      farm: 10,
      cash: 15,
      meditate: 5,
      industry: 35,
      build: 15,
      demolish: 0,
      attack: 5,
      spell: 5,
    },
    aggressionThreshold: 1.3,
    defenseFocus: 0.4,
  },

  /**
   * THE LOCUST - The Expansionist
   * Land-hungry empire that explores aggressively and raids.
   * Spreads wide, steals resources, hard to pin down.
   */
  the_locust: {
    archetype: 'the_locust',
    name: 'SpreadThinly',
    preferredEra: 'future',
    weights: {
      explore: 40,
      farm: 10,
      cash: 10,
      meditate: 5,
      industry: 10,
      build: 15,
      demolish: 0,
      attack: 5,
      spell: 5,
    },
    aggressionThreshold: 1.1,
    defenseFocus: 0.2,
  },

  /**
   * SHADOW MERCHANT - The Economist
   * Wealth-focused empire that builds economic infrastructure.
   * Avoids combat, accumulates gold, wins through networth.
   */
  shadow_merchant: {
    archetype: 'shadow_merchant',
    name: 'GoldDigger_Pro',
    preferredEra: 'present',
    weights: {
      explore: 10,
      farm: 10,
      cash: 35,
      meditate: 5,
      industry: 10,
      build: 20,
      demolish: 0,
      attack: 5,
      spell: 5,
    },
    aggressionThreshold: 1.8,  // Very reluctant to attack
    defenseFocus: 0.5,
  },

  /**
   * THE FORTRESS - The Defender
   * Defensive empire that turtles and builds defenses.
   * Rarely attacks, but very hard to crack.
   */
  the_fortress: {
    archetype: 'the_fortress',
    name: 'BrickWall99',
    preferredEra: 'present',
    weights: {
      explore: 10,
      farm: 15,
      cash: 15,
      meditate: 5,
      industry: 20,
      build: 25,
      demolish: 0,
      attack: 5,
      spell: 5,
    },
    aggressionThreshold: 2.0,  // Almost never attacks
    defenseFocus: 0.9,         // Maximum defense priority
  },

  /**
   * ADMIRAL TIDE - The Naval Commander
   * Sea-focused empire that dominates through naval superiority.
   * Strong on water, raids coastal targets, controls the seas.
   */
  admiral_tide: {
    archetype: 'admiral_tide',
    name: 'DeepBlue42',
    preferredEra: 'present',
    weights: {
      explore: 10,
      farm: 10,
      cash: 15,
      meditate: 5,
      industry: 25,
      build: 15,
      demolish: 0,
      attack: 10,
      spell: 5,
    },
    aggressionThreshold: 1.1,  // Moderately aggressive
    defenseFocus: 0.4,
  },

  /**
   * THE SABOTEUR - The Disruptor
   * Spell-focused empire that weakens enemies before striking.
   * Uses struct/storm to cripple infrastructure, then attacks.
   */
  the_saboteur: {
    archetype: 'the_saboteur',
    name: 'Glitch_In_The_System',
    preferredEra: 'past',
    weights: {
      explore: 5,
      farm: 10,
      cash: 10,
      meditate: 25,
      industry: 10,
      build: 10,
      demolish: 0,
      attack: 10,
      spell: 20,
    },
    aggressionThreshold: 1.0,  // Attacks after softening target
    defenseFocus: 0.3,
  },

  /**
   * CRIMSON BERSERKER - The Glass Cannon
   * All offense, minimal defense. High risk, high reward.
   * Attacks constantly, either dominates or gets crushed.
   */
  crimson_berserker: {
    archetype: 'crimson_berserker',
    name: 'LEEROY_2024',
    preferredEra: 'future',
    weights: {
      explore: 5,
      farm: 5,
      cash: 5,
      meditate: 0,
      industry: 30,
      build: 5,
      demolish: 0,
      attack: 45,
      spell: 5,
    },
    aggressionThreshold: 0.6,  // Attacks even when weaker!
    defenseFocus: 0.0,         // Pure offense
  },

  /**
   * THE COUNTESS - The Vengeful Noble
   * Remembers every slight, retaliates disproportionately.
   * Balanced normally, but becomes extremely aggressive when attacked.
   */
  the_countess: {
    archetype: 'the_countess',
    name: 'NeverForgets',
    preferredEra: 'present',
    weights: {
      explore: 10,
      farm: 15,
      cash: 15,
      meditate: 5,
      industry: 20,
      build: 15,
      demolish: 0,
      attack: 10,
      spell: 10,
    },
    aggressionThreshold: 1.3,  // Normal threshold, but grudge system amplifies
    defenseFocus: 0.5,
  },

  /**
   * HAPPY - The Cupcake
   * Cheerful but hopelessly incompetent. Makes poor decisions,
   * barely builds military, easy to conquer. Free food for players.
   */
  happy: {
    archetype: 'happy',
    name: 'Happy',
    preferredEra: 'past',  // Worst era for growth
    weights: {
      explore: 5,
      farm: 15,
      cash: 30,    // Hoards gold but doesn't use it well
      meditate: 10,
      industry: 5,  // Barely any troop production
      build: 25,    // Builds wrong things
      demolish: 0,
      attack: 0,    // Never attacks
      spell: 0,     // Never casts spells
    },
    aggressionThreshold: 5.0,  // Will basically never attack
    defenseFocus: 0.5,
  },
};

// ============================================
// RACE PREFERENCES
// Ordered by preference (first = most likely)
// ============================================

export const BOT_RACE_PREFERENCES: Record<BotArchetype, Race[]> = {
  general_vask: ['orc', 'troll', 'dwarf'],      // Offensive + industrial races
  grain_mother: ['gremlin', 'elf', 'human'],    // Food production races
  archon_nyx: ['elf', 'drow', 'human'],         // Magic races
  iron_baron: ['dwarf', 'goblin', 'orc'],       // Industry + cheap upkeep
  the_locust: ['orc', 'troll', 'elf'],          // Exploration + offense
  shadow_merchant: ['gnome', 'human', 'elf'],   // Market + income races
  the_fortress: ['dwarf', 'human', 'goblin'],   // Defense + building races
  admiral_tide: ['gnome', 'human', 'elf'],      // Coastal/trade races
  the_saboteur: ['drow', 'goblin', 'gremlin'],  // Sneaky races
  crimson_berserker: ['troll', 'orc', 'drow'],  // Aggressive races
  the_countess: ['human', 'elf', 'drow'],       // Noble/refined races
  happy: ['human', 'gnome', 'goblin'],          // Weak combat races
};

// ============================================
// SPELL PREFERENCES
// Offensive: used against enemies
// Defensive: used on self
// ============================================

export const BOT_SPELL_PREFERENCES: Record<BotArchetype, {
  offensive: SpellType[];
  defensive: SpellType[];
}> = {
  general_vask: {
    offensive: ['blast', 'fight'],              // Troop damage spells
    defensive: ['shield'],
  },
  grain_mother: {
    offensive: [],                              // Pacifist - no offensive magic
    defensive: ['shield', 'food'],
  },
  archon_nyx: {
    offensive: ['storm', 'struct', 'steal', 'blast', 'fight'],  // Full arsenal
    defensive: ['shield', 'runes'],
  },
  iron_baron: {
    offensive: ['struct'],                      // Destroy enemy production
    defensive: ['shield', 'gate'],
  },
  the_locust: {
    offensive: ['steal', 'storm'],              // Resource theft
    defensive: ['gate'],                        // Era mobility for raiding
  },
  shadow_merchant: {
    offensive: ['steal'],                       // Gold theft only
    defensive: ['shield', 'cash'],
  },
  the_fortress: {
    offensive: ['struct'],                      // Counter-attack infrastructure
    defensive: ['shield'],
  },
  admiral_tide: {
    offensive: ['storm', 'steal'],              // Coastal raids, resource theft
    defensive: ['shield'],
  },
  the_saboteur: {
    offensive: ['struct', 'storm', 'blast'],    // Infrastructure destruction priority
    defensive: ['shield', 'runes'],
  },
  crimson_berserker: {
    offensive: ['fight', 'blast'],              // Pure damage spells
    defensive: [],                              // No defense!
  },
  the_countess: {
    offensive: ['blast', 'fight', 'struct'],    // Vengeful assault
    defensive: ['shield'],
  },
  happy: {
    offensive: [],                              // Too incompetent to attack
    defensive: [],                              // Forgets to use defensive spells
  },
};

// ============================================
// INDUSTRY VARIATION
// How much the random seed can vary each allocation (±percentage points)
// Industry allocations are now randomly generated from templates in generation.ts
// ============================================

export const INDUSTRY_VARIATION = 15;

// ============================================
// BOT RARITY
// Determines how often each archetype appears in games
// Common: 50% weight, Uncommon: 35% weight, Rare: 15% weight
// ============================================

export type BotRarity = 'common' | 'uncommon' | 'rare';

export const BOT_RARITY: Record<BotArchetype, BotRarity> = {
  // Common (50% weight) - Balanced, straightforward playstyles
  general_vask: 'common',      // Standard aggressive
  grain_mother: 'common',      // Standard passive
  iron_baron: 'common',        // Standard industrial
  shadow_merchant: 'common',   // Standard economic
  the_countess: 'common',      // Balanced with grudge mechanic

  // Uncommon (35% weight) - Specialized playstyles
  the_fortress: 'uncommon',    // Pure turtle
  the_locust: 'uncommon',      // Land rush specialist
  admiral_tide: 'uncommon',    // Naval specialist
  the_saboteur: 'uncommon',    // Spell disruption
  happy: 'uncommon',           // Cupcake - easy target

  // Rare (15% weight) - Extreme/unique playstyles
  archon_nyx: 'rare',          // Full mage with perfect intel
  crimson_berserker: 'rare',   // Glass cannon, high variance
};

export const RARITY_WEIGHTS: Record<BotRarity, number> = {
  common: 50,
  uncommon: 35,
  rare: 15,
};

// ============================================
// STATE WEIGHT MODIFIERS
// Multipliers applied to base weights based on bot state
// BotState type is defined in ../../types
// ============================================

export const STATE_WEIGHT_MODIFIERS: Record<BotState, Partial<Record<TurnAction, number>>> = {
  developing: {
    explore: 1.5,
    farm: 1.3,
    cash: 1.3,
    build: 1.2,
    industry: 1.0,
    attack: 0.3,
    spell: 0.5,
    meditate: 0.8,
  },
  militarizing: {
    explore: 0.8,
    farm: 1.0,
    cash: 1.0,
    build: 1.2,
    industry: 1.5,
    attack: 0.7,
    spell: 0.8,
    meditate: 1.0,
  },
  aggressive: {
    explore: 0.5,
    farm: 0.8,
    cash: 0.8,
    build: 0.7,
    industry: 0.8,
    attack: 2.0,
    spell: 1.5,
    meditate: 0.8,
  },
  defensive: {
    explore: 0.5,
    farm: 1.3,
    cash: 1.0,
    build: 1.5,
    industry: 1.2,
    attack: 0.2,
    spell: 1.8,   // Shields!
    meditate: 1.3,
  },
  retaliating: {
    explore: 0.3,
    farm: 0.8,
    cash: 0.8,
    build: 0.8,
    industry: 1.2,
    attack: 2.5,
    spell: 1.5,
    meditate: 1.0,
  },
};

// ============================================
// TARGETING WEIGHTS
// How much each factor contributes to target selection
// ============================================

export const TARGETING_WEIGHTS = {
  // Base score for being the player (bots slightly prefer attacking player)
  playerBias: 15,

  // Points per attack received from this target (grudge system)
  grudgePerAttack: 20,

  // Points per spell received from this target
  grudgePerSpell: 15,

  // Bonus for targets in same era (no gate needed)
  sameEraBias: 10,

  // Bonus when attacker has >1.5x power advantage
  weakTargetBonus: 30,

  // Wealth multiplier for greedy archetypes (shadow_merchant, the_locust)
  wealthFactor: 5,  // multiplied by log10(gold)

  // Minimum power ratio to consider attacking (below this = score 0)
  minPowerRatio: 0.8,

  // Gang-up multiplier: Score for the current leader is multiplied by this
  // This encourages bots to gang up on whoever is winning
  leaderMultiplier: 2.0,
};

// ============================================
// BUILDING ALLOCATION BY DEFENSE FOCUS
// Higher defenseFocus = more defensive buildings
// Note: bldpop and blddef removed from game
// ============================================

export const BUILDING_PRIORITIES = {
  // Defensive-focused building ratios (defenseFocus > 0.5)
  defensive: {
    bldfood: 0.35,
    bldtrp: 0.25,
    bldcash: 0.2,
    bldwiz: 0.2,
  },
  // Offensive-focused building ratios (defenseFocus <= 0.5)
  offensive: {
    bldtrp: 0.35,
    bldwiz: 0.25,
    bldfood: 0.25,
    bldcash: 0.15,
  },
};

// ============================================
// GAME CONSTANTS
// ============================================

export const BOT_CONSTANTS = {
  // Number of bots per game
  botsPerGame: 4,

  // Rounds where bots are in 'developing' state
  developingRounds: 3,

  // Power ratio threshold for 'aggressive' state
  aggressivePowerRatio: 1.2,

  // Power ratio threshold for 'defensive' state (when dominated)
  defensivePowerRatio: 0.7,

  // Minimum wizards needed to cast spells
  minWizardsForSpells: 10,

  // Minimum runes needed to cast spells
  minRunesForSpells: 200,

  // Maximum turns per single action
  maxTurnsPerAction: 5,
};
