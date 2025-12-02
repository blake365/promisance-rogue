/**
 * Advisor definitions for the draft/shop system
 * Advisors provide permanent passive bonuses to the empire
 */

import type { Advisor } from '../../types';

export const ADVISORS: Advisor[] = [
  // ============================================
  // COMMON ADVISORS
  // ============================================
  {
    id: 'grain_merchant',
    name: 'Grain Merchant',
    description: '+10% food production',
    rarity: 'common',
    effect: { type: 'food_production', modifier: 0.10 },
  },
  {
    id: 'tax_collector',
    name: 'Tax Collector',
    description: '+10% gold income',
    rarity: 'common',
    effect: { type: 'income', modifier: 0.10 },
  },
  {
    id: 'drill_sergeant',
    name: 'Drill Sergeant',
    description: '+10% troop production',
    rarity: 'common',
    effect: { type: 'industry', modifier: 0.10 },
  },
  {
    id: 'land_surveyor',
    name: 'Land Surveyor',
    description: '+10% land from exploration',
    rarity: 'common',
    effect: { type: 'explore', modifier: 0.10 },
  },

  // ============================================
  // UNCOMMON ADVISORS
  // ============================================
  {
    id: 'war_council',
    name: 'War Council',
    description: '+15% attack power',
    rarity: 'uncommon',
    effect: { type: 'offense', modifier: 0.15 },
  },
  {
    id: 'stone_mason',
    name: 'Stone Mason',
    description: '-15% building costs',
    rarity: 'uncommon',
    effect: { type: 'build_cost', modifier: -0.15 },
  },
  {
    id: 'wizard_conclave',
    name: 'Wizard Conclave',
    description: '-20% spell rune costs',
    rarity: 'uncommon',
    effect: { type: 'spell_cost', modifier: -0.20 },
  },
  {
    id: 'market_insider',
    name: 'Market Insider',
    description: '+20% better market prices',
    rarity: 'uncommon',
    effect: { type: 'market_bonus', modifier: 0.20 },
  },

  // ============================================
  // RARE ADVISORS
  // ============================================
  {
    id: 'grand_general',
    name: 'Grand General',
    description: '+25% attack and defense',
    rarity: 'rare',
    effect: { type: 'military', modifier: 0.25 },
  },
  {
    id: 'archmage',
    name: 'Archmage',
    description: '+30% wizard power',
    rarity: 'rare',
    effect: { type: 'magic', modifier: 0.30 },
  },
  {
    id: 'royal_architect',
    name: 'Royal Architect',
    description: '+1 building per turn, -25% cost',
    rarity: 'rare',
    effect: { type: 'build_rate', modifier: 1, condition: 'per_turn' },
  },
  {
    id: 'grain_speculator',
    name: 'Grain Speculator',
    description: 'Sell food at 2x market rate',
    rarity: 'rare',
    effect: { type: 'food_sell', modifier: 2.0 },
  },

  // ============================================
  // LEGENDARY ADVISORS
  // ============================================
  {
    id: 'dragon_rider',
    name: 'Dragon Rider',
    description: '+50% aircraft offense, +25% all offense',
    rarity: 'legendary',
    effect: { type: 'aircraft_offense', modifier: 0.50, condition: 'plus_25_all' },
  },
  {
    id: 'time_weaver',
    name: 'Time Weaver',
    description: 'Permanent Gate effect (attack any era)',
    rarity: 'legendary',
    effect: { type: 'permanent_gate', modifier: 1 },
  },
  {
    id: 'empire_builder',
    name: 'Empire Builder',
    description: '+5 actions per round',
    rarity: 'legendary',
    effect: { type: 'extra_turns', modifier: 5 },
  },
];
