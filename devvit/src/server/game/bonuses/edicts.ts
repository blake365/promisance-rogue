/**
 * Edict definitions for the draft/shop system
 * Edicts are one-time effects that trigger immediately when selected
 * Inspired by Balatro's spectral cards - high-impact, strategic choices
 */

import type { Edict } from '../../types';

export const EDICTS: Edict[] = [
  // ============================================
  // COMMON EDICTS - Scaling resource gains
  // ============================================
  {
    id: 'windfall',
    name: 'Windfall',
    description: 'Gain 10% of your current gold',
    rarity: 'common',
    effect: { type: 'percent_gold', value: 0.10 },
  },
  {
    id: 'harvest_surplus',
    name: 'Harvest Surplus',
    description: 'Gain 25% of your current food',
    rarity: 'common',
    effect: { type: 'percent_food', value: 0.25 },
  },
  {
    id: 'land_grant',
    name: 'Land Grant',
    description: 'Gain 5% more land',
    rarity: 'common',
    effect: { type: 'percent_land', value: 0.05 },
  },
  {
    id: 'fresh_prospects',
    name: 'Fresh Prospects',
    description: 'Clear offered advisor history - all advisors available again',
    rarity: 'common',
    effect: { type: 'clear_offered', value: 1 },
  },

  // ============================================
  // UNCOMMON EDICTS - Tactical advantages
  // ============================================
  {
    id: 'overtime',
    name: 'Overtime',
    description: '+10 turns next round',
    rarity: 'uncommon',
    effect: { type: 'bonus_turns_next', value: 10 },
  },
  {
    id: 'pacification',
    name: 'Pacification',
    description: 'Bots will not attack you next round',
    rarity: 'uncommon',
    effect: { type: 'pacification', value: 1 },
  },
  {
    id: 'guaranteed_rare',
    name: 'Guaranteed Rare',
    description: 'Next draft will contain at least one rare+ advisor',
    rarity: 'uncommon',
    effect: { type: 'guaranteed_rare', value: 1 },
  },
  {
    id: 'second_chance',
    name: 'Second Chance',
    description: 'Previously offered advisors can appear again in drafts',
    rarity: 'uncommon',
    effect: { type: 'policy', value: 'second_chance' },
  },
  {
    id: 'healing_wave',
    name: 'Healing Wave',
    description: 'Restore health to 100%',
    rarity: 'uncommon',
    effect: { type: 'health', value: 100 },
  },

  // ============================================
  // RARE EDICTS - Powerful effects
  // ============================================
  {
    id: 'extra_draft_pick',
    name: 'Extra Draft Pick',
    description: 'Choose 2 options from the next draft instead of 1',
    rarity: 'rare',
    effect: { type: 'extra_draft_pick', value: 1 },
  },
  {
    id: 'divine_protection',
    name: 'Divine Protection',
    description: 'Immune to bot attacks for 2 rounds',
    rarity: 'rare',
    effect: { type: 'divine_protection', value: 2 },
  },
  {
    id: 'elite_corps',
    name: 'Elite Corps',
    description: '+50% to one random troop type, zero out all others',
    rarity: 'rare',
    effect: { type: 'elite_corps', value: 0.50 },
  },
  {
    id: 'full_intel',
    name: 'Full Intel',
    description: 'Permanently reveal all bot stats',
    rarity: 'rare',
    effect: { type: 'policy', value: 'full_intel' },
  },
  {
    id: 'advisor_council',
    name: 'Advisor Council',
    description: '+1 advisor slot (permanent)',
    rarity: 'rare',
    effect: { type: 'advisor_slot', value: 1 },
  },
  {
    id: 'expanded_network',
    name: 'Expanded Network',
    description: '+1 draft option every shop phase (permanent)',
    rarity: 'rare',
    effect: { type: 'bonus_draft_options', value: 1 },
  },

  // ============================================
  // LEGENDARY EDICTS - Game-changing effects
  // ============================================
  {
    id: 'efficiency_training',
    name: 'Efficiency Training',
    description: '+5 turns every round (permanent)',
    rarity: 'legendary',
    effect: { type: 'policy', value: 'efficiency_training' },
  },
  {
    id: 'advisor_mastery',
    name: 'Advisor Mastery',
    description: 'Double one random advisor\'s modifier, dismiss all others',
    rarity: 'legendary',
    effect: { type: 'advisor_mastery', value: 2.0 },
  },
  {
    id: 'era_skip',
    name: 'Era Skip',
    description: 'Advance to next era (bypasses cooldown)',
    rarity: 'legendary',
    effect: { type: 'advance_era', value: 1 },
  },
];
