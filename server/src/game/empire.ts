/**
 * Empire model and calculations matching QM Promisance 4.81
 * Reference: classes/prom_empire.php
 */

import type { Empire, Race, Era, Buildings, Troops, IndustryAllocation } from '../types';
import {
  STARTING_LAND,
  STARTING_PEASANTS,
  STARTING_HEALTH,
  STARTING_TAX_RATE,
  STARTING_GOLD,
  STARTING_FOOD,
  STARTING_RUNES,
  STARTING_BUILDINGS,
  STARTING_TROOPS,
  STARTING_INDUSTRY,
  RACE_MODIFIERS,
  ERA_MODIFIERS,
  NETWORTH,
  PVTM_TRPARM,
  PVTM_FOOD,
  ECONOMY,
} from './constants';
import { MASTERY_BONUS_PER_LEVEL } from './bonuses/techs';
import { getBotInnateBonusValue } from './bot/strategies';

// ============================================
// EMPIRE CREATION
// ============================================

export function createEmpire(
  id: string,
  name: string,
  race: Race,
  era: Era = 'past'
): Empire {
  const totalBuildings = getTotalBuildings(STARTING_BUILDINGS);

  const empire: Empire = {
    id,
    name,
    race,
    era,
    eraChangedRound: 0,

    resources: {
      gold: STARTING_GOLD,
      food: STARTING_FOOD,
      runes: STARTING_RUNES,
      land: STARTING_LAND,
      freeland: STARTING_LAND - totalBuildings,
    },

    buildings: { ...STARTING_BUILDINGS },
    troops: { ...STARTING_TROOPS },
    industryAllocation: { ...STARTING_INDUSTRY },

    peasants: STARTING_PEASANTS,
    health: STARTING_HEALTH,
    taxRate: STARTING_TAX_RATE,
    bank: 0,
    loan: 0,

    networth: 0,

    offTotal: 0,
    offSucc: 0,
    defTotal: 0,
    defSucc: 0,
    kills: 0,
    attacksThisRound: 0,
    offensiveSpellsThisRound: 0,

    shieldExpiresRound: null,
    gateExpiresRound: null,
    pacificationExpiresRound: null,
    divineProtectionExpiresRound: null,

    bonusTurnsNextRound: 0,
    guaranteedRareDraft: false,
    extraDraftPicks: 0,

    advisors: [],
    techs: {},
    policies: [],
    bonusAdvisorSlots: 0,
    bonusDraftOptions: 0,
  };

  empire.networth = calculateNetworth(empire);

  return empire;
}

// Note: createBotEmpire has been moved to game/bot/generation.ts

// ============================================
// MODIFIER CALCULATIONS
// Matches prom_empire.php getModifier()
// Returns 1.0 + (raceModifier / 100) + advisor + tech bonuses
// ============================================

// Map advisor effect types to stat names
const ADVISOR_EFFECT_TO_STAT: Record<string, string | string[]> = {
  food_production: 'foodpro',
  income: 'income',
  industry: 'industry',
  explore: 'explore',
  offense: 'offense',
  defense: 'defense',
  build_cost: 'building', // Note: this is inverted (negative = cheaper)
  military: ['offense', 'defense'], // Applies to both
  magic: 'magic',
  rune_production: 'runepro', // Methuselah - +50% rune production
};

// Map tech actions to stat names
const TECH_ACTION_TO_STAT: Record<string, string> = {
  farm: 'foodpro',
  cash: 'income',
  explore: 'explore',
  industry: 'industry',
  meditate: 'runepro',
};

// Count unique masteries owned (level > 0)
function countUniqueMasteries(empire: Empire): number {
  let count = 0;
  for (const action of ['farm', 'cash', 'explore', 'industry', 'meditate']) {
    if ((empire.techs[action] ?? 0) > 0) {
      count++;
    }
  }
  return count;
}

// Mastery scaling condition mappings: which mastery boosts which stat
const MASTERY_SCALING_CONDITIONS: Record<string, { masteryAction: string; targetStat: string }> = {
  explore_boosts_food: { masteryAction: 'explore', targetStat: 'foodpro' },
  explore_boosts_income: { masteryAction: 'explore', targetStat: 'income' },
  meditate_boosts_industry: { masteryAction: 'meditate', targetStat: 'industry' },
  meditate_boosts_food: { masteryAction: 'meditate', targetStat: 'foodpro' },
  cash_boosts_offense: { masteryAction: 'cash', targetStat: 'offense' },
  cash_boosts_industry: { masteryAction: 'cash', targetStat: 'industry' },
  industry_boosts_magic: { masteryAction: 'industry', targetStat: 'magic' },
};

// Stats that count as "all actions" for multi-mastery bonuses
const ALL_ACTION_STATS = ['foodpro', 'income', 'explore', 'industry', 'runepro'];

function getAdvisorBonusForStat(empire: Empire, stat: string): number {
  let bonus = 0;

  for (const advisor of empire.advisors) {
    const effectType = advisor.effect.type;
    const modifier = advisor.effect.modifier;
    const condition = advisor.effect.condition;

    // Handle mastery_scaling: bonus scales with a mastery level
    if (effectType === 'mastery_scaling' && condition) {
      const scaling = MASTERY_SCALING_CONDITIONS[condition];
      if (scaling && scaling.targetStat === stat) {
        const masteryLevel = empire.techs[scaling.masteryAction] ?? 0;
        bonus += modifier * masteryLevel;
      }
      continue;
    }

    // Handle multi_mastery_scaling: bonus per unique mastery owned
    if (effectType === 'multi_mastery_scaling') {
      const uniqueMasteries = countUniqueMasteries(empire);
      if (ALL_ACTION_STATS.includes(stat)) {
        bonus += modifier * uniqueMasteries;
      }
      continue;
    }

    // Handle multi_mastery_threshold: bonus if threshold met
    if (effectType === 'multi_mastery_threshold' && condition) {
      const uniqueMasteries = countUniqueMasteries(empire);
      let applies = false;

      if (condition === 'min_2_masteries' && uniqueMasteries >= 2) {
        applies = ALL_ACTION_STATS.includes(stat);
      } else if (condition === 'min_3_masteries_combat' && uniqueMasteries >= 3) {
        applies = stat === 'offense' || stat === 'defense';
      } else if (condition === 'all_5_masteries' && uniqueMasteries >= 5) {
        applies = ALL_ACTION_STATS.includes(stat);
      }

      if (applies) {
        bonus += modifier;
      }
      continue;
    }

    // Standard advisor effect handling
    const mappedStats = ADVISOR_EFFECT_TO_STAT[effectType];
    if (mappedStats) {
      if (Array.isArray(mappedStats)) {
        if (mappedStats.includes(stat)) {
          bonus += modifier;
        }
      } else if (mappedStats === stat) {
        // build_cost is inverted: -15% cost reduction means +15% building modifier
        // because building modifier divides cost (higher = cheaper)
        if (effectType === 'build_cost') {
          bonus -= modifier; // Invert the negative to positive
        } else {
          bonus += modifier;
        }
      }
    }
  }
  return bonus;
}

function getTechBonusForStat(empire: Empire, stat: string): number {
  // Find which action corresponds to this stat
  for (const [action, mappedStat] of Object.entries(TECH_ACTION_TO_STAT)) {
    if (mappedStat === stat) {
      const level = empire.techs[action] ?? 0;
      if (level > 0) {
        // Sum all bonuses up to current level
        // MASTERY_BONUS_PER_LEVEL = [10, 10, 10, 15, 15] (percentage points)
        let totalBonus = 0;
        for (let i = 0; i < level; i++) {
          totalBonus += MASTERY_BONUS_PER_LEVEL[i] ?? 0;
        }
        return totalBonus / 100;
      }
    }
  }
  return 0;
}

export function getModifier(empire: Empire, stat: keyof typeof RACE_MODIFIERS.human): number {
  const raceModifier = RACE_MODIFIERS[empire.race][stat] ?? 0;
  const advisorBonus = getAdvisorBonusForStat(empire, stat);
  const techBonus = getTechBonusForStat(empire, stat);

  return 1.0 + raceModifier / 100 + advisorBonus + techBonus;
}

export function getEraModifier(empire: Empire, stat: keyof typeof ERA_MODIFIERS.past): number {
  const eraModifier = ERA_MODIFIERS[empire.era][stat] ?? 0;
  return 1.0 + eraModifier / 100;
}

// ============================================
// NETWORTH CALCULATION
// From prom_empire.php getNetworth()
// ============================================

export function calculateNetworth(empire: Empire): number {
  let net = 0;

  // Troops (weighted by PVTM costs)
  net += empire.troops.trparm * NETWORTH.troopValues.trparm;
  net += empire.troops.trplnd * NETWORTH.troopValues.trplnd;
  net += empire.troops.trpfly * NETWORTH.troopValues.trpfly;
  net += empire.troops.trpsea * NETWORTH.troopValues.trpsea;
  net += empire.troops.trpwiz * NETWORTH.troopValues.trpwiz;

  // Peasants
  net += empire.peasants * NETWORTH.peasantValue;

  // Cash: (cash + bank/2 - loan*2) / (5 * PVTM_TRPARM)
  const cashValue = (empire.resources.gold + empire.bank / 2 - empire.loan * 2) / NETWORTH.cashDivisor;
  net += cashValue;

  // Land
  net += empire.resources.land * NETWORTH.landValue;
  net += empire.resources.freeland * NETWORTH.freeLandValue;

  // Food: food / log10(food) * (PVTM_FOOD / PVTM_TRPARM)
  // Logarithmic to prevent hoarding from inflating networth
  if (empire.resources.food > 10) {
    const foodValue = empire.resources.food / Math.log10(empire.resources.food) * NETWORTH.foodMultiplier;
    net += foodValue;
  }

  return Math.max(0, Math.floor(net));
}

// ============================================
// BUILDING HELPERS
// Note: bldpop and blddef are removed from game but kept for DB compatibility (always 0)
// ============================================

export function getTotalBuildings(buildings: Buildings): number {
  return (
    // bldpop removed (always 0)
    buildings.bldcash +
    buildings.bldtrp +
    buildings.bldcost +
    buildings.bldfood +
    buildings.bldwiz
    // blddef removed (always 0)
  );
}

export function getUsedLand(empire: Empire): number {
  return getTotalBuildings(empire.buildings);
}

export function addBuildings(base: Buildings, additions: Partial<Buildings>): Buildings {
  return {
    bldpop: base.bldpop + (additions.bldpop ?? 0),
    bldcash: base.bldcash + (additions.bldcash ?? 0),
    bldtrp: base.bldtrp + (additions.bldtrp ?? 0),
    bldcost: base.bldcost + (additions.bldcost ?? 0),
    bldfood: base.bldfood + (additions.bldfood ?? 0),
    bldwiz: base.bldwiz + (additions.bldwiz ?? 0),
    blddef: base.blddef + (additions.blddef ?? 0),
  };
}

export function subtractBuildings(base: Buildings, losses: Partial<Buildings>): Buildings {
  return {
    bldpop: Math.max(0, base.bldpop - (losses.bldpop ?? 0)),
    bldcash: Math.max(0, base.bldcash - (losses.bldcash ?? 0)),
    bldtrp: Math.max(0, base.bldtrp - (losses.bldtrp ?? 0)),
    bldcost: Math.max(0, base.bldcost - (losses.bldcost ?? 0)),
    bldfood: Math.max(0, base.bldfood - (losses.bldfood ?? 0)),
    bldwiz: Math.max(0, base.bldwiz - (losses.bldwiz ?? 0)),
    blddef: Math.max(0, base.blddef - (losses.blddef ?? 0)),
  };
}

// ============================================
// TROOP HELPERS
// ============================================

export function getTotalTroops(troops: Troops): number {
  return (
    troops.trparm +
    troops.trplnd +
    troops.trpfly +
    troops.trpsea +
    troops.trpwiz
  );
}

export function addTroops(base: Troops, additions: Partial<Troops>): Troops {
  return {
    trparm: base.trparm + (additions.trparm ?? 0),
    trplnd: base.trplnd + (additions.trplnd ?? 0),
    trpfly: base.trpfly + (additions.trpfly ?? 0),
    trpsea: base.trpsea + (additions.trpsea ?? 0),
    trpwiz: base.trpwiz + (additions.trpwiz ?? 0),
  };
}

export function subtractTroops(base: Troops, losses: Partial<Troops>): Troops {
  return {
    trparm: Math.max(0, base.trparm - (losses.trparm ?? 0)),
    trplnd: Math.max(0, base.trplnd - (losses.trplnd ?? 0)),
    trpfly: Math.max(0, base.trpfly - (losses.trpfly ?? 0)),
    trpsea: Math.max(0, base.trpsea - (losses.trpsea ?? 0)),
    trpwiz: Math.max(0, base.trpwiz - (losses.trpwiz ?? 0)),
  };
}

export function scaleTroops(troops: Troops, factor: number): Troops {
  return {
    trparm: Math.floor(troops.trparm * factor),
    trplnd: Math.floor(troops.trplnd * factor),
    trpfly: Math.floor(troops.trpfly * factor),
    trpsea: Math.floor(troops.trpsea * factor),
    trpwiz: Math.floor(troops.trpwiz * factor),
  };
}

// ============================================
// CAPACITY CALCULATIONS
// ============================================

export function getMaxPeasants(empire: Empire): number {
  // Population capacity tied to land (since houses were removed)
  const { populationBaseCapacity, populationPerLand } = ECONOMY;
  return Math.floor(populationBaseCapacity + empire.resources.land * populationPerLand);
}

// ============================================
// EFFECT CHECKS
// ============================================

// Check if empire has a specific advisor effect
export function hasAdvisorEffect(empire: Empire, effectType: string): boolean {
  return empire.advisors.some((a) => a.effect.type === effectType);
}

// Get the total modifier for a specific advisor effect type
// Used for special effects like health_regen, peasant_density, etc.
export function getAdvisorEffectModifier(empire: Empire, effectType: string): number {
  let total = 0;
  for (const advisor of empire.advisors) {
    if (advisor.effect.type === effectType) {
      total += advisor.effect.modifier;
    }
  }
  return total;
}

// Check if empire has a specific policy
export function hasPolicy(empire: Empire, policyId: string): boolean {
  return empire.policies.includes(policyId);
}

export function hasActiveShield(empire: Empire, currentRound?: number): boolean {
  // Check for permanent shield advisor (Arcane Ward)
  if (hasAdvisorEffect(empire, 'permanent_shield')) {
    return true;
  }
  if (empire.shieldExpiresRound === null) return false;
  // If no round provided, assume shield is active (for checking during combat)
  if (currentRound === undefined) return true;
  return empire.shieldExpiresRound >= currentRound;
}

export function hasActiveGate(empire: Empire, currentRound?: number): boolean {
  // Check for permanent gate advisor (time_weaver)
  if (hasAdvisorEffect(empire, 'permanent_gate')) {
    return true;
  }
  if (empire.gateExpiresRound === null) return false;
  if (currentRound === undefined) return true;
  return empire.gateExpiresRound >= currentRound;
}

export function canAttackEra(attacker: Empire, defender: Empire, currentRound?: number): boolean {
  if (attacker.era === defender.era) {
    return true;
  }

  // Bots with crossEraAttacks innate bonus can always attack any era
  if (getBotInnateBonusValue(attacker, 'crossEraAttacks')) {
    return true;
  }

  // Players with Time Weaver advisor (permanent_gate) can attack any era
  if (hasAdvisorEffect(attacker, 'permanent_gate')) {
    return true;
  }

  return hasActiveGate(attacker, currentRound);
}

export function canChangeEra(empire: Empire, currentRound: number): boolean {
  return currentRound > empire.eraChangedRound;
}

// ============================================
// VALIDATION
// ============================================

export function validateIndustryAllocation(allocation: IndustryAllocation): boolean {
  const total = allocation.trparm + allocation.trplnd + allocation.trpfly + allocation.trpsea;
  return total === 100 && Object.values(allocation).every((v) => v >= 0 && v <= 100);
}

export function getBuildingCost(empire: Empire, count: number): number {
  // BUILD_COST + (land * multiplier) per building, reduced by race building modifier
  const baseCost = ECONOMY.buildingBaseCost + empire.resources.land * ECONOMY.buildingLandMultiplier;
  const buildingModifier = getModifier(empire, 'building');
  // Higher building modifier = cheaper buildings (divide by modifier)
  return Math.round((baseCost * count) / buildingModifier);
}

export function canAffordBuilding(empire: Empire, count: number): boolean {
  const cost = getBuildingCost(empire, count);
  return empire.resources.gold >= cost && empire.resources.freeland >= count;
}
