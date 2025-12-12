// Game calculations - ported from CLI components
import type { Empire, Race } from '@/types';

/**
 * Race building modifiers (from server constants)
 * Positive = cheaper buildings (divides cost)
 */
const RACE_BUILDING_MODIFIERS: Record<Race, number> = {
  human: 0,
  elf: -10,
  dwarf: 16,
  troll: 8,
  gnome: 0,
  gremlin: 0,
  orc: 4,
  drow: -12,
  goblin: 0,
};

/**
 * Calculate the building modifier for an empire (race + advisors)
 * Higher modifier = cheaper buildings (cost is divided by this)
 */
export function getBuildingModifier(empire: Empire): number {
  const raceModifier = RACE_BUILDING_MODIFIERS[empire.race] ?? 0;

  // Check for advisor bonuses that affect building costs
  // build_cost effect type: negative modifier = cost reduction
  let advisorBonus = 0;
  for (const advisor of empire.advisors) {
    if (advisor.effect.type === 'build_cost') {
      // build_cost is inverted: -15% cost reduction means +15% building modifier
      advisorBonus -= advisor.effect.modifier;
    }
  }

  return 1.0 + raceModifier / 100 + advisorBonus;
}

/**
 * Calculate advisor cost multiplier from build_rate advisors
 * Lower multiplier = cheaper buildings
 */
export function getAdvisorCostMultiplier(empire: Empire): number {
  let costMultiplier = 1.0;

  for (const advisor of empire.advisors) {
    if (advisor.effect.type === 'build_rate') {
      if (advisor.effect.condition === 'per_turn_with_discount') {
        costMultiplier *= 0.80; // 20% discount per master_builder
      } else if (advisor.effect.condition === 'per_turn') {
        costMultiplier *= 0.75; // 25% discount for royal_architect
      }
    }
  }

  return costMultiplier;
}

/**
 * Calculate base building cost (before modifiers)
 * Formula: 1500 + (land × 0.05)
 */
export function getBaseBuildingCost(land: number): number {
  return 1500 + land * 0.05;
}

/**
 * Calculate actual building cost for an empire (with all modifiers)
 */
export function getBuildingCost(land: number, empire?: Empire): number {
  const baseCost = getBaseBuildingCost(land);

  if (!empire) {
    // Fallback for cases where empire isn't available
    return Math.floor(baseCost);
  }

  const buildingModifier = getBuildingModifier(empire);
  const costMultiplier = getAdvisorCostMultiplier(empire);

  // Server formula: Math.round((baseCost * costMultiplier) / buildingModifier)
  return Math.round((baseCost * costMultiplier) / buildingModifier);
}

/**
 * Calculate demolish refund (30% of base building cost)
 */
export function getDemolishRefund(land: number): number {
  const baseCost = getBaseBuildingCost(land);
  return Math.floor(baseCost * 0.3);
}

/**
 * Tech bonus percentages per action
 */
export const TECH_BONUS: Record<string, number> = {
  farm: 15,
  cash: 15,
  explore: 20,
  industry: 15,
  meditate: 15,
};

/**
 * Get tech bonus multiplier for an action
 * @returns Multiplier (e.g., 1.15 for 15% bonus at level 1)
 */
export function getTechBonus(empire: Empire, action: string): number {
  const level = empire.techs[action] ?? 0;
  const bonusPerLevel = TECH_BONUS[action] ?? 0;
  return 1 + (level * bonusPerLevel) / 100;
}

/**
 * Estimate land gain from exploration (base value)
 * Actual calculation is more complex on server
 */
export function estimateLandGain(empire: Empire): number {
  const baseLand = 10;
  const techMultiplier = getTechBonus(empire, 'explore');
  // Simplified - server has more complex calculation
  return Math.floor(baseLand * techMultiplier);
}

/**
 * Get display label for action with tech bonus info
 */
export function getActionLabel(empire: Empire, action: string): string {
  const level = empire.techs[action] ?? 0;
  if (level > 0) {
    const bonus = level * (TECH_BONUS[action] ?? 0);
    return `+${bonus}% from mastery`;
  }
  return '';
}

/**
 * Calculate max troops buyable with current gold
 */
export function getMaxBuyable(gold: number, price: number): number {
  return Math.floor(gold / price);
}

/**
 * Calculate max troops sellable (50% limit)
 */
export function getMaxSellable(amount: number): number {
  return Math.floor(amount / 2);
}

/**
 * Base troop prices
 */
export const TROOP_BASE_PRICES = {
  trparm: 500,
  trplnd: 1000,
  trpfly: 2000,
  trpsea: 3000,
} as const;

/**
 * Building names for display
 */
export const BUILDING_NAMES: Record<string, string> = {
  bldpop: 'Markets',
  bldcash: 'Enterprises',
  bldtrp: 'Barracks',
  bldcost: 'Exchanges',
  bldfood: 'Farms',
  bldwiz: 'Wizard Towers',
  blddef: 'Guard Towers',
};

/**
 * Troop names for display
 */
export const TROOP_NAMES: Record<string, string> = {
  trparm: 'Infantry',
  trplnd: 'Cavalry',
  trpfly: 'Aircraft',
  trpsea: 'Navy',
  trpwiz: 'Wizards',
};

/**
 * Short troop names
 */
export const TROOP_SHORT_NAMES: Record<string, string> = {
  trparm: 'Inf',
  trplnd: 'Cav',
  trpfly: 'Air',
  trpsea: 'Sea',
  trpwiz: 'Wiz',
};

/**
 * Spell names for display
 */
export const SPELL_NAMES: Record<string, string> = {
  shield: 'Magic Shield',
  food: 'Cornucopia',
  cash: 'Gold Transmutation',
  runes: 'Mana Focus',
  gate: 'Time Gate',
  advance: 'Advance Era',
  regress: 'Regress Era',
  spy: 'Spy',
  blast: 'Fireball',
  storm: 'Lightning Storm',
  struct: 'Earthquake',
  steal: 'Gold Theft',
  fight: 'Magical Assault',
};

/**
 * Era display colors (Tailwind classes)
 */
export const ERA_COLORS: Record<string, string> = {
  past: 'era-past',
  present: 'era-present',
  future: 'era-future',
};

/**
 * Rarity display colors (Tailwind classes)
 */
export const RARITY_COLORS: Record<string, string> = {
  common: 'rarity-common',
  uncommon: 'rarity-uncommon',
  rare: 'rarity-rare',
  legendary: 'rarity-legendary',
};

/**
 * Check if player can attack a bot (era matching)
 */
export function canAttackBot(
  playerEra: string,
  botEra: string,
  hasGate: boolean
): boolean {
  if (hasGate) return true;
  return playerEra === botEra;
}

/**
 * Race bonuses table (percentages)
 */
export const RACE_BONUSES: Record<string, Record<string, number>> = {
  human: {},
  elf: {
    offense: -14,
    defense: -2,
    buildCost: -10,
    magic: 18,
    industry: -12,
    income: 2,
    explore: 12,
    foodProd: -6,
    runes: 12,
  },
  dwarf: {
    offense: 6,
    defense: 16,
    buildCost: 16,
    expenses: -8,
    magic: -16,
    industry: 12,
    explore: -18,
    market: -8,
  },
  troll: {
    offense: 24,
    defense: -10,
    buildCost: 8,
    magic: -12,
    income: 4,
    explore: 14,
    market: -12,
    foodProd: -8,
    runes: -8,
  },
  gnome: {
    offense: -16,
    defense: 10,
    expenses: 6,
    industry: -10,
    income: 10,
    explore: -12,
    market: 24,
    runes: -12,
  },
  gremlin: {
    offense: 10,
    defense: -6,
    magic: -10,
    industry: -14,
    income: -20,
    market: 8,
    foodProd: 18,
    foodCons: 14,
  },
  orc: {
    offense: 16,
    buildCost: 4,
    expenses: -14,
    magic: -4,
    industry: 8,
    explore: 22,
    foodProd: -8,
    foodCons: -10,
    runes: -14,
  },
  drow: {
    offense: 14,
    defense: 6,
    buildCost: -12,
    expenses: -10,
    magic: 18,
    explore: -16,
    foodProd: -6,
    runes: 6,
  },
  goblin: {
    offense: -18,
    defense: -16,
    expenses: 18,
    industry: 14,
    market: -6,
    foodCons: 8,
  },
};
