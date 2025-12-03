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

import type { BotArchetype, BotPersonality, BotState, Race, Era, SpellType, TurnAction, IndustryAllocation } from '../../types';

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
    name: 'General Vask',
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
    name: 'The Grain Mother',
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
    name: 'Archon Nyx',
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
    name: 'Iron Baron',
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
    name: 'The Locust',
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
    name: 'Shadow Merchant',
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
    name: 'The Fortress',
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
};

// ============================================
// INDUSTRY PREFERENCES (Troop Production %)
// Base allocation for each archetype - will be varied by seed
// Must sum to 100
// ============================================

export const BOT_INDUSTRY_PREFERENCES: Record<BotArchetype, IndustryAllocation> = {
  /**
   * General Vask - All-in on ground war, armor + infantry
   */
  general_vask: {
    trparm: 55,   // Infantry backbone
    trplnd: 40,   // Heavy armor support
    trpfly: 5,    // Token air
    trpsea: 0,    // No navy
  },

  /**
   * Grain Mother - Pure militia, cheap bodies
   */
  grain_mother: {
    trparm: 90,   // Peasant militia horde
    trplnd: 10,   // Minimal support
    trpfly: 0,    // No air
    trpsea: 0,    // No navy
  },

  /**
   * Archon Nyx - Air superiority for spell support
   */
  archon_nyx: {
    trparm: 15,   // Light ground presence
    trplnd: 5,    // Almost no armor
    trpfly: 70,   // Air dominance for magical strikes
    trpsea: 10,   // Coastal scouts
  },

  /**
   * Iron Baron - Tank rush, pure armor doctrine
   */
  iron_baron: {
    trparm: 5,    // Skeleton crew infantry
    trplnd: 85,   // TANKS TANKS TANKS
    trpfly: 10,   // Air recon only
    trpsea: 0,    // No navy
  },

  /**
   * The Locust - Fast air raids, hit and run
   */
  the_locust: {
    trparm: 10,   // Light raiders
    trplnd: 15,   // Fast vehicles
    trpfly: 60,   // Air swarm
    trpsea: 15,   // Coastal harassment
  },

  /**
   * Shadow Merchant - Naval trade empire with mercenary escort
   */
  shadow_merchant: {
    trparm: 20,   // Hired guards
    trplnd: 10,   // Light escort
    trpfly: 15,   // Air cover
    trpsea: 55,   // Trade fleet dominance
  },

  /**
   * The Fortress - Infantry garrison with some armor
   */
  the_fortress: {
    trparm: 70,   // Garrison troops everywhere
    trplnd: 25,   // Defensive armor
    trpfly: 5,    // Patrol aircraft
    trpsea: 0,    // No navy - land fortress
  },
};

// How much the seed can vary each allocation (±percentage points)
export const INDUSTRY_VARIATION = 15;

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
