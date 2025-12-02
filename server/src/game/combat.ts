/**
 * Combat system matching QM Promisance 4.81
 * Reference: pages/military.php
 */

import type { Empire, CombatResult, Troops, Buildings, TurnActionResult, AttackType, TurnStopReason } from '../types';
import { UNIT_STATS, COMBAT, WIZARD_POWER, UnitType } from './constants';
import {
  getModifier,
  calculateNetworth,
  subtractTroops,
  addBuildings,
  subtractBuildings,
  canAttackEra,
} from './empire';
import { processEconomy, applyEconomyResult } from './turns';

// ============================================
// POWER CALCULATIONS
// From military.php lines 113-131
// ============================================

export function calculateOffensePower(empire: Empire): number {
  const era = empire.era;
  const stats = UNIT_STATS[era];
  const offenseModifier = getModifier(empire, 'offense');
  const healthModifier = empire.health / 100;

  let power = 0;
  power += empire.troops.trparm * stats.trparm[0];
  power += empire.troops.trplnd * stats.trplnd[0];
  power += empire.troops.trpfly * stats.trpfly[0];
  power += empire.troops.trpsea * stats.trpsea[0];
  power += empire.troops.trpwiz * WIZARD_POWER;

  return Math.round(power * offenseModifier * healthModifier);
}

export function calculateDefensePower(empire: Empire): number {
  const era = empire.era;
  const stats = UNIT_STATS[era];
  const defenseModifier = getModifier(empire, 'defense');
  const healthModifier = empire.health / 100;

  let power = 0;
  power += empire.troops.trparm * stats.trparm[1];
  power += empire.troops.trplnd * stats.trplnd[1];
  power += empire.troops.trpfly * stats.trpfly[1];
  power += empire.troops.trpsea * stats.trpsea[1];
  power += empire.troops.trpwiz * WIZARD_POWER;

  // Tower defense: 450 per tower, but requires soldiers to man them
  // From military.php line 130-131
  const { blddef } = empire.buildings;
  if (blddef > 0) {
    const soldiersPerTower = COMBAT.soldiersPerTower;
    const towerEfficiency = Math.min(1, empire.troops.trparm / (soldiersPerTower * blddef));
    power += blddef * COMBAT.towerDefensePerBuilding * towerEfficiency;
  }

  return Math.round(power * defenseModifier * healthModifier);
}

// ============================================
// UNIT LOSS CALCULATION
// From military.php calcUnitLoss() lines 305-312
// ============================================

function calcUnitLoss(
  attackUnits: number,
  defendUnits: number,
  attackRate: number,
  defendRate: number,
  omod: number,
  dmod: number
): { attackLoss: number; defendLoss: number } {
  // Attacker losses: random up to (units * rate * omod)
  const maxAttackLoss = Math.ceil(attackUnits * attackRate * omod) + 1;
  const attackLoss = Math.min(
    Math.floor(Math.random() * maxAttackLoss),
    attackUnits
  );

  // Defender losses: capped at 90-110% of attacker's units sent
  const maxKill = Math.round(0.9 * attackUnits) +
    Math.floor(Math.random() * (Math.round(0.2 * attackUnits) + 1));
  const maxDefendLoss = Math.ceil(defendUnits * defendRate * dmod) + 1;
  const defendLoss = Math.min(
    Math.floor(Math.random() * maxDefendLoss),
    defendUnits,
    maxKill
  );

  return { attackLoss, defendLoss };
}

// ============================================
// BUILDING DESTRUCTION/GAIN
// From military.php destroyBuildings() lines 315-343
// ============================================

function destroyBuildings(
  defenderBuildings: number,
  defenderLand: number,
  lossPercent: number,
  gainPercent: number
): { loss: number; gain: number } {
  // Calculate buildings lost by defender
  const loss = Math.ceil(defenderBuildings * lossPercent);

  // Calculate buildings gained by attacker (percentage of what defender lost)
  const gain = Math.floor(loss * gainPercent);

  return { loss, gain };
}

// ============================================
// COMBAT RESOLUTION
// From military.php lines 133-186
// ============================================

export function resolveCombat(
  attacker: Empire,
  defender: Empire,
  attackType: AttackType = 'standard'
): CombatResult {
  const offpower = calculateOffensePower(attacker);
  const defpower = calculateDefensePower(defender);

  // Tower defense is included in defpower but not used for loss mod calculation
  const { blddef } = defender.buildings;
  const towerDef = blddef > 0
    ? blddef * COMBAT.towerDefensePerBuilding * Math.min(1, defender.troops.trparm / (COMBAT.soldiersPerTower * blddef))
    : 0;

  // Modification factors for losses
  // omod = sqrt(defpower_without_towers / offpower)
  // dmod = sqrt(offpower / defpower)
  const omod = Math.sqrt((defpower - towerDef) / (offpower + 1));
  const dmod = Math.sqrt(offpower / (defpower + 1));

  const attackerLosses: Partial<Troops> = {};
  const defenderLosses: Partial<Troops> = {};

  // Determine which unit types and loss rates to use based on attack type
  // From military.php lines 143-167
  const singleUnitTypes: UnitType[] = ['trparm', 'trplnd', 'trpfly', 'trpsea'];

  if (singleUnitTypes.includes(attackType as UnitType)) {
    // Single-unit attack: only uses that unit type with lower loss rates
    const unitType = attackType as UnitType;
    const [attackRate, defendRate] = COMBAT.singleUnitLossRates[unitType];
    const { attackLoss, defendLoss } = calcUnitLoss(
      attacker.troops[unitType],
      defender.troops[unitType],
      attackRate,
      defendRate,
      omod,
      dmod
    );
    attackerLosses[unitType] = attackLoss;
    defenderLosses[unitType] = defendLoss;
  } else {
    // Standard attack: uses all unit types with standard loss rates
    const lossRates = COMBAT.standardLossRates;
    for (const unitType of singleUnitTypes) {
      const [attackRate, defendRate] = lossRates[unitType];
      const { attackLoss, defendLoss } = calcUnitLoss(
        attacker.troops[unitType],
        defender.troops[unitType],
        attackRate,
        defendRate,
        omod,
        dmod
      );
      attackerLosses[unitType] = attackLoss;
      defenderLosses[unitType] = defendLoss;
    }
  }

  // Check if attacker won (offense > defense * 1.05)
  const won = offpower > defpower * COMBAT.winThreshold;

  let landGained = 0;
  const buildingsGained: Partial<Buildings> = {};
  const buildingsDestroyed: Partial<Buildings> = {};

  if (won) {
    // Process building destruction and capture
    const buildingTypes = ['bldcash', 'bldpop', 'bldtrp', 'bldcost', 'bldfood', 'bldwiz', 'blddef'] as const;
    const isStandardAttack = attackType === 'standard';

    for (const bldType of buildingTypes) {
      const captureRates = COMBAT.buildingCapture[bldType];
      if (captureRates) {
        const [lossRate, gainRate] = captureRates;
        const bldCount = defender.buildings[bldType];
        const { loss, gain } = destroyBuildings(bldCount, defender.resources.land, lossRate, gainRate);
        buildingsDestroyed[bldType] = loss;

        if (isStandardAttack) {
          // Standard attacks: capture buildings and gain land = buildings captured
          buildingsGained[bldType] = gain;
          landGained += gain;
        } else {
          // Single-unit attacks: raze buildings, gain land as freeland (no buildings captured)
          landGained += loss;
        }
      }
    }

    // Free land handling
    const freelandRates = COMBAT.buildingCapture.freeland;
    const freelandLoss = Math.ceil(defender.resources.freeland * freelandRates[0]);
    landGained += freelandLoss; // Attacker gets some of defender's free land
  }

  return {
    won,
    attackerLosses,
    defenderLosses,
    landGained,
    buildingsGained,
    buildingsDestroyed,
    offpower,
    defpower,
  };
}

// ============================================
// APPLY COMBAT RESULTS
// ============================================

export function applyCombatResult(
  attacker: Empire,
  defender: Empire,
  result: CombatResult
): void {
  // Apply troop losses
  attacker.troops = subtractTroops(attacker.troops, result.attackerLosses as Troops);
  defender.troops = subtractTroops(defender.troops, result.defenderLosses as Troops);

  // Update combat stats
  attacker.offTotal++;
  defender.defTotal++;

  if (result.won) {
    attacker.offSucc++;

    // Transfer land
    attacker.resources.land += result.landGained;
    attacker.resources.freeland += result.landGained;
    defender.resources.land -= result.landGained;

    // Process building transfers
    for (const [bldType, loss] of Object.entries(result.buildingsDestroyed)) {
      if (loss && loss > 0) {
        (defender.buildings as any)[bldType] -= loss;
        defender.resources.freeland += loss; // Destroyed buildings become free land first
        defender.resources.freeland -= loss; // Then land is taken
      }
    }

    for (const [bldType, gain] of Object.entries(result.buildingsGained)) {
      if (gain && gain > 0) {
        (attacker.buildings as any)[bldType] += gain;
        attacker.resources.freeland -= gain; // Buildings take up land
      }
    }

    // Check if defender was killed
    if (defender.resources.land <= 0) {
      attacker.kills++;
    }
  } else {
    defender.defSucc++;
  }

  // Recalculate networth
  attacker.networth = calculateNetworth(attacker);
  defender.networth = calculateNetworth(defender);
}

// ============================================
// ATTACK ACTION
// ============================================

export function processAttack(
  attacker: Empire,
  defender: Empire,
  turnsRemaining: number,
  attackType: AttackType = 'standard'
): TurnActionResult {
  const turnsNeeded = COMBAT.turnsPerAttack;

  // Check if enough turns
  if (turnsRemaining < turnsNeeded) {
    return {
      success: false,
      turnsSpent: 0,
      turnsRemaining,
      income: 0,
      expenses: 0,
      foodProduction: 0,
      foodConsumption: 0,
      runeChange: 0,
      troopsProduced: {},
      loanPayment: 0,
      bankInterest: 0,
      loanInterest: 0,
      empire: attacker,
    };
  }

  // Check era compatibility
  if (!canAttackEra(attacker, defender)) {
    return {
      success: false,
      turnsSpent: 0,
      turnsRemaining,
      income: 0,
      expenses: 0,
      foodProduction: 0,
      foodConsumption: 0,
      runeChange: 0,
      troopsProduced: {},
      loanPayment: 0,
      bankInterest: 0,
      loanInterest: 0,
      empire: attacker,
    };
  }

  // Check health requirement
  if (attacker.health < 20) {
    return {
      success: false,
      turnsSpent: 0,
      turnsRemaining,
      income: 0,
      expenses: 0,
      foodProduction: 0,
      foodConsumption: 0,
      runeChange: 0,
      troopsProduced: {},
      loanPayment: 0,
      bankInterest: 0,
      loanInterest: 0,
      empire: attacker,
    };
  }

  // Process economy for attack turns
  let totalIncome = 0;
  let totalExpenses = 0;
  let totalFoodPro = 0;
  let totalFoodCon = 0;
  let totalRunes = 0;
  let totalLoanPayment = 0;
  let totalBankInterest = 0;
  let totalLoanInterest = 0;
  let turnsActuallySpent = 0;
  let stoppedEarly: TurnStopReason | undefined;

  for (let i = 0; i < turnsNeeded; i++) {
    const economyResult = processEconomy(attacker);
    const extras = applyEconomyResult(attacker, economyResult);
    turnsActuallySpent++;

    totalIncome += economyResult.income;
    totalExpenses += economyResult.expenses;
    totalFoodPro += economyResult.foodProduction;
    totalFoodCon += economyResult.foodConsumption;
    totalRunes += economyResult.runeProduction;
    totalLoanPayment += economyResult.loanPayment;
    totalBankInterest += extras.bankInterest;
    totalLoanInterest += extras.loanInterest;

    // Check for emergency conditions - cancel attack if emergency occurs
    if (extras.foodEmergency) {
      stoppedEarly = 'food';
      break;
    }
    if (extras.loanEmergency) {
      stoppedEarly = 'loan';
      break;
    }
  }

  // If stopped early due to emergency, cancel attack (no combat, no health cost)
  if (stoppedEarly) {
    return {
      success: false,
      turnsSpent: turnsActuallySpent,
      turnsRemaining: turnsRemaining - turnsActuallySpent,
      income: totalIncome,
      expenses: totalExpenses,
      foodProduction: totalFoodPro,
      foodConsumption: totalFoodCon,
      runeChange: totalRunes,
      troopsProduced: {},
      loanPayment: totalLoanPayment,
      bankInterest: totalBankInterest,
      loanInterest: totalLoanInterest,
      stoppedEarly,
      empire: attacker,
    };
  }

  // Resolve combat
  const combatResult = resolveCombat(attacker, defender, attackType);
  applyCombatResult(attacker, defender, combatResult);

  // Apply health cost for attacking
  attacker.health = Math.max(0, attacker.health - COMBAT.attackHealthCost);

  return {
    success: true,
    turnsSpent: turnsNeeded,
    turnsRemaining: turnsRemaining - turnsNeeded,
    income: totalIncome,
    expenses: totalExpenses,
    foodProduction: totalFoodPro,
    foodConsumption: totalFoodCon,
    runeChange: totalRunes,
    troopsProduced: {},
    loanPayment: totalLoanPayment,
    bankInterest: totalBankInterest,
    loanInterest: totalLoanInterest,
    combatResult,
    empire: attacker,
  };
}

// ============================================
// COMBAT PREVIEW (for UI)
// ============================================

export interface CombatPreview {
  attackerPower: number;
  defenderPower: number;
  winChance: number;
  estimatedLandGain: number;
  canAttack: boolean;
  reason?: string;
}

export function getCombatPreview(
  attacker: Empire,
  defender: Empire,
  turnsRemaining: number
): CombatPreview {
  const attackerPower = calculateOffensePower(attacker);
  const defenderPower = calculateDefensePower(defender);

  // Calculate win probability based on power ratio
  const ratio = attackerPower / (defenderPower * COMBAT.winThreshold);
  const winChance = ratio >= 1 ? Math.min(0.95, 0.5 + (ratio - 1) * 0.5) : Math.max(0.05, ratio * 0.5);

  // Estimate land gain (roughly 10% of total building destruction)
  const estimatedLandGain = Math.floor(defender.resources.land * 0.07);

  // Check if attack is possible
  let canAttack = true;
  let reason: string | undefined;

  if (turnsRemaining < COMBAT.turnsPerAttack) {
    canAttack = false;
    reason = 'Not enough turns';
  } else if (!canAttackEra(attacker, defender)) {
    canAttack = false;
    reason = 'Different era - need Gate spell';
  } else if (attacker.health < 20) {
    canAttack = false;
    reason = 'Health too low';
  }

  return {
    attackerPower,
    defenderPower,
    winChance,
    estimatedLandGain,
    canAttack,
    reason,
  };
}
