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

  // ============================================
  // FROSTNFLAME HEROES
  // Inspired by the Frostnflame Promisance hero system
  // ============================================

  // WAR HEROES
  {
    id: 'matthias',
    name: 'Matthias the Warrior',
    description: '+25% attack power',
    rarity: 'rare',
    effect: { type: 'offense', modifier: 0.25 },
  },
  {
    id: 'cregga',
    name: 'Cregga Rose Eyes',
    description: '+25% defense power',
    rarity: 'rare',
    effect: { type: 'defense', modifier: 0.25 },
  },
  {
    id: 'mactalon',
    name: 'Mactalon the Spymaster',
    description: '-25% wizard ratio needed for spells',
    rarity: 'uncommon',
    effect: { type: 'spy_ratio', modifier: -0.25 },
  },

  // PEACE HEROES
  {
    id: 'grumm',
    name: 'Grumm the Farmer',
    description: '+50% food production',
    rarity: 'rare',
    effect: { type: 'food_production', modifier: 0.50 },
  },
  {
    id: 'methuselah',
    name: 'Methuselah the Wise',
    description: '+50% rune production',
    rarity: 'rare',
    effect: { type: 'rune_production', modifier: 0.50 },
  },
  {
    id: 'bella',
    name: 'Bella of Doublehomes',
    description: '3x more peasants per acre of land',
    rarity: 'uncommon',
    effect: { type: 'peasant_density', modifier: 3.0 },
  },

  // SPECIAL HEROES
  {
    id: 'brome',
    name: 'Brome the Healer',
    description: '+2 health restored per turn',
    rarity: 'rare',
    effect: { type: 'health_regen', modifier: 2 },
  },
  {
    id: 'martin',
    name: 'Martin the Warrior',
    description: 'Offense scales with attacks this round (+5% per attack)',
    rarity: 'legendary',
    effect: { type: 'dynamic_offense', modifier: 0.05 },
  },
  {
    id: 'perigord',
    name: 'Perigord the Protector',
    description: '-50% troop losses in combat',
    rarity: 'rare',
    effect: { type: 'casualty_reduction', modifier: 0.50 },
  },

  // ============================================
  // UNIT SPECIALIST ADVISORS
  // Trade-off: boost offense for 2 unit types, reduce defense for 2 others
  // ============================================
  {
    id: 'ground_commander',
    name: 'Ground Commander',
    description: '+1 offense (infantry/land), -2 defense (air/sea)',
    rarity: 'uncommon',
    effect: {
      type: 'unit_specialist',
      modifier: 0,
      boostUnits: ['trparm', 'trplnd'],
      nerfUnits: ['trpfly', 'trpsea'],
      offenseBonus: 1,
      defensePenalty: 2,
    },
  },
  {
    id: 'sky_marshal',
    name: 'Sky Marshal',
    description: '+1 offense (air/sea), -2 defense (infantry/land)',
    rarity: 'uncommon',
    effect: {
      type: 'unit_specialist',
      modifier: 0,
      boostUnits: ['trpfly', 'trpsea'],
      nerfUnits: ['trparm', 'trplnd'],
      offenseBonus: 1,
      defensePenalty: 2,
    },
  },
  {
    id: 'blitzkrieg_tactician',
    name: 'Blitzkrieg Tactician',
    description: '+1 offense (infantry/air), -2 defense (land/sea)',
    rarity: 'uncommon',
    effect: {
      type: 'unit_specialist',
      modifier: 0,
      boostUnits: ['trparm', 'trpfly'],
      nerfUnits: ['trplnd', 'trpsea'],
      offenseBonus: 1,
      defensePenalty: 2,
    },
  },
  {
    id: 'heavy_arms_dealer',
    name: 'Heavy Arms Dealer',
    description: '+1 offense (land/sea), -2 defense (infantry/air)',
    rarity: 'uncommon',
    effect: {
      type: 'unit_specialist',
      modifier: 0,
      boostUnits: ['trplnd', 'trpsea'],
      nerfUnits: ['trparm', 'trpfly'],
      offenseBonus: 1,
      defensePenalty: 2,
    },
  },
  {
    id: 'amphibious_admiral',
    name: 'Amphibious Admiral',
    description: '+1 offense (infantry/sea), -2 defense (land/air)',
    rarity: 'uncommon',
    effect: {
      type: 'unit_specialist',
      modifier: 0,
      boostUnits: ['trparm', 'trpsea'],
      nerfUnits: ['trplnd', 'trpfly'],
      offenseBonus: 1,
      defensePenalty: 2,
    },
  },
  {
    id: 'mechanized_general',
    name: 'Mechanized General',
    description: '+1 offense (land/air), -2 defense (infantry/sea)',
    rarity: 'uncommon',
    effect: {
      type: 'unit_specialist',
      modifier: 0,
      boostUnits: ['trplnd', 'trpfly'],
      nerfUnits: ['trparm', 'trpsea'],
      offenseBonus: 1,
      defensePenalty: 2,
    },
  },

  // ============================================
  // POLICY-STYLE ADVISORS (formerly Policies)
  // These provide special ability unlocks
  // ============================================
  {
    id: 'frontier_scout',
    name: 'Frontier Scout',
    description: '2x land gained from exploring',
    rarity: 'uncommon',
    effect: { type: 'double_explore', modifier: 1.0 },
  },
  {
    id: 'royal_banker',
    name: 'Royal Banker',
    description: '2x bank interest earned',
    rarity: 'uncommon',
    effect: { type: 'double_bank_interest', modifier: 1.0 },
  },
  {
    id: 'warmaster',
    name: 'Warmaster',
    description: 'Can attack twice per round',
    rarity: 'rare',
    effect: { type: 'extra_attacks', modifier: 1 },
  },
  {
    id: 'war_profiteer',
    name: 'War Profiteer',
    description: 'Troop production during farm action',
    rarity: 'rare',
    effect: { type: 'farm_industry', modifier: 1.0 },
  },
  {
    id: 'arcane_ward',
    name: 'Arcane Ward',
    description: 'Permanent magic shield',
    rarity: 'legendary',
    effect: { type: 'permanent_shield', modifier: 1 },
  },

  // ============================================
  // CROSS-MASTERY SYNERGY ADVISORS
  // Mastery in one area boosts effects in another
  // ============================================
  {
    id: 'fertile_frontier',
    name: 'Fertile Frontier',
    description: '+15% food per Exploration mastery level',
    rarity: 'common',
    effect: { type: 'mastery_scaling', modifier: 0.15, condition: 'explore_boosts_food' },
  },
  {
    id: 'trade_routes',
    name: 'Trade Routes',
    description: '+15% income per Exploration mastery level',
    rarity: 'common',
    effect: { type: 'mastery_scaling', modifier: 0.15, condition: 'explore_boosts_income' },
  },
  {
    id: 'mystic_forges',
    name: 'Mystic Forges',
    description: '+15% troop production per Mysticism mastery level',
    rarity: 'common',
    effect: { type: 'mastery_scaling', modifier: 0.15, condition: 'meditate_boosts_industry' },
  },
  {
    id: 'arcane_agriculture',
    name: 'Arcane Agriculture',
    description: '+15% food per Mysticism mastery level',
    rarity: 'common',
    effect: { type: 'mastery_scaling', modifier: 0.15, condition: 'meditate_boosts_food' },
  },
  {
    id: 'war_economist',
    name: 'War Economist',
    description: '+10% offense per Commerce mastery level',
    rarity: 'uncommon',
    effect: { type: 'mastery_scaling', modifier: 0.10, condition: 'cash_boosts_offense' },
  },
  {
    id: 'mercenary_captain',
    name: 'Mercenary Captain',
    description: '+15% troop production per Commerce mastery level',
    rarity: 'uncommon',
    effect: { type: 'mastery_scaling', modifier: 0.15, condition: 'cash_boosts_industry' },
  },
  {
    id: 'battle_mages',
    name: 'Battle Mages',
    description: '+10% spell power per Industry mastery level',
    rarity: 'uncommon',
    effect: { type: 'mastery_scaling', modifier: 0.10, condition: 'industry_boosts_magic' },
  },

  // ============================================
  // MULTI-MASTERY SYNERGY ADVISORS
  // Reward having multiple different masteries
  // ============================================
  {
    id: 'dabblers_luck',
    name: "Dabbler's Luck",
    description: '+10% all actions if 2+ unique masteries',
    rarity: 'common',
    effect: { type: 'multi_mastery_threshold', modifier: 0.10, condition: 'min_2_masteries' },
  },
  {
    id: 'polymath',
    name: 'Polymath',
    description: '+5% all actions per unique mastery owned',
    rarity: 'uncommon',
    effect: { type: 'multi_mastery_scaling', modifier: 0.05 },
  },
  {
    id: 'generalists_edge',
    name: "Generalist's Edge",
    description: '+25% offense/defense if 3+ unique masteries',
    rarity: 'rare',
    effect: { type: 'multi_mastery_threshold', modifier: 0.25, condition: 'min_3_masteries_combat' },
  },
  {
    id: 'jack_of_all_trades',
    name: 'Jack of All Trades',
    description: '+20% all actions if all 5 masteries owned',
    rarity: 'rare',
    effect: { type: 'multi_mastery_threshold', modifier: 0.20, condition: 'all_5_masteries' },
  },
];
