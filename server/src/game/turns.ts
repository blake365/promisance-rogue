/**
 * Turn processing engine matching QM Promisance 4.81 formulas
 * Reference: classes/prom_empire.php (calcFinances, calcProvisions, calcPCI, calcSizeBonus)
 */

import type { Empire, TurnAction, TurnActionResult, Buildings, Troops, TurnStopReason } from '../types';
import {
  ECONOMY,
  UNIT_COSTS,
  RACE_MODIFIERS,
  TURNS_PER_ROUND,
} from './constants';
import {
  calculateNetworth,
  getModifier,
  getEraModifier,
  getTotalBuildings,
  hasPolicy,
  hasAdvisorEffect,
  getAdvisorEffectModifier,
} from './empire';
import { applyBankInterest, applyLoanInterest, isLoanEmergency } from './bank';

// ============================================
// SIZE BONUS (from prom_empire.php calcSizeBonus)
// Affects income and bank rates
// ============================================

export function calcSizeBonus(networth: number): number {
  // Simplified size bonus based on networth tiers
  // Original uses networth brackets, we use a continuous function
  if (networth <= 10000) return 1.0;
  if (networth <= 100000) return 1.05;
  if (networth <= 1000000) return 1.10;
  if (networth <= 10000000) return 1.15;
  if (networth <= 100000000) return 1.25;
  return 1.35;
}

// ============================================
// PER CAPITA INCOME (from prom_empire.php calcPCI)
// Formula: 25 * (1 + bldcash / land) * income_modifier
// ============================================

export function calcPCI(empire: Empire): number {
  const land = Math.max(empire.resources.land, 1);
  const bldcashRatio = empire.buildings.bldcash / land;
  const incomeModifier = getModifier(empire, 'income');

  return Math.round(ECONOMY.pciBase * (1 + bldcashRatio) * incomeModifier);
}

// ============================================
// FINANCES (from prom_empire.php calcFinances)
// ============================================

export interface FinanceResult {
  income: number;
  expenses: number;
  loanPayment: number;
  netIncome: number;
}

export function calcFinances(empire: Empire): FinanceResult {
  const sizeBonus = calcSizeBonus(empire.networth);

  // Income = ((PCI * tax% * health% * peasants) + (bldcash * 500)) / sizeBonus
  const pci = calcPCI(empire);
  const taxFactor = empire.taxRate / 100;
  const healthFactor = empire.health / 100;

  const peasantIncome = pci * taxFactor * healthFactor * empire.peasants;
  const buildingIncome = empire.buildings.bldcash * ECONOMY.cashBuildingIncome;
  const income = Math.round((peasantIncome + buildingIncome) / sizeBonus);

  // Loan payment = loan / 200
  const loanPayment = Math.round(empire.loan / 200);

  // Base expenses = trparm*1 + trplnd*2.5 + trpfly*4 + trpsea*7 + land*8 + trpwiz*0.5
  let baseExpenses = 0;
  baseExpenses += empire.troops.trparm * UNIT_COSTS.trparm.upkeep;
  baseExpenses += empire.troops.trplnd * UNIT_COSTS.trplnd.upkeep;
  baseExpenses += empire.troops.trpfly * UNIT_COSTS.trpfly.upkeep;
  baseExpenses += empire.troops.trpsea * UNIT_COSTS.trpsea.upkeep;
  baseExpenses += empire.troops.trpwiz * UNIT_COSTS.trpwiz.upkeep;
  baseExpenses += empire.resources.land * ECONOMY.landUpkeep;
  baseExpenses = Math.round(baseExpenses);

  // Expense bonus = min(0.5, (expense_modifier - 1) + (bldcost / land))
  const expenseModifier = getModifier(empire, 'expenses');
  const land = Math.max(empire.resources.land, 1);
  const expBonus = Math.min(0.5, (expenseModifier - 1) + (empire.buildings.bldcost / land));
  const expenses = baseExpenses - Math.round(baseExpenses * expBonus);

  return {
    income,
    expenses,
    loanPayment,
    netIncome: income - expenses - loanPayment,
  };
}

// ============================================
// PROVISIONS (from prom_empire.php calcProvisions)
// ============================================

export interface ProvisionResult {
  production: number;
  consumption: number;
  netFood: number;
}

export function calcProvisions(empire: Empire): ProvisionResult {
  const land = Math.max(empire.resources.land, 1);

  // Production = (10 * freeland) + (bldfood * 85) * sqrt(1 - 0.75 * bldfood / land)
  // The sqrt factor creates diminishing returns for farms
  const freelandProduction = ECONOMY.foodPerFreeland * empire.resources.freeland;
  const farmRatio = empire.buildings.bldfood / land;
  const farmEfficiency = Math.sqrt(Math.max(0, 1 - 0.75 * farmRatio));
  const farmProduction = empire.buildings.bldfood * ECONOMY.foodPerFarm * farmEfficiency;

  const foodproModifier = getModifier(empire, 'foodpro');
  const production = Math.round((freelandProduction + farmProduction) * foodproModifier);

  // Consumption = sum of unit consumption * (2 - foodcon_modifier)
  // Note: (2 - modifier) inverts the effect - higher modifier = LESS consumption
  let baseConsumption = 0;
  baseConsumption += empire.troops.trparm * ECONOMY.foodConsumption.trparm;
  baseConsumption += empire.troops.trplnd * ECONOMY.foodConsumption.trplnd;
  baseConsumption += empire.troops.trpfly * ECONOMY.foodConsumption.trpfly;
  baseConsumption += empire.troops.trpsea * ECONOMY.foodConsumption.trpsea;
  baseConsumption += empire.troops.trpwiz * ECONOMY.foodConsumption.trpwiz;
  baseConsumption += empire.peasants * ECONOMY.foodConsumption.peasant;

  const foodconModifier = getModifier(empire, 'foodcon');
  const consumption = Math.round(baseConsumption * (2 - foodconModifier));

  return {
    production,
    consumption,
    netFood: production - consumption,
  };
}

// ============================================
// TROOP PRODUCTION (from prom_empire.php)
// ============================================

export function calcTroopProduction(empire: Empire): Partial<Troops> {
  const { industryAllocation, buildings } = empire;

  // Base production from barracks * INDUSTRY_MULT
  const baseProduction = buildings.bldtrp * ECONOMY.industryMult;
  const industryModifier = getModifier(empire, 'industry');
  const eraIndustryModifier = getEraModifier(empire, 'industry');
  const totalProduction = baseProduction * industryModifier * eraIndustryModifier;

  // Production rates for each unit type (from QM Promisance)
  // trparm: 1.2x, trplnd: 0.6x, trpfly: 0.3x, trpsea: 0.2x
  const productionRates = {
    trparm: 1.2,
    trplnd: 0.6,
    trpfly: 0.3,
    trpsea: 0.2,
  };

  return {
    trparm: Math.floor(totalProduction * (industryAllocation.trparm / 100) * productionRates.trparm),
    trplnd: Math.floor(totalProduction * (industryAllocation.trplnd / 100) * productionRates.trplnd),
    trpfly: Math.floor(totalProduction * (industryAllocation.trpfly / 100) * productionRates.trpfly),
    trpsea: Math.floor(totalProduction * (industryAllocation.trpsea / 100) * productionRates.trpsea),
  };
}

// ============================================
// RUNE PRODUCTION
// ============================================

export function calcRuneProduction(empire: Empire): number {
  // Runes from wizard towers
  const baseProduction = empire.buildings.bldwiz * 3;
  const runeproModifier = getModifier(empire, 'runepro');
  const eraRuneModifier = getEraModifier(empire, 'runeProduction');

  return Math.floor(baseProduction * runeproModifier * eraRuneModifier);
}

// ============================================
// WIZARD TRAINING
// ============================================

export function calcWizardTraining(empire: Empire): number {
  // 1 wizard per 10 towers per turn, modified by magic
  const baseTraining = empire.buildings.bldwiz * 0.1;
  const magicModifier = getModifier(empire, 'magic');

  return Math.floor(baseTraining * magicModifier);
}

// ============================================
// LAND EXPLORATION (from prom_empire.php give_land)
// Formula: (1 / (land * 0.00022 + 0.25)) * 20 * explore_modifier
// ============================================

export function calcLandGain(empire: Empire): number {
  const exploreModifier = getModifier(empire, 'explore');
  const eraExploreModifier = getEraModifier(empire, 'explore');
  const landFactor = empire.resources.land * 0.00022 + 0.25;

  return Math.ceil((1 / landFactor) * 20 * exploreModifier * eraExploreModifier);
}

// ============================================
// ECONOMY PROCESSING (runs every turn)
// ============================================

export interface EconomyResult {
  income: number;
  expenses: number;
  loanPayment: number;
  netGold: number;
  foodProduction: number;
  foodConsumption: number;
  netFood: number;
  runeProduction: number;
  troopsProduced: Partial<Troops>;
  wizardsProduced: number;
  starvation: boolean;
}

export interface ApplyEconomyExtra {
  bankInterest: number;
  loanInterest: number;
  // Emergency flags (from QM Promisance TURNS_TROUBLE_* flags)
  foodEmergency: boolean;
  loanEmergency: boolean;
}

export function processEconomy(empire: Empire, actionBonus?: TurnAction): EconomyResult {
  // Apply action bonus multiplier (25% bonus for matching action)
  const bonusMultiplier = 1.25;

  // Calculate base finances
  const finances = calcFinances(empire);
  let income = finances.income;
  if (actionBonus === 'cash') {
    income = Math.round(income * bonusMultiplier);
  }

  // Calculate provisions
  const provisions = calcProvisions(empire);
  let foodProduction = provisions.production;
  if (actionBonus === 'farm') {
    foodProduction = Math.round(foodProduction * bonusMultiplier);
  }

  // Calculate rune production
  let runeProduction = calcRuneProduction(empire);
  if (actionBonus === 'meditate') {
    runeProduction = Math.round(runeProduction * bonusMultiplier);
  }

  // Calculate troop production
  let troopsProduced = calcTroopProduction(empire);
  if (actionBonus === 'industry') {
    troopsProduced = {
      trparm: Math.round((troopsProduced.trparm ?? 0) * bonusMultiplier),
      trplnd: Math.round((troopsProduced.trplnd ?? 0) * bonusMultiplier),
      trpfly: Math.round((troopsProduced.trpfly ?? 0) * bonusMultiplier),
      trpsea: Math.round((troopsProduced.trpsea ?? 0) * bonusMultiplier),
    };
  }

  // Wizard training
  const wizardsProduced = calcWizardTraining(empire);

  // Net calculations
  const netGold = income - finances.expenses - finances.loanPayment;
  const netFood = foodProduction - provisions.consumption;

  // Check for starvation
  const starvation = empire.resources.food + netFood < 0;

  return {
    income,
    expenses: finances.expenses,
    loanPayment: finances.loanPayment,
    netGold,
    foodProduction,
    foodConsumption: provisions.consumption,
    netFood,
    runeProduction,
    troopsProduced,
    wizardsProduced,
    starvation,
  };
}

export function applyEconomyResult(empire: Empire, result: EconomyResult): ApplyEconomyExtra {
  // Track emergency conditions (from QM Promisance TURNS_TROUBLE_* flags)
  let foodEmergency = false;
  let loanEmergency = false;

  // Apply gold change
  empire.resources.gold += result.netGold;

  // Handle negative gold -> add to loan (QM Promisance: "simply running out of money
  // no longer halts turns; instead, it just adds it to your loan")
  if (empire.resources.gold < 0) {
    empire.loan -= empire.resources.gold;
    empire.resources.gold = 0;
  }

  // Apply per-turn bank interest (rate is per-round APR / turns per round)
  const hasDoubleInterest = hasPolicy(empire, 'bank_charter');
  const bankInterest = applyBankInterest(empire, TURNS_PER_ROUND, hasDoubleInterest);

  // Apply per-turn loan interest
  const loanInterest = applyLoanInterest(empire, TURNS_PER_ROUND);

  // Check for emergency loan limit (QM Promisance TURNS_TROUBLE_LOAN)
  // Loan exceeds 2x max loan - halt turns
  if (isLoanEmergency(empire)) {
    loanEmergency = true;
  }

  // Apply food change
  empire.resources.food += result.netFood;

  // Handle starvation (3% desertion) - QM Promisance TURNS_TROUBLE_FOOD
  if (result.starvation || empire.resources.food < 0) {
    empire.resources.food = Math.max(0, empire.resources.food);
    foodEmergency = true;

    const desertionRate = ECONOMY.starvationDesertion;
    empire.peasants = Math.floor(empire.peasants * (1 - desertionRate));
    empire.troops.trparm = Math.floor(empire.troops.trparm * (1 - desertionRate));
    empire.troops.trplnd = Math.floor(empire.troops.trplnd * (1 - desertionRate));
    empire.troops.trpfly = Math.floor(empire.troops.trpfly * (1 - desertionRate));
    empire.troops.trpsea = Math.floor(empire.troops.trpsea * (1 - desertionRate));
    empire.troops.trpwiz = Math.floor(empire.troops.trpwiz * (1 - desertionRate));
  }

  // ============================================
  // PEASANT GROWTH (from prom_empire.php lines 960-974)
  // Population grows toward base capacity, modified by tax rate
  // Bella of Doublehomes multiplies peasants per acre
  // ============================================
  const taxRate = empire.taxRate / 100;
  // Base population capacity: (land * 2 + freeland * 5 + bldpop * 60) / (0.95 + taxrate)
  // Bella multiplies the land-based capacity (default 1.0 if no advisor)
  const peasantDensity = getAdvisorEffectModifier(empire, 'peasant_density') || 1.0;
  const popbase = Math.round(
    (empire.resources.land * 2 * peasantDensity + empire.resources.freeland * 5 + empire.buildings.bldpop * 60) /
    (0.95 + taxRate)
  );

  if (empire.peasants !== popbase) {
    // Base growth/decline: move 1/20th toward capacity each turn
    let peasantChange = (popbase - empire.peasants) / 20;

    // Tax multiplier affects growth rate
    // Higher taxes slow growth, accelerate decline
    const taxFactor = (4 / ((empire.taxRate + 15) / 20)) - (7 / 9);
    const peasMult = peasantChange > 0 ? taxFactor : (1 / taxFactor);

    peasantChange = Math.round(peasantChange * peasMult * peasMult);

    // Don't let population reach zero
    if (empire.peasants + peasantChange < 1) {
      peasantChange = 1 - empire.peasants;
    }

    empire.peasants += peasantChange;
  }

  // Apply rune production
  empire.resources.runes += result.runeProduction;

  // Apply troop production
  empire.troops.trparm += result.troopsProduced.trparm ?? 0;
  empire.troops.trplnd += result.troopsProduced.trplnd ?? 0;
  empire.troops.trpfly += result.troopsProduced.trpfly ?? 0;
  empire.troops.trpsea += result.troopsProduced.trpsea ?? 0;
  empire.troops.trpwiz += result.wizardsProduced;

  // Health regeneration (slower at high tax rates)
  // Brome the Healer adds +2 health per turn
  if (empire.health < 100) {
    const taxPenalty = empire.taxRate > 50 ? (empire.taxRate - 50) / 100 : 0;
    const baseHealthRegen = Math.max(0, ECONOMY.healthRegenPerTurn * (1 - taxPenalty));
    const advisorHealthRegen = getAdvisorEffectModifier(empire, 'health_regen');
    const healthRegen = baseHealthRegen + advisorHealthRegen;
    empire.health = Math.min(100, empire.health + healthRegen);
  }

  // Recalculate networth
  empire.networth = calculateNetworth(empire);

  return { bankInterest, loanInterest, foodEmergency, loanEmergency };
}

// ============================================
// TURN ACTION HELPERS
// ============================================

function createTurnResult(
  empire: Empire,
  turnsSpent: number,
  turnsRemaining: number,
  economyResult: EconomyResult,
  extras?: ApplyEconomyExtra
): TurnActionResult {
  return {
    success: true,
    turnsSpent,
    turnsRemaining,
    income: economyResult.income,
    expenses: economyResult.expenses,
    foodProduction: economyResult.foodProduction,
    foodConsumption: economyResult.foodConsumption,
    runeChange: economyResult.runeProduction,
    troopsProduced: economyResult.troopsProduced,
    loanPayment: economyResult.loanPayment,
    bankInterest: extras?.bankInterest ?? 0,
    loanInterest: extras?.loanInterest ?? 0,
    empire,
  };
}

// ============================================
// TURN ACTIONS
// ============================================

export function processExplore(empire: Empire, turns: number): TurnActionResult {
  let totalIncome = 0;
  let totalExpenses = 0;
  let totalFoodPro = 0;
  let totalFoodCon = 0;
  let totalRunes = 0;
  let totalTroops: Partial<Troops> = {};
  let totalLand = 0;
  let totalLoanPayment = 0;
  let totalBankInterest = 0;
  let totalLoanInterest = 0;
  let turnsActuallySpent = 0;
  let stoppedEarly: TurnStopReason | undefined;

  // Check for open_borders policy (double_explore)
  const exploreMultiplier = hasPolicy(empire, 'open_borders') ? 2 : 1;

  for (let i = 0; i < turns; i++) {
    // Process economy (no bonus for explore)
    const economyResult = processEconomy(empire);
    const extras = applyEconomyResult(empire, economyResult);
    turnsActuallySpent++;

    totalIncome += economyResult.income;
    totalExpenses += economyResult.expenses;
    totalFoodPro += economyResult.foodProduction;
    totalFoodCon += economyResult.foodConsumption;
    totalRunes += economyResult.runeProduction;
    totalLoanPayment += economyResult.loanPayment;
    totalBankInterest += extras.bankInterest;
    totalLoanInterest += extras.loanInterest;

    // Check for emergency conditions (QM Promisance interruptable turn processing)
    if (extras.foodEmergency) {
      stoppedEarly = 'food';
      break;
    }
    if (extras.loanEmergency) {
      stoppedEarly = 'loan';
      break;
    }

    // Gain land (doubled with open_borders policy)
    const landGain = calcLandGain(empire) * exploreMultiplier;
    empire.resources.land += landGain;
    empire.resources.freeland += landGain;
    totalLand += landGain;
  }

  empire.networth = calculateNetworth(empire);

  return {
    success: true,
    turnsSpent: turnsActuallySpent,
    turnsRemaining: 0,
    income: totalIncome,
    expenses: totalExpenses,
    foodProduction: totalFoodPro,
    foodConsumption: totalFoodCon,
    runeChange: totalRunes,
    troopsProduced: totalTroops,
    loanPayment: totalLoanPayment,
    bankInterest: totalBankInterest,
    loanInterest: totalLoanInterest,
    stoppedEarly,
    landGained: totalLand,
    empire,
  };
}

export function processFarm(empire: Empire, turns: number): TurnActionResult {
  let totalIncome = 0;
  let totalExpenses = 0;
  let totalFoodPro = 0;
  let totalFoodCon = 0;
  let totalRunes = 0;
  let totalTroops: Partial<Troops> = { trparm: 0, trplnd: 0, trpfly: 0, trpsea: 0 };
  let totalLoanPayment = 0;
  let totalBankInterest = 0;
  let totalLoanInterest = 0;
  let turnsActuallySpent = 0;
  let stoppedEarly: TurnStopReason | undefined;

  // Check for war_economy policy (farm_industry) - produces troops while farming
  const producesTroops = hasPolicy(empire, 'war_economy');

  for (let i = 0; i < turns; i++) {
    const economyResult = processEconomy(empire, 'farm');
    const extras = applyEconomyResult(empire, economyResult);
    turnsActuallySpent++;

    totalIncome += economyResult.income;
    totalExpenses += economyResult.expenses;
    totalFoodPro += economyResult.foodProduction;
    totalFoodCon += economyResult.foodConsumption;
    totalRunes += economyResult.runeProduction;
    totalLoanPayment += economyResult.loanPayment;
    totalBankInterest += extras.bankInterest;
    totalLoanInterest += extras.loanInterest;

    // Check for emergency conditions (QM Promisance interruptable turn processing)
    if (extras.foodEmergency) {
      stoppedEarly = 'food';
      break;
    }
    if (extras.loanEmergency) {
      stoppedEarly = 'loan';
      break;
    }

    // With war_economy, also produce troops (at 50% rate)
    if (producesTroops) {
      const troopProduction = calcTroopProduction(empire);
      const halfTroops = {
        trparm: Math.floor((troopProduction.trparm ?? 0) * 0.5),
        trplnd: Math.floor((troopProduction.trplnd ?? 0) * 0.5),
        trpfly: Math.floor((troopProduction.trpfly ?? 0) * 0.5),
        trpsea: Math.floor((troopProduction.trpsea ?? 0) * 0.5),
      };
      empire.troops.trparm += halfTroops.trparm;
      empire.troops.trplnd += halfTroops.trplnd;
      empire.troops.trpfly += halfTroops.trpfly;
      empire.troops.trpsea += halfTroops.trpsea;
      totalTroops.trparm! += halfTroops.trparm;
      totalTroops.trplnd! += halfTroops.trplnd;
      totalTroops.trpfly! += halfTroops.trpfly;
      totalTroops.trpsea! += halfTroops.trpsea;
    }
  }

  return {
    success: true,
    turnsSpent: turnsActuallySpent,
    turnsRemaining: 0,
    income: totalIncome,
    expenses: totalExpenses,
    foodProduction: totalFoodPro,
    foodConsumption: totalFoodCon,
    runeChange: totalRunes,
    troopsProduced: totalTroops,
    loanPayment: totalLoanPayment,
    bankInterest: totalBankInterest,
    loanInterest: totalLoanInterest,
    stoppedEarly,
    empire,
  };
}

export function processCash(empire: Empire, turns: number): TurnActionResult {
  let totalIncome = 0;
  let totalExpenses = 0;
  let totalFoodPro = 0;
  let totalFoodCon = 0;
  let totalRunes = 0;
  let totalTroops: Partial<Troops> = {};
  let totalLoanPayment = 0;
  let totalBankInterest = 0;
  let totalLoanInterest = 0;
  let turnsActuallySpent = 0;
  let stoppedEarly: TurnStopReason | undefined;

  for (let i = 0; i < turns; i++) {
    const economyResult = processEconomy(empire, 'cash');
    const extras = applyEconomyResult(empire, economyResult);
    turnsActuallySpent++;

    totalIncome += economyResult.income;
    totalExpenses += economyResult.expenses;
    totalFoodPro += economyResult.foodProduction;
    totalFoodCon += economyResult.foodConsumption;
    totalRunes += economyResult.runeProduction;
    totalLoanPayment += economyResult.loanPayment;
    totalBankInterest += extras.bankInterest;
    totalLoanInterest += extras.loanInterest;

    // Check for emergency conditions (QM Promisance interruptable turn processing)
    if (extras.foodEmergency) {
      stoppedEarly = 'food';
      break;
    }
    if (extras.loanEmergency) {
      stoppedEarly = 'loan';
      break;
    }
  }

  return {
    success: true,
    turnsSpent: turnsActuallySpent,
    turnsRemaining: 0,
    income: totalIncome,
    expenses: totalExpenses,
    foodProduction: totalFoodPro,
    foodConsumption: totalFoodCon,
    runeChange: totalRunes,
    troopsProduced: totalTroops,
    loanPayment: totalLoanPayment,
    bankInterest: totalBankInterest,
    loanInterest: totalLoanInterest,
    stoppedEarly,
    empire,
  };
}

export function processMeditate(empire: Empire, turns: number): TurnActionResult {
  let totalIncome = 0;
  let totalExpenses = 0;
  let totalFoodPro = 0;
  let totalFoodCon = 0;
  let totalRunes = 0;
  let totalTroops: Partial<Troops> = {};
  let totalLoanPayment = 0;
  let totalBankInterest = 0;
  let totalLoanInterest = 0;
  let turnsActuallySpent = 0;
  let stoppedEarly: TurnStopReason | undefined;

  for (let i = 0; i < turns; i++) {
    const economyResult = processEconomy(empire, 'meditate');
    const extras = applyEconomyResult(empire, economyResult);
    turnsActuallySpent++;

    totalIncome += economyResult.income;
    totalExpenses += economyResult.expenses;
    totalFoodPro += economyResult.foodProduction;
    totalFoodCon += economyResult.foodConsumption;
    totalRunes += economyResult.runeProduction;
    totalLoanPayment += economyResult.loanPayment;
    totalBankInterest += extras.bankInterest;
    totalLoanInterest += extras.loanInterest;

    // Check for emergency conditions (QM Promisance interruptable turn processing)
    if (extras.foodEmergency) {
      stoppedEarly = 'food';
      break;
    }
    if (extras.loanEmergency) {
      stoppedEarly = 'loan';
      break;
    }
  }

  return {
    success: true,
    turnsSpent: turnsActuallySpent,
    turnsRemaining: 0,
    income: totalIncome,
    expenses: totalExpenses,
    foodProduction: totalFoodPro,
    foodConsumption: totalFoodCon,
    runeChange: totalRunes,
    troopsProduced: totalTroops,
    loanPayment: totalLoanPayment,
    bankInterest: totalBankInterest,
    loanInterest: totalLoanInterest,
    stoppedEarly,
    empire,
  };
}

export function processIndustry(empire: Empire, turns: number): TurnActionResult {
  let totalIncome = 0;
  let totalExpenses = 0;
  let totalFoodPro = 0;
  let totalFoodCon = 0;
  let totalRunes = 0;
  let totalTroops: Partial<Troops> = { trparm: 0, trplnd: 0, trpfly: 0, trpsea: 0 };
  let totalLoanPayment = 0;
  let totalBankInterest = 0;
  let totalLoanInterest = 0;
  let turnsActuallySpent = 0;
  let stoppedEarly: TurnStopReason | undefined;

  for (let i = 0; i < turns; i++) {
    const economyResult = processEconomy(empire, 'industry');
    const extras = applyEconomyResult(empire, economyResult);
    turnsActuallySpent++;

    totalIncome += economyResult.income;
    totalExpenses += economyResult.expenses;
    totalFoodPro += economyResult.foodProduction;
    totalFoodCon += economyResult.foodConsumption;
    totalRunes += economyResult.runeProduction;
    totalLoanPayment += economyResult.loanPayment;
    totalBankInterest += extras.bankInterest;
    totalLoanInterest += extras.loanInterest;

    totalTroops.trparm! += economyResult.troopsProduced.trparm ?? 0;
    totalTroops.trplnd! += economyResult.troopsProduced.trplnd ?? 0;
    totalTroops.trpfly! += economyResult.troopsProduced.trpfly ?? 0;
    totalTroops.trpsea! += economyResult.troopsProduced.trpsea ?? 0;

    // Check for emergency conditions (QM Promisance interruptable turn processing)
    if (extras.foodEmergency) {
      stoppedEarly = 'food';
      break;
    }
    if (extras.loanEmergency) {
      stoppedEarly = 'loan';
      break;
    }
  }

  return {
    success: true,
    turnsSpent: turnsActuallySpent,
    turnsRemaining: 0,
    income: totalIncome,
    expenses: totalExpenses,
    foodProduction: totalFoodPro,
    foodConsumption: totalFoodCon,
    runeChange: totalRunes,
    troopsProduced: totalTroops,
    loanPayment: totalLoanPayment,
    bankInterest: totalBankInterest,
    loanInterest: totalLoanInterest,
    stoppedEarly,
    empire,
  };
}

export function processBuild(
  empire: Empire,
  allocation: Partial<Buildings>
): TurnActionResult {
  // Calculate total buildings to construct
  const totalToConstruct =
    (allocation.bldpop ?? 0) +
    (allocation.bldcash ?? 0) +
    (allocation.bldtrp ?? 0) +
    (allocation.bldcost ?? 0) +
    (allocation.bldfood ?? 0) +
    (allocation.bldwiz ?? 0) +
    (allocation.blddef ?? 0);

  // Validate free land
  if (totalToConstruct > empire.resources.freeland) {
    return {
      success: false,
      turnsSpent: 0,
      turnsRemaining: 0,
      income: 0,
      expenses: 0,
      foodProduction: 0,
      foodConsumption: 0,
      runeChange: 0,
      troopsProduced: {},
      loanPayment: 0,
      bankInterest: 0,
      loanInterest: 0,
      empire,
    };
  }

  // Calculate cost: BUILD_COST + (land * multiplier) per building, reduced by race building modifier
  const baseCostPerBuilding = ECONOMY.buildingBaseCost +
    empire.resources.land * ECONOMY.buildingLandMultiplier;
  const buildingModifier = getModifier(empire, 'building');
  // Higher building modifier = cheaper buildings (divide by modifier)
  const totalCost = Math.round((baseCostPerBuilding * totalToConstruct) / buildingModifier);

  if (totalCost > empire.resources.gold) {
    return {
      success: false,
      turnsSpent: 0,
      turnsRemaining: 0,
      income: 0,
      expenses: 0,
      foodProduction: 0,
      foodConsumption: 0,
      runeChange: 0,
      troopsProduced: {},
      loanPayment: 0,
      bankInterest: 0,
      loanInterest: 0,
      empire,
    };
  }

  // Calculate turns needed - build rate scales with land (1 building per 20 acres)
  const buildRate = Math.max(1, Math.floor(empire.resources.land / 20));
  const turnsNeeded = Math.max(1, Math.ceil(totalToConstruct / buildRate));

  // Process economy for build turns
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
    const economyResult = processEconomy(empire);
    const extras = applyEconomyResult(empire, economyResult);
    turnsActuallySpent++;

    totalIncome += economyResult.income;
    totalExpenses += economyResult.expenses;
    totalFoodPro += economyResult.foodProduction;
    totalFoodCon += economyResult.foodConsumption;
    totalRunes += economyResult.runeProduction;
    totalLoanPayment += economyResult.loanPayment;
    totalBankInterest += extras.bankInterest;
    totalLoanInterest += extras.loanInterest;

    // Check for emergency conditions (QM Promisance interruptable turn processing)
    if (extras.foodEmergency) {
      stoppedEarly = 'food';
      break;
    }
    if (extras.loanEmergency) {
      stoppedEarly = 'loan';
      break;
    }
  }

  // Apply building construction (buildings still complete even if stopped early -
  // the cost was already validated upfront)
  empire.resources.gold -= totalCost;

  empire.buildings.bldpop += allocation.bldpop ?? 0;
  empire.buildings.bldcash += allocation.bldcash ?? 0;
  empire.buildings.bldtrp += allocation.bldtrp ?? 0;
  empire.buildings.bldcost += allocation.bldcost ?? 0;
  empire.buildings.bldfood += allocation.bldfood ?? 0;
  empire.buildings.bldwiz += allocation.bldwiz ?? 0;
  empire.buildings.blddef += allocation.blddef ?? 0;

  empire.resources.freeland -= totalToConstruct;

  empire.networth = calculateNetworth(empire);

  return {
    success: true,
    turnsSpent: turnsActuallySpent,
    turnsRemaining: 0,
    income: totalIncome - totalCost,
    expenses: totalExpenses,
    foodProduction: totalFoodPro,
    foodConsumption: totalFoodCon,
    runeChange: totalRunes,
    troopsProduced: {},
    loanPayment: totalLoanPayment,
    bankInterest: totalBankInterest,
    loanInterest: totalLoanInterest,
    stoppedEarly,
    buildingsConstructed: allocation,
    empire,
  };
}

// ============================================
// HELPER: Execute any turn action
// ============================================

export function executeTurnAction(
  empire: Empire,
  action: TurnAction,
  turns: number,
  options?: {
    buildingAllocation?: Partial<Buildings>;
  }
): TurnActionResult {
  switch (action) {
    case 'explore':
      return processExplore(empire, turns);
    case 'farm':
      return processFarm(empire, turns);
    case 'cash':
      return processCash(empire, turns);
    case 'meditate':
      return processMeditate(empire, turns);
    case 'industry':
      return processIndustry(empire, turns);
    case 'build':
      if (!options?.buildingAllocation) {
        return {
          success: false,
          turnsSpent: 0,
          turnsRemaining: 0,
          income: 0,
          expenses: 0,
          foodProduction: 0,
          foodConsumption: 0,
          runeChange: 0,
          troopsProduced: {},
          loanPayment: 0,
          bankInterest: 0,
          loanInterest: 0,
          empire,
        };
      }
      return processBuild(empire, options.buildingAllocation);
    default:
      return {
        success: false,
        turnsSpent: 0,
        turnsRemaining: 0,
        income: 0,
        expenses: 0,
        foodProduction: 0,
        foodConsumption: 0,
        runeChange: 0,
        troopsProduced: {},
        loanPayment: 0,
        bankInterest: 0,
        loanInterest: 0,
        empire,
      };
  }
}
