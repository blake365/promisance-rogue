/**
 * Spell system matching QM Promisance 4.81
 * Reference: classes/prom_spell.php, spells/*.php
 */

import type { Empire, SpellType, SpellResult, TurnActionResult, Troops, Buildings, SpyIntel, BotEmpire } from '../types';
import { SPELLS, ECONOMY, COMBAT } from './constants';
import {
  getModifier,
  calculateNetworth,
  hasActiveShield,
  canChangeEra,
  subtractTroops,
} from './empire';
import { processEconomy, applyEconomyResult, calcSizeBonus } from './turns';

// ============================================
// SPELL COST CALCULATION
// From prom_spell.php base_cost()
// ============================================

export function getBaseCost(empire: Empire): number {
  // base_cost = (land * 0.10) + 100 + (bldwiz * 0.20) * magic_modifier * sizeBonus
  const magicModifier = getModifier(empire, 'magic');
  const sizeBonus = calcSizeBonus(empire.networth);

  return (empire.resources.land * 0.10) + 100 + (empire.buildings.bldwiz * 0.20) * magicModifier * sizeBonus;
}

export function getSpellCost(empire: Empire, spell: SpellType): number {
  const baseCost = getBaseCost(empire);
  const multiplier = SPELLS.costs[spell] ?? 1;

  // Apply spell_cost advisor bonus (e.g., wizard_conclave gives -20%)
  let spellCostReduction = 0;
  for (const advisor of empire.advisors) {
    if (advisor.effect.type === 'spell_cost') {
      spellCostReduction += advisor.effect.modifier; // Negative value = reduction
    }
  }

  // spell_cost modifier is negative, so (1 + modifier) reduces cost
  const finalCost = baseCost * multiplier * (1 + spellCostReduction);

  return Math.ceil(Math.max(1, finalCost)); // Always cost at least 1 rune
}

export function canCastSpell(
  empire: Empire,
  spell: SpellType,
  turnsRemaining: number,
  currentRound?: number
): { canCast: boolean; reason?: string } {
  const cost = getSpellCost(empire, spell);
  const turnsNeeded = SPELLS.turnsPerSpell;

  if (turnsRemaining < turnsNeeded) {
    return { canCast: false, reason: 'Not enough turns' };
  }

  if (empire.resources.runes < cost) {
    return { canCast: false, reason: 'Not enough runes' };
  }

  if (empire.health < ECONOMY.minHealthToAct) {
    return { canCast: false, reason: 'Health too low' };
  }

  if (empire.troops.trpwiz < 1) {
    return { canCast: false, reason: 'No wizards available' };
  }

  // Era change spells have cooldown
  if ((spell === 'advance' || spell === 'regress') && currentRound !== undefined) {
    if (!canChangeEra(empire, currentRound)) {
      return { canCast: false, reason: 'Era change on cooldown' };
    }
  }

  // Can't advance past future
  if (spell === 'advance' && empire.era === 'future') {
    return { canCast: false, reason: 'Already in future era' };
  }

  // Can't regress past past
  if (spell === 'regress' && empire.era === 'past') {
    return { canCast: false, reason: 'Already in past era' };
  }

  return { canCast: true };
}

// ============================================
// WIZARD POWER CALCULATION
// From prom_spell.php getpower_enemy()
// ============================================

export function getWizardPowerEnemy(caster: Empire, target: Empire): number {
  // uratio = trpwiz / ((selfLand + otherLand) / 2) * magic_modifier
  const casterMagic = getModifier(caster, 'magic');
  const targetMagic = getModifier(target, 'magic');

  const avgLand = (caster.resources.land + target.resources.land) / 2;
  const uratio = caster.troops.trpwiz / avgLand * casterMagic;

  // eratio = max(other.trpwiz, 1) / other.land * 1.05 * other.magic_modifier
  const eratio = Math.max(target.troops.trpwiz, 1) / target.resources.land * 1.05 * targetMagic;

  return uratio / eratio;
}

// ============================================
// WIZARD LOSS ON FAILURE
// From prom_spell.php getwizloss_enemy()
// ============================================

function getWizardLoss(empire: Empire): number {
  // Random between 1-5% of wizards
  const minLoss = Math.ceil(empire.troops.trpwiz * 0.01);
  const maxLoss = Math.ceil(empire.troops.trpwiz * 0.05 + 1);

  const wizloss = minLoss + Math.floor(Math.random() * (maxLoss - minLoss + 1));

  return Math.min(wizloss, empire.troops.trpwiz);
}

// ============================================
// SELF SPELLS
// ============================================

function castShield(empire: Empire, currentRound: number): SpellResult {
  // Shield lasts until end of current round's bot phase
  empire.shieldExpiresRound = currentRound;

  return {
    success: true,
    spell: 'shield',
    effectApplied: 'shield',
    effectDuration: 1, // 1 round
  };
}

function castFood(empire: Empire): SpellResult {
  const magicModifier = getModifier(empire, 'magic');
  const wizardPower = empire.troops.trpwiz * magicModifier;

  // Food gained scales with wizard power
  const foodGained = Math.floor(wizardPower * 50);

  empire.resources.food += foodGained;

  return {
    success: true,
    spell: 'food',
    resourcesGained: { food: foodGained },
  };
}

function castCashSpell(empire: Empire): SpellResult {
  const magicModifier = getModifier(empire, 'magic');
  const wizardPower = empire.troops.trpwiz * magicModifier;

  // Gold gained scales with wizard power
  const goldGained = Math.floor(wizardPower * 100);

  empire.resources.gold += goldGained;

  return {
    success: true,
    spell: 'cash',
    resourcesGained: { gold: goldGained },
  };
}

function castRunesSpell(empire: Empire): SpellResult {
  const magicModifier = getModifier(empire, 'magic');
  const towerBonus = empire.buildings.bldwiz * 0.5;

  // Runes gained scales with magic and towers
  const runesGained = Math.floor((20 + towerBonus) * magicModifier);

  empire.resources.runes += runesGained;

  return {
    success: true,
    spell: 'runes',
    resourcesGained: { runes: runesGained },
  };
}

function castGate(empire: Empire, currentRound: number): SpellResult {
  // Gate lasts until end of current round
  empire.gateExpiresRound = currentRound;

  return {
    success: true,
    spell: 'gate',
    effectApplied: 'gate',
    effectDuration: 1, // 1 round
  };
}

function castAdvance(empire: Empire, currentRound: number): SpellResult {
  const eraOrder = ['past', 'present', 'future'] as const;
  const currentIndex = eraOrder.indexOf(empire.era);

  if (currentIndex < eraOrder.length - 1) {
    empire.era = eraOrder[currentIndex + 1];
    empire.eraChangedRound = currentRound;

    return {
      success: true,
      spell: 'advance',
      effectApplied: `advanced to ${empire.era}`,
    };
  }

  return { success: false, spell: 'advance' };
}

function castRegress(empire: Empire, currentRound: number): SpellResult {
  const eraOrder = ['past', 'present', 'future'] as const;
  const currentIndex = eraOrder.indexOf(empire.era);

  if (currentIndex > 0) {
    empire.era = eraOrder[currentIndex - 1];
    empire.eraChangedRound = currentRound;

    return {
      success: true,
      spell: 'regress',
      effectApplied: `regressed to ${empire.era}`,
    };
  }

  return { success: false, spell: 'regress' };
}

// ============================================
// ENEMY SPELLS
// Reference: spells/blast.php, storm.php, steal.php, struct.php
// ============================================

/**
 * Blast spell - destroys troops
 * From blast.php: threshold 1.15, 3% troops (1% shielded)
 */
function castBlast(caster: Empire, target: Empire): SpellResult {
  const power = getWizardPowerEnemy(caster, target);

  if (power <= SPELLS.thresholds.blast) {
    // Failure - lose wizards
    const wizardsLost = getWizardLoss(caster);
    caster.troops.trpwiz -= wizardsLost;

    return {
      success: false,
      spell: 'blast',
      wizardsLost,
    };
  }

  // Success - destroy troops
  const hasShield = hasActiveShield(target);
  const rate = hasShield ? 0.01 : 0.03;

  const troopsDestroyed: Partial<Troops> = {
    trparm: Math.ceil(target.troops.trparm * rate),
    trplnd: Math.ceil(target.troops.trplnd * rate),
    trpfly: Math.ceil(target.troops.trpfly * rate),
    trpsea: Math.ceil(target.troops.trpsea * rate),
    trpwiz: Math.ceil(target.troops.trpwiz * rate),
  };

  target.troops = subtractTroops(target.troops, troopsDestroyed as Troops);
  target.networth = calculateNetworth(target);

  // Update combat stats
  caster.offSucc++;
  caster.offTotal++;
  target.defTotal++;

  return {
    success: true,
    spell: 'blast',
    troopsDestroyed,
  };
}

/**
 * Steal spell - steals gold
 * From steal.php: threshold 1.75, 10-15% cash (3-5% shielded)
 */
function castSteal(caster: Empire, target: Empire): SpellResult {
  const power = getWizardPowerEnemy(caster, target);

  if (power <= SPELLS.thresholds.steal) {
    const wizardsLost = getWizardLoss(caster);
    caster.troops.trpwiz -= wizardsLost;

    // Update combat stats on failure
    caster.offTotal++;
    target.defSucc++;
    target.defTotal++;

    return {
      success: false,
      spell: 'steal',
      wizardsLost,
    };
  }

  // Success - steal gold
  // From steal.php: round(cash / 100000 * mt_rand(min, max))
  const hasShield = hasActiveShield(target);
  const minRate = hasShield ? 3000 : 10000;  // 3% or 10%
  const maxRate = hasShield ? 5000 : 15000;  // 5% or 15%
  const rate = minRate + Math.random() * (maxRate - minRate);

  const goldStolen = Math.round(target.resources.gold / 100000 * rate);
  target.resources.gold -= goldStolen;
  caster.resources.gold += goldStolen;

  target.networth = calculateNetworth(target);
  caster.networth = calculateNetworth(caster);

  // Update combat stats
  caster.offSucc++;
  caster.offTotal++;
  target.defTotal++;

  return {
    success: true,
    spell: 'steal',
    goldStolen,
  };
}

/**
 * Storm spell - destroys food and cash
 * From storm.php: threshold 1.21
 * Normal: 9.12% food, 12.66% cash
 * Shielded: 3.04% food, 4.22% cash
 */
function castStorm(caster: Empire, target: Empire): SpellResult {
  const power = getWizardPowerEnemy(caster, target);

  if (power <= SPELLS.thresholds.storm) {
    const wizardsLost = getWizardLoss(caster);
    caster.troops.trpwiz -= wizardsLost;

    // Update combat stats on failure
    caster.offTotal++;
    target.defSucc++;
    target.defTotal++;

    return {
      success: false,
      spell: 'storm',
      wizardsLost,
    };
  }

  // Success - destroy food and cash
  const hasShield = hasActiveShield(target);
  const foodRate = hasShield ? 0.0304 : 0.0912;
  const cashRate = hasShield ? 0.0422 : 0.1266;

  const foodDestroyed = Math.ceil(target.resources.food * foodRate);
  const cashDestroyed = Math.ceil(target.resources.gold * cashRate);

  target.resources.food -= foodDestroyed;
  target.resources.gold -= cashDestroyed;
  target.networth = calculateNetworth(target);

  // Update combat stats
  caster.offSucc++;
  caster.offTotal++;
  target.defTotal++;

  return {
    success: true,
    spell: 'storm',
    foodDestroyed,
    cashDestroyed,
  };
}

/**
 * Struct spell - destroys buildings
 * From struct.php: threshold 1.70
 * Normal: 3% of buildings
 * Shielded: 1% of buildings
 * Only destroys if building >= land/100 (or land/150 for blddef)
 */
function castStruct(caster: Empire, target: Empire): SpellResult {
  const power = getWizardPowerEnemy(caster, target);

  if (power <= SPELLS.thresholds.struct) {
    const wizardsLost = getWizardLoss(caster);
    caster.troops.trpwiz -= wizardsLost;

    // Update combat stats on failure
    caster.offTotal++;
    target.defSucc++;
    target.defTotal++;

    return {
      success: false,
      spell: 'struct',
      wizardsLost,
    };
  }

  // Success - destroy buildings
  const hasShield = hasActiveShield(target);
  const rate = hasShield ? 0.01 : 0.03;
  const land = target.resources.land;

  // Helper to destroy buildings with minimum ratio check
  function destroyBuilding(current: number, minRatio: number): number {
    if (current >= land / minRatio) {
      return Math.ceil(current * rate);
    }
    return 0;
  }

  const buildingsDestroyed: Partial<Buildings> = {
    bldcash: destroyBuilding(target.buildings.bldcash, 100),
    bldpop: destroyBuilding(target.buildings.bldpop, 100),
    bldtrp: destroyBuilding(target.buildings.bldtrp, 100),
    bldcost: destroyBuilding(target.buildings.bldcost, 100),
    bldfood: destroyBuilding(target.buildings.bldfood, 100),
    bldwiz: destroyBuilding(target.buildings.bldwiz, 100),
    blddef: destroyBuilding(target.buildings.blddef, 150), // Higher ratio for towers
  };

  // Apply building destruction
  target.buildings.bldcash -= buildingsDestroyed.bldcash ?? 0;
  target.buildings.bldpop -= buildingsDestroyed.bldpop ?? 0;
  target.buildings.bldtrp -= buildingsDestroyed.bldtrp ?? 0;
  target.buildings.bldcost -= buildingsDestroyed.bldcost ?? 0;
  target.buildings.bldfood -= buildingsDestroyed.bldfood ?? 0;
  target.buildings.bldwiz -= buildingsDestroyed.bldwiz ?? 0;
  target.buildings.blddef -= buildingsDestroyed.blddef ?? 0;

  // Buildings destroyed become free land
  const totalDestroyed =
    (buildingsDestroyed.bldcash ?? 0) +
    (buildingsDestroyed.bldpop ?? 0) +
    (buildingsDestroyed.bldtrp ?? 0) +
    (buildingsDestroyed.bldcost ?? 0) +
    (buildingsDestroyed.bldfood ?? 0) +
    (buildingsDestroyed.bldwiz ?? 0) +
    (buildingsDestroyed.blddef ?? 0);

  target.resources.freeland += totalDestroyed;
  target.networth = calculateNetworth(target);

  // Update combat stats
  caster.offSucc++;
  caster.offTotal++;
  target.defTotal++;

  return {
    success: true,
    spell: 'struct',
    buildingsDestroyed,
  };
}

/**
 * Spy spell - reveals enemy stats
 * From spy.php: threshold 1.0 (very easy)
 * Captures a snapshot of target's stats for strategic planning
 */
function castSpy(caster: Empire, target: Empire | BotEmpire, currentRound: number): SpellResult {
  const power = getWizardPowerEnemy(caster, target);

  if (power <= SPELLS.thresholds.spy) {
    const wizardsLost = getWizardLoss(caster);
    caster.troops.trpwiz -= wizardsLost;

    return {
      success: false,
      spell: 'spy',
      wizardsLost,
    };
  }

  // Success - capture intel snapshot (matching QM Promisance printMainStats)
  const targetName = 'personality' in target ? target.personality.name : target.name;

  const intel: SpyIntel = {
    targetId: target.id,
    targetName,
    round: currentRound,
    era: target.era,
    race: target.race,
    land: target.resources.land,
    networth: target.networth,
    peasants: target.peasants,
    health: target.health,
    taxRate: target.taxRate,
    gold: target.resources.gold,
    food: target.resources.food,
    runes: target.resources.runes,
    troops: { ...target.troops },
  };

  return {
    success: true,
    spell: 'spy',
    intel,
  };
}

/**
 * Fight spell - wizard battle that can take land
 * From fight.php: threshold 2.2, destroys buildings and takes land
 * This is a magical attack using wizard power instead of military
 */
function castFight(caster: Empire, target: Empire): SpellResult {
  const power = getWizardPowerEnemy(caster, target);

  if (power <= SPELLS.thresholds.fight) {
    // Failure - lose more wizards
    const wizardsLost = Math.ceil(caster.troops.trpwiz * 0.08);
    const enemyWizLoss = Math.ceil(target.troops.trpwiz * 0.04);

    caster.troops.trpwiz -= Math.min(wizardsLost, caster.troops.trpwiz);
    target.troops.trpwiz -= Math.min(enemyWizLoss, target.troops.trpwiz);

    caster.offTotal++;
    target.defSucc++;
    target.defTotal++;

    return {
      success: false,
      spell: 'fight',
      wizardsLost,
    };
  }

  // Success - wizard battle destroys buildings and takes land
  // From fight.php: 33% of normal attack building destruction
  const rate = 0.03 / 3; // 1% destruction rate

  const buildingsDestroyed: Partial<Buildings> = {
    bldcash: Math.ceil(target.buildings.bldcash * 0.05 / 3),
    bldpop: Math.ceil(target.buildings.bldpop * 0.07 / 3),
    bldtrp: Math.ceil(target.buildings.bldtrp * 0.07 / 3),
    bldcost: Math.ceil(target.buildings.bldcost * 0.07 / 3),
    bldfood: Math.ceil(target.buildings.bldfood * 0.08 / 3),
    bldwiz: Math.ceil(target.buildings.bldwiz * 0.07 / 3),
    blddef: Math.ceil(target.buildings.blddef * 0.11 / 3),
  };

  // Apply destruction
  target.buildings.bldcash -= buildingsDestroyed.bldcash ?? 0;
  target.buildings.bldpop -= buildingsDestroyed.bldpop ?? 0;
  target.buildings.bldtrp -= buildingsDestroyed.bldtrp ?? 0;
  target.buildings.bldcost -= buildingsDestroyed.bldcost ?? 0;
  target.buildings.bldfood -= buildingsDestroyed.bldfood ?? 0;
  target.buildings.bldwiz -= buildingsDestroyed.bldwiz ?? 0;
  target.buildings.blddef -= buildingsDestroyed.blddef ?? 0;

  // Total destroyed becomes land transferred
  const landGained =
    (buildingsDestroyed.bldcash ?? 0) +
    (buildingsDestroyed.bldpop ?? 0) +
    (buildingsDestroyed.bldtrp ?? 0) +
    (buildingsDestroyed.bldcost ?? 0) +
    (buildingsDestroyed.bldfood ?? 0) +
    (buildingsDestroyed.bldwiz ?? 0) +
    (buildingsDestroyed.blddef ?? 0);

  // Also destroy some freeland and transfer it
  const freelandLost = Math.ceil(target.resources.freeland * 0.10 / 3);
  target.resources.freeland -= freelandLost;
  target.resources.land -= landGained + freelandLost;
  caster.resources.land += landGained + freelandLost;
  caster.resources.freeland += landGained + freelandLost;

  // Wizard losses on both sides
  const casterWizLoss = Math.ceil(caster.troops.trpwiz * 0.05);
  const targetWizLoss = Math.ceil(target.troops.trpwiz * 0.07);

  caster.troops.trpwiz -= Math.min(casterWizLoss, caster.troops.trpwiz);
  target.troops.trpwiz -= Math.min(targetWizLoss, target.troops.trpwiz);

  // Update combat stats
  caster.offSucc++;
  caster.offTotal++;
  target.defTotal++;

  target.networth = calculateNetworth(target);
  caster.networth = calculateNetworth(caster);

  return {
    success: true,
    spell: 'fight',
    buildingsDestroyed,
    // Note: landGained is returned via buildingsDestroyed total
  };
}

// ============================================
// SPELL EXECUTION
// ============================================

export function castSelfSpell(
  empire: Empire,
  spell: SpellType,
  turnsRemaining: number,
  currentRound: number
): TurnActionResult {
  const turnsNeeded = SPELLS.turnsPerSpell;
  const cost = getSpellCost(empire, spell);

  // Validate
  const validation = canCastSpell(empire, spell, turnsRemaining, currentRound);
  if (!validation.canCast) {
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
      empire,
    };
  }

  // Process economy for spell turns
  let totalIncome = 0;
  let totalExpenses = 0;
  let totalFoodPro = 0;
  let totalFoodCon = 0;
  let totalRunes = 0;
  let totalLoanPayment = 0;
  let totalBankInterest = 0;
  let totalLoanInterest = 0;

  for (let i = 0; i < turnsNeeded; i++) {
    const economyResult = processEconomy(empire);
    const extras = applyEconomyResult(empire, economyResult);

    totalIncome += economyResult.income;
    totalExpenses += economyResult.expenses;
    totalFoodPro += economyResult.foodProduction;
    totalFoodCon += economyResult.foodConsumption;
    totalRunes += economyResult.runeProduction;
    totalLoanPayment += economyResult.loanPayment;
    totalBankInterest += extras.bankInterest;
    totalLoanInterest += extras.loanInterest;
  }

  // Deduct rune cost
  empire.resources.runes -= cost;

  // Cast the spell
  let spellResult: SpellResult;

  switch (spell) {
    case 'shield':
      spellResult = castShield(empire, currentRound);
      break;
    case 'food':
      spellResult = castFood(empire);
      break;
    case 'cash':
      spellResult = castCashSpell(empire);
      break;
    case 'runes':
      spellResult = castRunesSpell(empire);
      break;
    case 'gate':
      spellResult = castGate(empire, currentRound);
      break;
    case 'advance':
      spellResult = castAdvance(empire, currentRound);
      break;
    case 'regress':
      spellResult = castRegress(empire, currentRound);
      break;
    default:
      spellResult = { success: false, spell };
  }

  empire.networth = calculateNetworth(empire);

  return {
    success: spellResult.success,
    turnsSpent: turnsNeeded,
    turnsRemaining: turnsRemaining - turnsNeeded,
    income: totalIncome,
    expenses: totalExpenses,
    foodProduction: totalFoodPro,
    foodConsumption: totalFoodCon,
    runeChange: totalRunes - cost,
    troopsProduced: {},
    loanPayment: totalLoanPayment,
    bankInterest: totalBankInterest,
    loanInterest: totalLoanInterest,
    spellResult,
    empire,
  };
}

export function castEnemySpell(
  caster: Empire,
  target: Empire,
  spell: SpellType,
  turnsRemaining: number,
  currentRound: number = 1
): TurnActionResult {
  const turnsNeeded = SPELLS.turnsPerSpell;
  const cost = getSpellCost(caster, spell);

  // Validate
  const validation = canCastSpell(caster, spell, turnsRemaining);
  if (!validation.canCast) {
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
      empire: caster,
    };
  }

  // Process economy for spell turns
  let totalIncome = 0;
  let totalExpenses = 0;
  let totalFoodPro = 0;
  let totalFoodCon = 0;
  let totalRunes = 0;
  let totalLoanPayment = 0;
  let totalBankInterest = 0;
  let totalLoanInterest = 0;

  for (let i = 0; i < turnsNeeded; i++) {
    const economyResult = processEconomy(caster);
    const extras = applyEconomyResult(caster, economyResult);

    totalIncome += economyResult.income;
    totalExpenses += economyResult.expenses;
    totalFoodPro += economyResult.foodProduction;
    totalFoodCon += economyResult.foodConsumption;
    totalRunes += economyResult.runeProduction;
    totalLoanPayment += economyResult.loanPayment;
    totalBankInterest += extras.bankInterest;
    totalLoanInterest += extras.loanInterest;
  }

  // Deduct rune cost
  caster.resources.runes -= cost;

  // Cast the spell
  let spellResult: SpellResult;

  switch (spell) {
    case 'blast':
      spellResult = castBlast(caster, target);
      break;
    case 'steal':
      spellResult = castSteal(caster, target);
      break;
    case 'storm':
      spellResult = castStorm(caster, target);
      break;
    case 'struct':
      spellResult = castStruct(caster, target);
      break;
    case 'spy':
      spellResult = castSpy(caster, target, currentRound);
      break;
    case 'fight':
      spellResult = castFight(caster, target);
      break;
    default:
      spellResult = { success: false, spell };
  }

  // Apply health cost for offensive spells
  caster.health = Math.max(0, caster.health - COMBAT.offensiveSpellHealthCost);

  caster.networth = calculateNetworth(caster);

  return {
    success: spellResult.success,
    turnsSpent: turnsNeeded,
    turnsRemaining: turnsRemaining - turnsNeeded,
    income: totalIncome,
    expenses: totalExpenses,
    foodProduction: totalFoodPro,
    foodConsumption: totalFoodCon,
    runeChange: totalRunes - cost,
    troopsProduced: {},
    loanPayment: totalLoanPayment,
    bankInterest: totalBankInterest,
    loanInterest: totalLoanInterest,
    spellResult,
    empire: caster,
  };
}
