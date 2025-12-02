/**
 * Policy definitions for the draft/shop system
 * Policies unlock special abilities and game mechanics
 */

import type { Policy } from '../../types';

export const POLICIES: Policy[] = [
  // ============================================
  // UNCOMMON POLICIES
  // ============================================
  {
    id: 'open_borders',
    name: 'Open Borders',
    description: 'Explore gains 2x land',
    rarity: 'uncommon',
    unlocks: 'double_explore',
  },
  {
    id: 'bank_charter',
    name: 'Bank Charter',
    description: 'Bank interest doubles',
    rarity: 'uncommon',
    unlocks: 'double_interest',
  },

  // ============================================
  // RARE POLICIES
  // ============================================
  {
    id: 'forced_march',
    name: 'Forced March',
    description: 'Can attack twice per round',
    rarity: 'rare',
    unlocks: 'double_attack',
  },
  {
    id: 'war_economy',
    name: 'War Economy',
    description: 'Troop production during farm action',
    rarity: 'rare',
    unlocks: 'farm_industry',
  },

  // ============================================
  // LEGENDARY POLICIES
  // ============================================
  {
    id: 'magical_immunity',
    name: 'Magical Immunity',
    description: 'Permanent shield effect',
    rarity: 'legendary',
    unlocks: 'permanent_shield',
  },
];
