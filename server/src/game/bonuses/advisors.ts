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
    id: 'surplus_trader',
    name: 'Surplus Trader',
    description: 'Sell food at 1.25x market rate',
    rarity: 'common',
    effect: { type: 'food_sell', modifier: 1.25 },
  },
  {
    id: 'toll_keeper',
    name: 'Toll Keeper',
    description: 'Gain 5% of attacker\'s gold when attacked',
    rarity: 'common',
    effect: { type: 'toll_keeper', modifier: 0.05 },
  },
  {
    id: 'salvage_expert',
    name: 'Salvage Expert',
    description: 'Recover 10% of troops lost in combat',
    rarity: 'common',
    effect: { type: 'salvage', modifier: 0.10 },
  },
  {
    id: 'pioneer',
    name: 'Pioneer',
    description: 'Exploring grants +1 peasant per acre gained',
    rarity: 'common',
    effect: { type: 'pioneer', modifier: 1 },
  },
  {
    id: 'early_bird',
    name: 'Early Bird',
    description: '+20% effectiveness on first action each round',
    rarity: 'common',
    effect: { type: 'early_bird', modifier: 0.20 },
  },
  {
    id: 'underdog',
    name: 'Underdog',
    description: '+10% offense/defense when your networth is lowest',
    rarity: 'common',
    effect: { type: 'underdog', modifier: 0.10 },
  },
  {
    id: 'second_wind',
    name: 'Second Wind',
    description: '+1% all stats per 10 health missing',
    rarity: 'common',
    effect: { type: 'second_wind', modifier: 0.01 },
  },
  {
    id: 'peasant_champion',
    name: 'Peasant Champion',
    description: '+0.01% offense per peasant',
    rarity: 'common',
    effect: { type: 'peasant_champion', modifier: 0.0001 },
  },
  {
    id: 'war_bonds',
    name: 'War Bonds',
    description: '+2% bank interest rate',
    rarity: 'common',
    effect: { type: 'bank_interest', modifier: 0.02 },
  },
  {
    id: 'grudge_keeper',
    name: 'Grudge Keeper',
    description: '+10% offense against empires that attacked you',
    rarity: 'common',
    effect: { type: 'grudge_keeper', modifier: 0.10 },
  },

  // ============================================
  // SPELL-BOOSTING ADVISORS (Common/Uncommon)
  // ============================================
  {
    id: 'conjurers_apprentice',
    name: "Conjurer's Apprentice",
    description: '+20% gold and food from spells',
    rarity: 'common',
    effect: { type: 'conjure_boost', modifier: 0.20 },
  },
  {
    id: 'gold_alchemist',
    name: 'Gold Alchemist',
    description: '+40% gold from cash spell',
    rarity: 'uncommon',
    effect: { type: 'cash_spell', modifier: 0.40 },
  },
  {
    id: 'harvest_mage',
    name: 'Harvest Mage',
    description: '+40% food from food spell',
    rarity: 'uncommon',
    effect: { type: 'food_spell', modifier: 0.40 },
  },
  {
    id: 'shadow_siphon',
    name: 'Shadow Siphon',
    description: '+40% gold stolen from steal spell',
    rarity: 'uncommon',
    effect: { type: 'steal_spell', modifier: 0.40 },
  },
  {
    id: 'arcane_duelist',
    name: 'Arcane Duelist',
    description: '+30% land gained from fight spell',
    rarity: 'uncommon',
    effect: { type: 'fight_spell', modifier: 0.30 },
  },

  // ============================================
  // WIZARD TRADEOFF ADVISORS
  // ============================================
  {
    id: 'blood_mage',
    name: 'Blood Mage',
    description: '+75% magic power, but spells cost 5 health',
    rarity: 'rare',
    effect: { type: 'blood_mage', modifier: 0.75 },
  },
  {
    id: 'wild_channeler',
    name: 'Wild Channeler',
    description: '2x spell effects, but 25% chance to fizzle',
    rarity: 'rare',
    effect: { type: 'wild_channeler', modifier: 2.0 },
  },
  {
    id: 'peaceful_channeler',
    name: 'Peaceful Channeler',
    description: '+60% production spell output, cannot cast offensive spells',
    rarity: 'uncommon',
    effect: { type: 'peaceful_channeler', modifier: 0.60 },
  },
  {
    id: 'destruction_mage',
    name: 'Destruction Mage',
    description: '+40% offensive spell power, cannot cast production spells',
    rarity: 'uncommon',
    effect: { type: 'destruction_mage', modifier: 0.40 },
  },

  // ============================================
  // TROOP PRODUCTION ADVISORS
  // ============================================
  {
    id: 'drill_sergeant',
    name: 'Drill Sergeant',
    description: '+50% troop production',
    rarity: 'rare',
    effect: { type: 'troop_production', modifier: 0.50 },
  },
  {
    id: 'quartermaster',
    name: 'Quartermaster',
    description: '+25% troop production',
    rarity: 'uncommon',
    effect: { type: 'troop_production', modifier: 0.25 },
  },
  {
    id: 'infantry_recruiter',
    name: 'Infantry Recruiter',
    description: '+40% infantry production',
    rarity: 'common',
    effect: { type: 'unit_production', modifier: 0.40, condition: 'trparm' },
  },
  {
    id: 'cavalry_master',
    name: 'Cavalry Master',
    description: '+40% land unit production',
    rarity: 'common',
    effect: { type: 'unit_production', modifier: 0.40, condition: 'trplnd' },
  },
  {
    id: 'flight_school',
    name: 'Flight School',
    description: '+40% aircraft production',
    rarity: 'common',
    effect: { type: 'unit_production', modifier: 0.40, condition: 'trpfly' },
  },
  {
    id: 'naval_academy',
    name: 'Naval Academy',
    description: '+40% naval production',
    rarity: 'common',
    effect: { type: 'unit_production', modifier: 0.40, condition: 'trpsea' },
  },

  // ============================================
  // EXCHANGE/ECONOMY ADVISORS
  // ============================================
  {
    id: 'trade_network',
    name: 'Trade Network',
    description: '+50% exchange effectiveness',
    rarity: 'uncommon',
    effect: { type: 'exchange_boost', modifier: 0.50 },
  },
  {
    id: 'tax_collector',
    name: 'Tax Collector',
    description: '+25% income',
    rarity: 'uncommon',
    effect: { type: 'income_boost', modifier: 0.25 },
  },
  {
    id: 'treasury_master',
    name: 'Treasury Master',
    description: '+50% income',
    rarity: 'rare',
    effect: { type: 'income_boost', modifier: 0.50 },
  },
  {
    id: 'market_master',
    name: 'Market Master',
    description: '+50% market building income',
    rarity: 'uncommon',
    effect: { type: 'market_boost', modifier: 0.50 },
  },
  {
    id: 'lenient_collector',
    name: 'Lenient Collector',
    description: 'Peasants ignore tax rate effects',
    rarity: 'common',
    effect: { type: 'lenient_taxes', modifier: 1 },
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
  {
    id: 'debt_eraser',
    name: 'Debt Eraser',
    description: 'Loan interest reduced to 0.01%',
    rarity: 'legendary',
    effect: { type: 'zero_interest', modifier: 0.0001 },
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
    id: 'farm_profiteer',
    name: 'Farm Profiteer',
    description: '+25% troop production during farm turns',
    rarity: 'uncommon',
    effect: { type: 'farm_industry_boost', modifier: 0.25 },
  },
  {
    id: 'trade_profiteer',
    name: 'Trade Profiteer',
    description: '+25% troop production during cash turns',
    rarity: 'uncommon',
    effect: { type: 'cash_industry_boost', modifier: 0.25 },
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

  // ============================================
  // PACIFIST / WARMONGER ADVISORS
  // Trade-offs for different playstyles
  // ============================================
  {
    id: 'pacifist',
    name: 'Pacifist Council',
    description: '+10 turns per round, but cannot attack',
    rarity: 'legendary',
    effect: { type: 'pacifist', modifier: 10 },
  },
  {
    id: 'warmonger',
    name: 'Warmonger',
    description: '+2 additional attacks per round',
    rarity: 'rare',
    effect: { type: 'extra_attacks', modifier: 2 },
  },

  // ============================================
  // COMBAT SUPPORT ADVISORS
  // ============================================
  {
    id: 'battle_surgeon',
    name: 'Battle Surgeon',
    description: '-50% health cost from attacks',
    rarity: 'uncommon',
    effect: { type: 'attack_health_reduction', modifier: 0.50 },
  },

  // ============================================
  // BUILDING SPECIALISTS
  // ============================================
  {
    id: 'master_builder',
    name: 'Master Builder',
    description: '+2 buildings per turn, -20% cost',
    rarity: 'rare',
    effect: { type: 'build_rate', modifier: 2, condition: 'per_turn_with_discount' },
  },

  // ============================================
  // EXPANSION ADVISORS
  // ============================================
  {
    id: 'expansionist',
    name: 'Expansionist',
    description: '3x explore land, but bots target you more',
    rarity: 'uncommon',
    effect: { type: 'expansionist', modifier: 3.0 },
  },

  // ============================================
  // BUILDING-BASED DEFENSE ADVISORS (Common)
  // Bonus defense based on specific building types
  // ============================================
  {
    id: 'market_guards',
    name: 'Market Guards',
    description: '+0.1% defense per market',
    rarity: 'common',
    effect: { type: 'building_defense', modifier: 0.001, condition: 'bldcash' },
  },
  {
    id: 'barracks_sentries',
    name: 'Barracks Sentries',
    description: '+0.1% defense per barracks',
    rarity: 'common',
    effect: { type: 'building_defense', modifier: 0.001, condition: 'bldtrp' },
  },
  {
    id: 'farm_militia',
    name: 'Farm Militia',
    description: '+0.1% defense per farm',
    rarity: 'common',
    effect: { type: 'building_defense', modifier: 0.001, condition: 'bldfood' },
  },
  {
    id: 'tower_wardens',
    name: 'Tower Wardens',
    description: '+0.1% defense per wizard tower',
    rarity: 'common',
    effect: { type: 'building_defense', modifier: 0.001, condition: 'bldwiz' },
  },
  {
    id: 'exchange_protectors',
    name: 'Exchange Protectors',
    description: '+0.1% defense per exchange',
    rarity: 'common',
    effect: { type: 'building_defense', modifier: 0.001, condition: 'bldcost' },
  },

  // ============================================
  // BUILDING-BASED OFFENSE ADVISORS (Common)
  // Bonus offense based on specific building types
  // ============================================
  {
    id: 'market_raiders',
    name: 'Market Raiders',
    description: '+0.1% offense per market',
    rarity: 'common',
    effect: { type: 'building_offense', modifier: 0.001, condition: 'bldcash' },
  },
  {
    id: 'barracks_veterans',
    name: 'Barracks Veterans',
    description: '+0.1% offense per barracks',
    rarity: 'common',
    effect: { type: 'building_offense', modifier: 0.001, condition: 'bldtrp' },
  },
  {
    id: 'farm_levies',
    name: 'Farm Levies',
    description: '+0.1% offense per farm',
    rarity: 'common',
    effect: { type: 'building_offense', modifier: 0.001, condition: 'bldfood' },
  },
  {
    id: 'tower_battlemages',
    name: 'Tower Battlemages',
    description: '+0.1% offense per wizard tower',
    rarity: 'common',
    effect: { type: 'building_offense', modifier: 0.001, condition: 'bldwiz' },
  },
  {
    id: 'exchange_mercenaries',
    name: 'Exchange Mercenaries',
    description: '+0.1% offense per exchange',
    rarity: 'common',
    effect: { type: 'building_offense', modifier: 0.001, condition: 'bldcost' },
  },
];
