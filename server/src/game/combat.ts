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
  getAdvisorEffectModifier,
} from './empire';
import { processEconomy, applyEconomyResult } from './turns';
import { getBotInnateBonusValue } from './bot/strategies';

// ============================================
// POWER CALCULATIONS
// From military.php lines 113-131
// ============================================

// Get unit specialist bonuses from advisors
// Returns per-unit offense bonus and defense penalty for each troop type
function getUnitSpecialistBonuses(empire: Empire): {
  offenseBonus: Record<UnitType, number>;
  defensePenalty: Record<UnitType, number>;
} {
  const offenseBonus: Record<UnitType, number> = { trparm: 0, trplnd: 0, trpfly: 0, trpsea: 0 };
  const defensePenalty: Record<UnitType, number> = { trparm: 0, trplnd: 0, trpfly: 0, trpsea: 0 };

  for (const advisor of empire.advisors) {
    if (advisor.effect.type === 'unit_specialist') {
      const { boostUnits, nerfUnits, offenseBonus: bonus, defensePenalty: penalty } = advisor.effect;
      if (boostUnits && bonus) {
        for (const unit of boostUnits) {
          offenseBonus[unit] += bonus;
        }
      }
      if (nerfUnits && penalty) {
        for (const unit of nerfUnits) {
          defensePenalty[unit] += penalty;
        }
      }
    }
  }

  return { offenseBonus, defensePenalty };
}

export function calculateOffensePower(empire: Empire): number {
  const era = empire.era;
  const stats = UNIT_STATS[era];
  const offenseModifier = getModifier(empire, 'offense');
  const healthModifier = empire.health / 100;

  // Martin the Warrior: dynamic_offense scales with attacks this round
  // +5% offense per attack already made this round
  const dynamicOffensePerAttack = getAdvisorEffectModifier(empire, 'dynamic_offense');
  const dynamicOffenseBonus = 1 + (dynamicOffensePerAttack * empire.attacksThisRound);

  // Unit specialist bonuses (flat per-unit additions)
  const specialist = getUnitSpecialistBonuses(empire);

  let power = 0;
  power += empire.troops.trparm * (stats.trparm[0] + specialist.offenseBonus.trparm);
  power += empire.troops.trplnd * (stats.trplnd[0] + specialist.offenseBonus.trplnd);
  power += empire.troops.trpfly * (stats.trpfly[0] + specialist.offenseBonus.trpfly);
  power += empire.troops.trpsea * (stats.trpsea[0] + specialist.offenseBonus.trpsea);
  power += empire.troops.trpwiz * WIZARD_POWER;

  // Building offense bonus from building-based offense advisors
  // Each advisor grants % offense per building of a specific type
  let buildingOffenseBonus = 0;
  for (const advisor of empire.advisors) {
    if (advisor.effect.type === 'building_offense' && advisor.effect.condition) {
      const buildingType = advisor.effect.condition as keyof typeof empire.buildings;
      const buildingCount = empire.buildings[buildingType] ?? 0;
      buildingOffenseBonus += advisor.effect.modifier * buildingCount;
    }
  }

  // Peasant Champion: +0.01% offense per peasant
  const peasantChampionMod = getAdvisorEffectModifier(empire, 'peasant_champion');
  const peasantBonus = peasantChampionMod * empire.peasants;

  // Second Wind: +1% all stats per 10 health missing
  const secondWindMod = getAdvisorEffectModifier(empire, 'second_wind');
  const healthMissing = 100 - empire.health;
  const secondWindBonus = secondWindMod * Math.floor(healthMissing / 10);

  // Bot innate offense bonus (e.g., General Vask gets +15%)
  const botOffenseBonus = getBotInnateBonusValue(empire, 'offense') ?? 0;

  return Math.round(power * offenseModifier * healthModifier * dynamicOffenseBonus * (1 + buildingOffenseBonus + peasantBonus + secondWindBonus + botOffenseBonus));
}

export function calculateDefensePower(empire: Empire): number {
  const era = empire.era;
  const stats = UNIT_STATS[era];
  const defenseModifier = getModifier(empire, 'defense');
  const healthModifier = empire.health / 100;

  // Unit specialist penalties (flat per-unit subtractions)
  const specialist = getUnitSpecialistBonuses(empire);

  let power = 0;
  power += empire.troops.trparm * Math.max(0, stats.trparm[1] - specialist.defensePenalty.trparm);
  power += empire.troops.trplnd * Math.max(0, stats.trplnd[1] - specialist.defensePenalty.trplnd);
  power += empire.troops.trpfly * Math.max(0, stats.trpfly[1] - specialist.defensePenalty.trpfly);
  power += empire.troops.trpsea * Math.max(0, stats.trpsea[1] - specialist.defensePenalty.trpsea);
  power += empire.troops.trpwiz * WIZARD_POWER;

  // Building defense bonus from guard tower advisors
  // Each advisor grants % defense per building of a specific type
  let buildingDefenseBonus = 0;
  for (const advisor of empire.advisors) {
    if (advisor.effect.type === 'building_defense' && advisor.effect.condition) {
      const buildingType = advisor.effect.condition as keyof typeof empire.buildings;
      const buildingCount = empire.buildings[buildingType] ?? 0;
      buildingDefenseBonus += advisor.effect.modifier * buildingCount;
    }
  }

  // Second Wind: +1% all stats per 10 health missing
  const secondWindMod = getAdvisorEffectModifier(empire, 'second_wind');
  const healthMissing = 100 - empire.health;
  const secondWindBonus = secondWindMod * Math.floor(healthMissing / 10);

  // Bot innate defense bonus (e.g., Grain Mother gets +25%)
  const botDefenseBonus = getBotInnateBonusValue(empire, 'defense') ?? 0;

  return Math.round(power * defenseModifier * healthModifier * (1 + buildingDefenseBonus + secondWindBonus + botDefenseBonus));
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

  // Tower defense: REMOVED - blddef no longer used
  // const { blddef } = defender.buildings;
  // const towerDef = blddef > 0
  //   ? blddef * COMBAT.towerDefensePerBuilding * Math.min(1, defender.troops.trparm / (COMBAT.soldiersPerTower * blddef))
  //   : 0;

  // Modification factors for losses
  // omod = sqrt(defpower / offpower)
  // dmod = sqrt(offpower / defpower)
  const omod = Math.sqrt(defpower / (offpower + 1));
  const dmod = Math.sqrt(offpower / (defpower + 1));

  // Perigord the Protector: casualty_reduction reduces attacker losses
  const casualtyReduction = getAdvisorEffectModifier(attacker, 'casualty_reduction');
  const casualtyMultiplier = Math.max(0, 1 - casualtyReduction); // 0.50 reduction = 0.50 multiplier

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
    // Apply casualty reduction to attacker losses
    attackerLosses[unitType] = Math.floor(attackLoss * casualtyMultiplier);
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
      // Apply casualty reduction to attacker losses
      attackerLosses[unitType] = Math.floor(attackLoss * casualtyMultiplier);
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
    // Note: bldpop and blddef removed from game
    const buildingTypes = ['bldcash', 'bldtrp', 'bldcost', 'bldfood', 'bldwiz'] as const;
    const isStandardAttack = attackType === 'standard';

    // Standard attacks destroy more buildings (and thus take more land)
    const destructionMultiplier = isStandardAttack ? (1 + COMBAT.standardAttackLandBonus) : 1;

    for (const bldType of buildingTypes) {
      const captureRates = COMBAT.buildingCapture[bldType];
      if (captureRates) {
        const [baseLossRate, gainRate] = captureRates;
        const lossRate = baseLossRate * destructionMultiplier;
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

    // Free land handling (also boosted for standard attacks)
    const freelandRates = COMBAT.buildingCapture.freeland;
    const freelandLoss = Math.ceil(defender.resources.freeland * freelandRates[0] * destructionMultiplier);
    landGained += freelandLoss; // Attacker gets some of defender's free land
  }

  return {
    won,
    attackerLosses,
    defenderLosses,
    landGained,
    landLost: landGained, // Defender loses same amount attacker gains
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

  // Salvage Expert: recover 10% of troops lost in combat (attacker only)
  const salvageMod = getAdvisorEffectModifier(attacker, 'salvage');
  if (salvageMod > 0) {
    for (const [troopType, loss] of Object.entries(result.attackerLosses)) {
      if (loss && loss > 0) {
        const recovered = Math.floor(loss * salvageMod);
        (attacker.troops as any)[troopType] += recovered;
      }
    }
  }

  // Toll Keeper: defender gains 5% of attacker's gold when attacked
  const tollKeeperMod = getAdvisorEffectModifier(defender, 'toll_keeper');
  if (tollKeeperMod > 0) {
    const toll = Math.floor(attacker.resources.gold * tollKeeperMod);
    defender.resources.gold += toll;
    // Note: doesn't subtract from attacker (it's a "toll" on attacking, not theft)
  }

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
  const totalTroopsProduced: Partial<Troops> = { trparm: 0, trplnd: 0, trpfly: 0, trpsea: 0, trpwiz: 0 };

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
    // Track troops produced during attack turns
    totalTroopsProduced.trparm! += economyResult.troopsProduced.trparm ?? 0;
    totalTroopsProduced.trplnd! += economyResult.troopsProduced.trplnd ?? 0;
    totalTroopsProduced.trpfly! += economyResult.troopsProduced.trpfly ?? 0;
    totalTroopsProduced.trpsea! += economyResult.troopsProduced.trpsea ?? 0;
    totalTroopsProduced.trpwiz! += economyResult.wizardsProduced;

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
      troopsProduced: totalTroopsProduced,
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

  // Apply health cost for attacking (reduced by battle_surgeon advisor)
  // Standard attacks cost 1 extra health compared to unit-specific attacks
  const healthReduction = getAdvisorEffectModifier(attacker, 'attack_health_reduction');
  const baseHealthCost = attackType === 'standard'
    ? COMBAT.attackHealthCost + COMBAT.standardAttackHealthBonus
    : COMBAT.attackHealthCost;
  const effectiveHealthCost = Math.floor(baseHealthCost * (1 - healthReduction));
  attacker.health = Math.max(0, Math.floor(attacker.health - effectiveHealthCost));

  return {
    success: true,
    turnsSpent: turnsNeeded,
    turnsRemaining: turnsRemaining - turnsNeeded,
    income: totalIncome,
    expenses: totalExpenses,
    foodProduction: totalFoodPro,
    foodConsumption: totalFoodCon,
    runeChange: totalRunes,
    troopsProduced: totalTroopsProduced,
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
