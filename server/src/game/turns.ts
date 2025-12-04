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
  hasAdvisorEffect,
  getAdvisorEffectModifier,
} from './empire';
import { applyBankInterest, applyLoanInterest, isLoanEmergency } from './bank';
import { getBotInnateBonusValue } from './bot/strategies';

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
  const eraEconomyModifier = getEraModifier(empire, 'economy');

  return Math.round(ECONOMY.pciBase * (1 + bldcashRatio) * incomeModifier * eraEconomyModifier);
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

  // Market Master: +50% market building income
  const marketBoost = getAdvisorEffectModifier(empire, 'market_boost');
  const buildingIncome = empire.buildings.bldcash * ECONOMY.cashBuildingIncome * (1 + marketBoost);

  let income = Math.round((peasantIncome + buildingIncome) / sizeBonus);

  // Tax Collector / Treasury Master: +25%/+50% income
  const incomeBoost = getAdvisorEffectModifier(empire, 'income_boost');

  // Bot innate income bonus (e.g., Shadow Merchant gets +25%)
  const botIncomeBonus = getBotInnateBonusValue(empire, 'income') ?? 0;

  income = Math.round(income * (1 + incomeBoost + botIncomeBonus));

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

  // Trade Network: +50% exchange effectiveness
  const exchangeBoost = getAdvisorEffectModifier(empire, 'exchange_boost');
  const exchangeContribution = (empire.buildings.bldcost / land) * (1 + exchangeBoost);

  const expBonus = Math.min(0.5, (expenseModifier - 1) + exchangeContribution);
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
  const eraFoodModifier = getEraModifier(empire, 'foodProduction');

  // Bot innate food production bonus (e.g., Grain Mother gets +50%)
  const botFoodBonus = getBotInnateBonusValue(empire, 'foodProduction') ?? 0;

  const production = Math.round((freelandProduction + farmProduction) * foodproModifier * eraFoodModifier * (1 + botFoodBonus));

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

  // Advisor bonuses for troop production
  const troopProductionBonus = getAdvisorEffectModifier(empire, 'troop_production');

  // Bot innate troop production bonus (e.g., Iron Baron gets +50%)
  const botTroopBonus = getBotInnateBonusValue(empire, 'troopProduction') ?? 0;

  // Production rates for each unit type (from QM Promisance)
  // trparm: 1.2x, trplnd: 0.6x, trpfly: 0.3x, trpsea: 0.2x
  const productionRates = {
    trparm: 1.2,
    trplnd: 0.6,
    trpfly: 0.3,
    trpsea: 0.2,
  };

  // Get unit-specific production bonuses
  const getUnitBonus = (unitType: string): number => {
    let bonus = 0;
    for (const advisor of empire.advisors) {
      if (advisor.effect.type === 'unit_production' && advisor.effect.condition === unitType) {
        bonus += advisor.effect.modifier;
      }
    }
    return bonus;
  };

  return {
    trparm: Math.floor(totalProduction * (industryAllocation.trparm / 100) * productionRates.trparm * (1 + troopProductionBonus + botTroopBonus + getUnitBonus('trparm'))),
    trplnd: Math.floor(totalProduction * (industryAllocation.trplnd / 100) * productionRates.trplnd * (1 + troopProductionBonus + botTroopBonus + getUnitBonus('trplnd'))),
    trpfly: Math.floor(totalProduction * (industryAllocation.trpfly / 100) * productionRates.trpfly * (1 + troopProductionBonus + botTroopBonus + getUnitBonus('trpfly'))),
    trpsea: Math.floor(totalProduction * (industryAllocation.trpsea / 100) * productionRates.trpsea * (1 + troopProductionBonus + botTroopBonus + getUnitBonus('trpsea'))),
  };
}

// ============================================
// RUNE PRODUCTION
// ============================================

export function calcRuneProduction(empire: Empire): number {
  // Runes from wizard towers
  const baseProduction = empire.buildings.bldwiz * 3;
  const runeproModifier = getModifier(empire, 'runepro');
  const eraEnergyModifier = getEraModifier(empire, 'energy');

  return Math.floor(baseProduction * runeproModifier * eraEnergyModifier);
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

  // Farm Profiteer: +25% troop production during farm turns
  if (actionBonus === 'farm') {
    const farmIndustryBoost = getAdvisorEffectModifier(empire, 'farm_industry_boost');
    if (farmIndustryBoost > 0) {
      troopsProduced = {
        trparm: Math.round((troopsProduced.trparm ?? 0) * (1 + farmIndustryBoost)),
        trplnd: Math.round((troopsProduced.trplnd ?? 0) * (1 + farmIndustryBoost)),
        trpfly: Math.round((troopsProduced.trpfly ?? 0) * (1 + farmIndustryBoost)),
        trpsea: Math.round((troopsProduced.trpsea ?? 0) * (1 + farmIndustryBoost)),
      };
    }
  }

  // Trade Profiteer: +25% troop production during cash turns
  if (actionBonus === 'cash') {
    const cashIndustryBoost = getAdvisorEffectModifier(empire, 'cash_industry_boost');
    if (cashIndustryBoost > 0) {
      troopsProduced = {
        trparm: Math.round((troopsProduced.trparm ?? 0) * (1 + cashIndustryBoost)),
        trplnd: Math.round((troopsProduced.trplnd ?? 0) * (1 + cashIndustryBoost)),
        trpfly: Math.round((troopsProduced.trpfly ?? 0) * (1 + cashIndustryBoost)),
        trpsea: Math.round((troopsProduced.trpsea ?? 0) * (1 + cashIndustryBoost)),
      };
    }
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
  // Royal Banker advisor doubles interest
  const hasDoubleInterest = hasAdvisorEffect(empire, 'double_bank_interest');
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
  // Lenient Collector: peasants ignore tax rate effects
  // ============================================
  const taxRate = empire.taxRate / 100;
  const hasLenientTaxes = getAdvisorEffectModifier(empire, 'lenient_taxes') > 0;

  // Base population capacity: (land * 2 + freeland * 5 + bldpop * 60) / (0.95 + taxrate)
  // Bella multiplies the land-based capacity (default 1.0 if no advisor)
  // Lenient Collector: tax rate doesn't affect capacity
  const peasantDensity = getAdvisorEffectModifier(empire, 'peasant_density') || 1.0;
  const taxDivisor = hasLenientTaxes ? 0.95 : (0.95 + taxRate);
  const popbase = Math.round(
    (empire.resources.land * 2 * peasantDensity + empire.resources.freeland * 5 + empire.buildings.bldpop * 60) /
    taxDivisor
  );

  if (empire.peasants !== popbase) {
    // Base growth/decline: move 1/20th toward capacity each turn
    let peasantChange = (popbase - empire.peasants) / 20;

    // Tax multiplier affects growth rate (unless Lenient Collector)
    // Higher taxes slow growth, accelerate decline
    if (!hasLenientTaxes) {
      const taxFactor = (4 / ((empire.taxRate + 15) / 20)) - (7 / 9);
      const peasMult = peasantChange > 0 ? taxFactor : (1 / taxFactor);
      peasantChange = peasantChange * peasMult * peasMult;
    }

    peasantChange = Math.round(peasantChange);

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
// TURN ACTIONS - Generic turn processor
// ============================================

interface TurnTotals {
  income: number;
  expenses: number;
  foodPro: number;
  foodCon: number;
  runes: number;
  troops: Partial<Troops>;
  land: number;
  loanPayment: number;
  bankInterest: number;
  loanInterest: number;
  turnsSpent: number;
  stoppedEarly?: TurnStopReason;
}

function initTotals(): TurnTotals {
  return {
    income: 0,
    expenses: 0,
    foodPro: 0,
    foodCon: 0,
    runes: 0,
    troops: { trparm: 0, trplnd: 0, trpfly: 0, trpsea: 0, trpwiz: 0 },
    land: 0,
    loanPayment: 0,
    bankInterest: 0,
    loanInterest: 0,
    turnsSpent: 0,
  };
}

function accumulateEconomy(totals: TurnTotals, economy: EconomyResult, extras: ApplyEconomyExtra): void {
  totals.income += economy.income;
  totals.expenses += economy.expenses;
  totals.foodPro += economy.foodProduction;
  totals.foodCon += economy.foodConsumption;
  totals.runes += economy.runeProduction;
  totals.loanPayment += economy.loanPayment;
  totals.bankInterest += extras.bankInterest;
  totals.loanInterest += extras.loanInterest;
  totals.troops.trparm! += economy.troopsProduced.trparm ?? 0;
  totals.troops.trplnd! += economy.troopsProduced.trplnd ?? 0;
  totals.troops.trpfly! += economy.troopsProduced.trpfly ?? 0;
  totals.troops.trpsea! += economy.troopsProduced.trpsea ?? 0;
  totals.troops.trpwiz! += economy.wizardsProduced;
  totals.turnsSpent++;
}

function checkEmergency(totals: TurnTotals, extras: ApplyEconomyExtra): boolean {
  if (extras.foodEmergency) {
    totals.stoppedEarly = 'food';
    return true;
  }
  if (extras.loanEmergency) {
    totals.stoppedEarly = 'loan';
    return true;
  }
  return false;
}

function buildResult(totals: TurnTotals, empire: Empire, extra?: Partial<TurnActionResult>): TurnActionResult {
  return {
    success: true,
    turnsSpent: totals.turnsSpent,
    turnsRemaining: 0,
    income: totals.income,
    expenses: totals.expenses,
    foodProduction: totals.foodPro,
    foodConsumption: totals.foodCon,
    runeChange: totals.runes,
    troopsProduced: totals.troops,
    loanPayment: totals.loanPayment,
    bankInterest: totals.bankInterest,
    loanInterest: totals.loanInterest,
    stoppedEarly: totals.stoppedEarly,
    empire,
    ...extra,
  };
}

/**
 * Generic turn processor for simple actions (cash, meditate, industry)
 */
function processSimpleTurns(empire: Empire, turns: number, action?: TurnAction): TurnActionResult {
  const totals = initTotals();

  for (let i = 0; i < turns; i++) {
    const economy = processEconomy(empire, action);
    const extras = applyEconomyResult(empire, economy);
    accumulateEconomy(totals, economy, extras);
    if (checkEmergency(totals, extras)) break;
  }

  return buildResult(totals, empire);
}

export function processExplore(empire: Empire, turns: number): TurnActionResult {
  const totals = initTotals();
  // Calculate explore multiplier from advisors
  // Frontier Scout (double_explore) = 2x, Expansionist = 3x (uses modifier value)
  let exploreMultiplier = 1;
  if (hasAdvisorEffect(empire, 'double_explore')) {
    exploreMultiplier = 2;
  }
  const expansionistMod = getAdvisorEffectModifier(empire, 'expansionist');
  if (expansionistMod > 0) {
    exploreMultiplier = Math.max(exploreMultiplier, expansionistMod);
  }

  // Bot innate explore multiplier (e.g., The Locust gets 2x)
  const botExploreMultiplier = getBotInnateBonusValue(empire, 'exploreMultiplier') ?? 1;
  exploreMultiplier = Math.max(exploreMultiplier, botExploreMultiplier);

  for (let i = 0; i < turns; i++) {
    const economy = processEconomy(empire);
    const extras = applyEconomyResult(empire, economy);
    accumulateEconomy(totals, economy, extras);
    if (checkEmergency(totals, extras)) break;

    // Gain land (doubled with Frontier Scout advisor)
    const landGain = calcLandGain(empire) * exploreMultiplier;
    empire.resources.land += landGain;
    empire.resources.freeland += landGain;
    totals.land += landGain;

    // Pioneer: gain peasants when exploring
    const pioneerMod = getAdvisorEffectModifier(empire, 'pioneer');
    if (pioneerMod > 0) {
      const peasantsGained = Math.floor(landGain * pioneerMod);
      empire.peasants += peasantsGained;
    }
  }

  empire.networth = calculateNetworth(empire);
  return buildResult(totals, empire, { landGained: totals.land });
}

export function processFarm(empire: Empire, turns: number): TurnActionResult {
  const totals = initTotals();
  const producesTroops = hasAdvisorEffect(empire, 'farm_industry');

  for (let i = 0; i < turns; i++) {
    const economy = processEconomy(empire, 'farm');
    const extras = applyEconomyResult(empire, economy);
    accumulateEconomy(totals, economy, extras);
    if (checkEmergency(totals, extras)) break;

    // With farm_industry advisor, also produce extra troops (at 50% rate)
    if (producesTroops) {
      const troopProd = calcTroopProduction(empire);
      const half = {
        trparm: Math.floor((troopProd.trparm ?? 0) * 0.5),
        trplnd: Math.floor((troopProd.trplnd ?? 0) * 0.5),
        trpfly: Math.floor((troopProd.trpfly ?? 0) * 0.5),
        trpsea: Math.floor((troopProd.trpsea ?? 0) * 0.5),
      };
      empire.troops.trparm += half.trparm;
      empire.troops.trplnd += half.trplnd;
      empire.troops.trpfly += half.trpfly;
      empire.troops.trpsea += half.trpsea;
      totals.troops.trparm! += half.trparm;
      totals.troops.trplnd! += half.trplnd;
      totals.troops.trpfly! += half.trpfly;
      totals.troops.trpsea! += half.trpsea;
    }
  }

  return buildResult(totals, empire);
}

export function processCash(empire: Empire, turns: number): TurnActionResult {
  return processSimpleTurns(empire, turns, 'cash');
}

export function processMeditate(empire: Empire, turns: number): TurnActionResult {
  return processSimpleTurns(empire, turns, 'meditate');
}

export function processIndustry(empire: Empire, turns: number): TurnActionResult {
  return processSimpleTurns(empire, turns, 'industry');
}

function failedBuildResult(empire: Empire): TurnActionResult {
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
    return failedBuildResult(empire);
  }

  // Calculate cost: BUILD_COST + (land * multiplier) per building, reduced by race building modifier
  const baseCostPerBuilding = ECONOMY.buildingBaseCost +
    empire.resources.land * ECONOMY.buildingLandMultiplier;
  const buildingModifier = getModifier(empire, 'building');

  // build_rate advisors with 'per_turn_with_discount' also reduce cost by 20%
  let costMultiplier = 1.0;
  for (const advisor of empire.advisors) {
    if (advisor.effect.type === 'build_rate' && advisor.effect.condition === 'per_turn_with_discount') {
      costMultiplier *= 0.80; // 20% discount per master_builder
    } else if (advisor.effect.type === 'build_rate' && advisor.effect.condition === 'per_turn') {
      costMultiplier *= 0.75; // 25% discount for royal_architect
    }
  }

  const totalCost = Math.round((baseCostPerBuilding * totalToConstruct * costMultiplier) / buildingModifier);

  if (totalCost > empire.resources.gold) {
    return failedBuildResult(empire);
  }

  // Calculate turns needed - build rate scales with land (1 building per 20 acres)
  // build_rate advisors add bonus buildings per turn
  let buildRateBonus = 0;
  for (const advisor of empire.advisors) {
    if (advisor.effect.type === 'build_rate') {
      buildRateBonus += advisor.effect.modifier;
    }
  }
  const buildRate = Math.max(1, Math.floor(empire.resources.land / 20) + buildRateBonus);
  // Cap turnsNeeded to prevent infinite loops from excessive building requests
  const turnsNeeded = Math.min(TURNS_PER_ROUND, Math.max(1, Math.ceil(totalToConstruct / buildRate)));

  // Process economy for build turns
  const totals = initTotals();

  for (let i = 0; i < turnsNeeded; i++) {
    const economy = processEconomy(empire);
    const extras = applyEconomyResult(empire, economy);
    accumulateEconomy(totals, economy, extras);
    if (checkEmergency(totals, extras)) break;
  }

  // Apply building construction (buildings still complete even if stopped early -
  // the cost was already validated upfront)
  empire.resources.gold -= totalCost;

  // bldpop and blddef removed from game
  empire.buildings.bldcash += allocation.bldcash ?? 0;
  empire.buildings.bldtrp += allocation.bldtrp ?? 0;
  empire.buildings.bldcost += allocation.bldcost ?? 0;
  empire.buildings.bldfood += allocation.bldfood ?? 0;
  empire.buildings.bldwiz += allocation.bldwiz ?? 0;

  empire.resources.freeland -= totalToConstruct;
  empire.networth = calculateNetworth(empire);

  // Adjust income to reflect building cost
  totals.income -= totalCost;

  return buildResult(totals, empire, { buildingsConstructed: allocation });
}

export function processDemolish(
  empire: Empire,
  allocation: Partial<Buildings>
): TurnActionResult {
  // Calculate total buildings to demolish
  const totalToDemolish =
    (allocation.bldpop ?? 0) +
    (allocation.bldcash ?? 0) +
    (allocation.bldtrp ?? 0) +
    (allocation.bldcost ?? 0) +
    (allocation.bldfood ?? 0) +
    (allocation.bldwiz ?? 0) +
    (allocation.blddef ?? 0);

  // Validate we have enough buildings to demolish
  if ((allocation.bldcash ?? 0) > empire.buildings.bldcash ||
      (allocation.bldtrp ?? 0) > empire.buildings.bldtrp ||
      (allocation.bldcost ?? 0) > empire.buildings.bldcost ||
      (allocation.bldfood ?? 0) > empire.buildings.bldfood ||
      (allocation.bldwiz ?? 0) > empire.buildings.bldwiz ||
      totalToDemolish <= 0) {
    return failedBuildResult(empire);
  }

  // Calculate refund: BUILD_COST + (land * multiplier) per building * refund percent
  const baseCostPerBuilding = ECONOMY.buildingBaseCost +
    empire.resources.land * ECONOMY.buildingLandMultiplier;
  const refund = Math.round(baseCostPerBuilding * totalToDemolish * ECONOMY.demolishRefundPercent);

  // Calculate turns needed - demolish rate scales with land (same as build rate)
  let buildRateBonus = 0;
  for (const advisor of empire.advisors) {
    if (advisor.effect.type === 'build_rate') {
      buildRateBonus += advisor.effect.modifier;
    }
  }
  const demolishRate = Math.max(1, Math.floor(empire.resources.land / 20) + buildRateBonus);
  // Cap turnsNeeded to prevent infinite loops from excessive demolish requests
  const turnsNeeded = Math.min(TURNS_PER_ROUND, Math.max(1, Math.ceil(totalToDemolish / demolishRate)));

  // Process economy for demolish turns
  const totals = initTotals();

  for (let i = 0; i < turnsNeeded; i++) {
    const economy = processEconomy(empire);
    const extras = applyEconomyResult(empire, economy);
    accumulateEconomy(totals, economy, extras);
    if (checkEmergency(totals, extras)) break;
  }

  // Apply demolition - remove buildings, add gold refund, increase freeland
  empire.buildings.bldcash -= allocation.bldcash ?? 0;
  empire.buildings.bldtrp -= allocation.bldtrp ?? 0;
  empire.buildings.bldcost -= allocation.bldcost ?? 0;
  empire.buildings.bldfood -= allocation.bldfood ?? 0;
  empire.buildings.bldwiz -= allocation.bldwiz ?? 0;

  empire.resources.freeland += totalToDemolish;
  empire.resources.gold += refund;
  empire.networth = calculateNetworth(empire);

  // Adjust income to reflect refund
  totals.income += refund;

  // Return negative values to indicate demolition
  const demolishedAllocation: Partial<Buildings> = {};
  if (allocation.bldcash) demolishedAllocation.bldcash = -(allocation.bldcash);
  if (allocation.bldtrp) demolishedAllocation.bldtrp = -(allocation.bldtrp);
  if (allocation.bldcost) demolishedAllocation.bldcost = -(allocation.bldcost);
  if (allocation.bldfood) demolishedAllocation.bldfood = -(allocation.bldfood);
  if (allocation.bldwiz) demolishedAllocation.bldwiz = -(allocation.bldwiz);

  return buildResult(totals, empire, { buildingsConstructed: demolishedAllocation });
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
    demolishAllocation?: Partial<Buildings>;
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
        return failedBuildResult(empire);
      }
      return processBuild(empire, options.buildingAllocation);
    case 'demolish':
      if (!options?.demolishAllocation) {
        return failedBuildResult(empire);
      }
      return processDemolish(empire, options.demolishAllocation);
    default:
      return failedBuildResult(empire);
  }
}
