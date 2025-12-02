/**
 * Edict definitions for the draft/shop system
 * Edicts are one-time effects that trigger immediately when selected
 */

import type { Edict } from '../../types';

export const EDICTS: Edict[] = [
  // ============================================
  // COMMON EDICTS
  // ============================================
  {
    id: 'gold_cache',
    name: 'Gold Cache',
    description: 'Gain 50,000 gold',
    rarity: 'common',
    effect: { type: 'gold', value: 50000 },
  },
  {
    id: 'food_stores',
    name: 'Food Stores',
    description: 'Gain 10,000 food',
    rarity: 'common',
    effect: { type: 'food', value: 10000 },
  },
  {
    id: 'rune_cache',
    name: 'Rune Cache',
    description: 'Gain 500 runes',
    rarity: 'common',
    effect: { type: 'runes', value: 500 },
  },

  // ============================================
  // UNCOMMON EDICTS
  // ============================================
  {
    id: 'conscription',
    name: 'Conscription',
    description: 'Convert 10% peasants to infantry',
    rarity: 'uncommon',
    effect: { type: 'conscript', value: 0.10 },
  },
  {
    id: 'fertile_soil',
    name: 'Fertile Soil',
    description: 'Gain 200 free land',
    rarity: 'uncommon',
    effect: { type: 'land', value: 200 },
  },
  {
    id: 'healing_wave',
    name: 'Healing Wave',
    description: 'Restore health to 100%',
    rarity: 'uncommon',
    effect: { type: 'health', value: 100 },
  },

  // ============================================
  // RARE EDICTS
  // ============================================
  {
    id: 'plunder',
    name: 'Plunder',
    description: 'Steal 10% gold from richest bot',
    rarity: 'rare',
    effect: { type: 'steal_gold', value: 0.10 },
  },
  {
    id: 'mass_teleport',
    name: 'Mass Teleport',
    description: 'Gain 500 of each troop type',
    rarity: 'rare',
    effect: { type: 'troops', value: 500 },
  },

  // ============================================
  // LEGENDARY EDICTS
  // ============================================
  {
    id: 'era_skip',
    name: 'Era Skip',
    description: 'Advance to next era (bypasses cooldown)',
    rarity: 'legendary',
    effect: { type: 'advance_era', value: 1 },
  },
];
