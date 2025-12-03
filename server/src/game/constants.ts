import type { Era, Race, Buildings, Troops, IndustryAllocation } from '../types';

// ============================================
// STARTING VALUES
// ============================================

export const STARTING_LAND = 2000;
export const STARTING_PEASANTS = 500;
export const STARTING_HEALTH = 100;
export const STARTING_TAX_RATE = 35;
export const STARTING_GOLD = 50000;
export const STARTING_FOOD = 10000;
export const STARTING_RUNES = 500;

export const STARTING_BUILDINGS: Buildings = {
  bldpop: 0,        // Homes (removed - population tied to land)
  bldcash: 50,      // Markets/income buildings
  bldtrp: 50,       // Barracks
  bldcost: 25,      // Exchanges (better market prices & reduce expenses)
  bldfood: 100,     // Farms
  bldwiz: 25,       // Wizard towers
  blddef: 0,        // Defense towers (removed)
};

export const STARTING_TROOPS: Troops = {
  trparm: 100,      // Infantry/soldiers
  trplnd: 20,       // Land units/vehicles
  trpfly: 10,       // Air units
  trpsea: 5,        // Sea units
  trpwiz: 10,       // Wizards
};

export const STARTING_INDUSTRY: IndustryAllocation = {
  trparm: 50,
  trplnd: 30,
  trpfly: 15,
  trpsea: 5,
};

// ============================================
// GAME STRUCTURE
// ============================================

export const TOTAL_ROUNDS = 10;
export const TURNS_PER_ROUND = 50;
export const BOTS_PER_GAME = 4;

// ============================================
// RACE MODIFIERS (from QM Promisance)
// These are percentage modifiers applied to base values
// ============================================

export interface RaceModifiers {
  offense: number;
  defense: number;
  building: number;
  expenses: number;   // Military upkeep reduction
  magic: number;
  industry: number;
  income: number;
  explore: number;
  market: number;     // Market price bonus
  foodpro: number;    // Food production (agriculture)
  foodcon: number;    // Food consumption reduction
  runepro: number;    // Rune production (energy)
}

// Values from QM Promisance 4.81 races (prom_race.php)
// All positive values = beneficial effect
export const RACE_MODIFIERS: Record<Race, RaceModifiers> = {
  human: {
    offense: 0,
    defense: 0,
    building: 0,
    expenses: 0,
    magic: 0,
    industry: 0,
    income: 0,
    explore: 0,
    market: 0,
    foodpro: 0,
    foodcon: 0,
    runepro: 0,
  },
  elf: {
    offense: -14,
    defense: -2,
    building: -10,
    expenses: 0,
    magic: 18,
    industry: -12,
    income: 2,
    explore: 12,
    market: 0,
    foodpro: -6,
    foodcon: 0,
    runepro: 12,
  },
  dwarf: {
    offense: 6,
    defense: 16,
    building: 16,
    expenses: -8,
    magic: -16,
    industry: 12,
    income: 0,
    explore: -18,
    market: -8,
    foodpro: 0,
    foodcon: 0,
    runepro: 0,
  },
  troll: {
    offense: 24,
    defense: -10,
    building: 8,
    expenses: 0,
    magic: -12,
    industry: 0,
    income: 4,
    explore: 14,
    market: -12,
    foodpro: -8,
    foodcon: 0,
    runepro: -8,
  },
  gnome: {
    offense: -16,
    defense: 10,
    building: 0,
    expenses: 6,
    magic: 0,
    industry: -10,
    income: 10,
    explore: -12,
    market: 24,
    foodpro: 0,
    foodcon: 0,
    runepro: -12,
  },
  gremlin: {
    offense: 10,
    defense: -6,
    building: 0,
    expenses: 0,
    magic: -10,
    industry: -14,
    income: -20,
    explore: 0,
    market: 8,
    foodpro: 18,
    foodcon: 14,
    runepro: 0,
  },
  orc: {
    offense: 16,
    defense: 0,
    building: 4,
    expenses: -14,
    magic: -4,
    industry: 8,
    income: 0,
    explore: 22,
    market: 0,
    foodpro: -8,
    foodcon: -10,
    runepro: -14,
  },
  drow: {
    offense: 14,
    defense: 6,
    building: -12,
    expenses: -10,
    magic: 18,
    industry: 0,
    income: 0,
    explore: -16,
    market: 0,
    foodpro: -6,
    foodcon: 0,
    runepro: 6,
  },
  goblin: {
    offense: -18,
    defense: -16,
    building: 0,
    expenses: 18,
    magic: 0,
    industry: 14,
    income: 0,
    explore: 0,
    market: -6,
    foodpro: 0,
    foodcon: 8,
    runepro: 0,
  },
};

// ============================================
// ERA MODIFIERS
// ============================================

export interface EraModifiers {
  economy: number;        // Affects per capita income of citizens
  foodProduction: number; // Affects farm productivity
  industry: number;       // Affects ability to produce military units
  energy: number;         // Rate at which wizards produce mana (runes)
  explore: number;        // How much land gained per explore turn
}

export const ERA_MODIFIERS: Record<Era, EraModifiers> = {
  past: {
    economy: -5,
    foodProduction: -5,
    industry: -10,
    energy: 20,
    explore: 0,
  },
  present: {
    economy: 0,
    foodProduction: 15,
    industry: 5,
    energy: 0,
    explore: 20,
  },
  future: {
    economy: 15,
    foodProduction: -5,
    industry: 15,
    energy: -20,
    explore: 40,
  },
};

// ============================================
// UNIT COMBAT STATS [offense, defense]
// From QM Promisance era definitions
// ============================================

export type UnitType = 'trparm' | 'trplnd' | 'trpfly' | 'trpsea';

export const UNIT_STATS: Record<Era, Record<UnitType, [number, number]>> = {
  past: {
    trparm: [1, 2],
    trplnd: [3, 2],
    trpfly: [7, 5],
    trpsea: [7, 6],
  },
  present: {
    trparm: [2, 1],
    trplnd: [2, 6],
    trpfly: [5, 3],
    trpsea: [6, 8],
  },
  future: {
    trparm: [1, 2],
    trplnd: [5, 2],
    trpfly: [6, 3],
    trpsea: [7, 7],
  },
};

// Wizard power (same across eras)
export const WIZARD_POWER = 3;

// ============================================
// UNIT COSTS & UPKEEP (from config.php)
// ============================================

export const PVTM_TRPARM = 500;   // Base market cost for infantry
export const PVTM_TRPLND = 1000;  // Base market cost for land units
export const PVTM_TRPFLY = 2000;  // Base market cost for air units
export const PVTM_TRPSEA = 3000;  // Base market cost for sea units
export const PVTM_FOOD = 30;      // Base market cost for food

export interface UnitCosts {
  buyPrice: number;
  upkeep: number;
}

// Upkeep values from prom_empire.php calcFinances()
export const UNIT_COSTS: Record<keyof Troops, UnitCosts> = {
  trparm: { buyPrice: PVTM_TRPARM, upkeep: 1 },
  trplnd: { buyPrice: PVTM_TRPLND, upkeep: 2.5 },
  trpfly: { buyPrice: PVTM_TRPFLY, upkeep: 4 },
  trpsea: { buyPrice: PVTM_TRPSEA, upkeep: 7 },
  trpwiz: { buyPrice: 0, upkeep: 0.5 },
};

// ============================================
// ECONOMY (from prom_empire.php)
// ============================================

export const ECONOMY = {
  // Per capita income base (from calcPCI)
  pciBase: 25,

  // Land upkeep per acre (from calcFinances: e_land * 8)
  landUpkeep: 8,

  // Building income (from calcFinances: e_bldcash * 500)
  cashBuildingIncome: 500,

  // Food production per free land (from calcProvisions)
  foodPerFreeland: 10,

  // Food production per farm (from calcProvisions: e_bldfood * 85)
  foodPerFarm: 85,

  // Food consumption rates per unit (from calcProvisions)
  foodConsumption: {
    peasant: 0.01,
    trparm: 0.05,
    trplnd: 0.03,
    trpfly: 0.02,
    trpsea: 0.01,
    trpwiz: 0.25,
  },

  // Starvation desertion rate
  starvationDesertion: 0.03,

  // Bank rates (from config.php)
  savingsRate: 0.04,   // 4% per round (BANK_SAVERATE)
  loanRate: 0.075,     // 7.5% per round (BANK_LOANRATE)

  // Health
  healthRegenPerTurn: 1,
  minHealthToAct: 20,

  // Building cost: BUILD_COST + (land * 0.05) - reduced from original
  buildingBaseCost: 1500,
  buildingLandMultiplier: 0.05,

  // Population capacity - tied to land (since houses were removed)
  populationBaseCapacity: 100,
  populationPerLand: 0.5,  // 0.5 peasants per acre = 1000 max peasants at 2000 land

  // Industry multiplier (from config.php)
  industryMult: 2.5,

  // Demolish refund: percentage of building cost returned when demolishing
  demolishRefundPercent: 0.30,
};

// ============================================
// COMBAT (from military.php)
// ============================================

export const COMBAT = {
  winThreshold: 1.05,      // Attacker needs 5% more power to win
  turnsPerAttack: 2,
  attackHealthCost: 5,     // Health lost per attack (net -3 after turn regen)
  standardAttackHealthBonus: 1, // Additional health cost for standard attacks
  standardAttackLandBonus: 0.15, // 15% more land gained from standard attacks
  offensiveSpellHealthCost: 5, // Health lost per offensive spell (net -3 after turn regen)
  attacksPerRound: 10,     // Max attacks per round (no attacks allowed in round 1)
  offensiveSpellsPerRound: 10, // Max offensive spells per round (no offensive spells in round 1)

  // Standard attack loss rates per unit type [attacker, defender]
  // From military.php lines 162-165
  standardLossRates: {
    trparm: [0.1455, 0.0805],
    trplnd: [0.1285, 0.0730],
    trpfly: [0.0788, 0.0675],
    trpsea: [0.0650, 0.0555],
  } as Record<UnitType, [number, number]>,

  // Surprise attack multiplier
  surpriseAttackerPenalty: 1.2,

  // Single-unit attack loss rates
  singleUnitLossRates: {
    trparm: [0.1155, 0.0705],
    trplnd: [0.0985, 0.0530],
    trpfly: [0.0688, 0.0445],
    trpsea: [0.0450, 0.0355],
  } as Record<UnitType, [number, number]>,

  // Building destruction on victory [lossPercent, gainPercent]
  // From military.php destroyBuildings calls
  // Note: bldpop and blddef removed from game
  buildingCapture: {
    bldcash: [0.07, 0.70],
    bldtrp: [0.07, 0.50],
    bldcost: [0.07, 0.70],
    bldfood: [0.07, 0.30],
    bldwiz: [0.07, 0.60],
    freeland: [0.10, 0.00], // Free land destroyed but not gained as buildings
  } as Record<string, [number, number]>,

  // Tower defense - REMOVED (blddef no longer used)
  // towerDefensePerBuilding: 450,
  // soldiersPerTower: 150,
};

// ============================================
// SPELLS (from /spells/*.php)
// ============================================

export const SPELLS = {
  // Turns per spell cast (from spell files: turns_enemy/turns_self)
  turnsPerSpell: 2,

  // Base cost formula: (land * 0.1 + 100 + bldwiz * 0.2) from prom_spell.php
  baseCostLandMultiplier: 0.1,
  baseCostBase: 100,
  baseCostWizMultiplier: 0.2,

  // Cost multipliers from each spell file
  costs: {
    shield: 4.9,
    food: 17,
    cash: 15,
    runes: 12,
    blast: 2.5,
    steal: 25.75,
    storm: 7.25,    // From storm.php line 15
    struct: 18.0,   // From struct.php line 15
    advance: 47.5,
    regress: 20,
    gate: 20,
    spy: 1.0,       // From spy.php line 15 - cheap spell
    fight: 22.5,    // From fight.php line 15 - expensive wizard battle
  } as Record<string, number>,

  // Power thresholds for enemy spells (from spell files)
  thresholds: {
    blast: 1.15,    // From blast.php line 27
    steal: 1.75,    // From steal.php line 27
    storm: 1.21,    // From storm.php line 27
    struct: 1.70,   // From struct.php line 38
    spy: 1.0,       // From spy.php line 27 - very easy
    fight: 2.2,     // From fight.php line 50 - hard
  } as Record<string, number>,

  // Storm spell damage (from storm.php)
  stormDamage: {
    normal: { food: 0.0912, cash: 0.1266 },     // Lines 40-41
    shielded: { food: 0.0304, cash: 0.0422 },   // Lines 31-32
  },

  // Struct spell damage (from struct.php)
  structDamage: {
    normal: 0.03,     // Line 67
    shielded: 0.01,   // Line 43
    minBuildingRatio: 100,  // Buildings must be >= land/100 to be destroyed
    defTowerMinRatio: 150,  // Defense towers have different threshold
  },

  // Blast spell damage (from blast.php)
  blastDamage: {
    normal: 0.03,     // 3% troops destroyed
    shielded: 0.01,   // 1% troops destroyed
  },

  // Steal spell damage (from steal.php)
  stealDamage: {
    normal: { min: 0.10, max: 0.15 },     // 10-15% gold stolen
    shielded: { min: 0.03, max: 0.05 },   // 3-5% gold stolen
  },

  // Effect durations
  shieldDurationMs: 12 * 60 * 60 * 1000,  // 12 hours
  gateDurationMs: 6 * 60 * 60 * 1000,     // 6 hours

  // Wizard loss on failure (1-5%)
  failureLossMin: 0.01,
  failureLossMax: 0.05,
};

// ============================================
// SHOP / DRAFT
// ============================================

export const SHOP = {
  // Draft composition: 1-2 advisors + 2-3 other options = ~4 total
  advisorOptionsMin: 1,
  advisorOptionsMax: 2,
  otherOptionsMin: 2,
  otherOptionsMax: 3,

  maxAdvisors: 3, // Maximum number of advisors an empire can have

  // Reroll system - cost locked when shop phase starts to prevent gaming
  rerollCostPercent: 0.20, // 20% of networth, paid in gold
  maxRerolls: 2, // Maximum paid rerolls per shop phase

  rarityWeights: {
    common: 60,
    uncommon: 25,
    rare: 12,
    legendary: 3,
  },

  // Base market prices (shop phase - better deals than player phase private market)
  // Player phase: food buy $30/sell $6, troops buy 1.0x/sell 0.32-0.38x
  // Shop phase: cheaper to buy, more when selling
  baseMarketPrices: {
    foodBuyPrice: 20,        // cheaper than player phase ($30)
    foodSellPrice: 15,       // better than player phase ($6)
    troopBuyMultiplier: 0.7, // 30% discount vs player phase (1.0x)
    troopSellMultiplier: 0.5,// better than player phase (~0.32-0.38x)
    runeBuyPrice: 150,
    runeSellPrice: 120,
  },

  // Price fluctuation range
  priceFluctuation: 0.2,
};

// Note: BOT_PERSONALITIES have been moved to game/bot/definitions.ts

// ============================================
// NETWORTH CALCULATION (from prom_empire.php getNetworth())
// ============================================

export const NETWORTH = {
  // Troop values relative to trparm (from getNetworth)
  troopValues: {
    trparm: 1,
    trplnd: PVTM_TRPLND / PVTM_TRPARM,  // 2
    trpfly: PVTM_TRPFLY / PVTM_TRPARM,  // 4
    trpsea: PVTM_TRPSEA / PVTM_TRPARM,  // 6
    trpwiz: 2,
  },
  peasantValue: 3,
  landValue: 500,
  freeLandValue: 100,
  // Cash formula: (cash + bank/2 - loan*2) / (5 * PVTM_TRPARM)
  cashDivisor: 5 * PVTM_TRPARM,
  // Food formula: food / log10(food) * (PVTM_FOOD / PVTM_TRPARM)
  foodMultiplier: PVTM_FOOD / PVTM_TRPARM,
};
