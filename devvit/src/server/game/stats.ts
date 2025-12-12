/**
 * Game statistics tracking for post-game summary
 */

import type { GameStats, Empire, Troops, TurnActionResult, CombatResult } from '../types';

// ============================================
// INITIALIZATION
// ============================================

export function createInitialStats(): GameStats {
  return {
    // Production totals
    totalIncome: 0,
    totalExpenses: 0,
    totalFoodProduction: 0,
    totalFoodConsumption: 0,
    totalRuneProduction: 0,
    totalTroopsProduced: {
      trparm: 0,
      trplnd: 0,
      trpfly: 0,
      trpsea: 0,
      trpwiz: 0,
    },

    // Combat totals
    totalAttacks: 0,
    totalAttackWins: 0,
    totalLandGained: 0,
    totalLandLost: 0,
    totalKills: 0,

    // Spell totals
    totalSpellsCast: 0,
    totalOffensiveSpells: 0,

    // Networth tracking
    networthPerTurn: 0,
    turnsPlayed: 0,

    // Peak values (initialized to 0, will be set on first update)
    peakGold: 0,
    peakFood: 0,
    peakRunes: 0,
    peakLand: 0,
    peakNetworth: 0,
    peakPeasants: 0,
    peakTrparm: 0,
    peakTrplnd: 0,
    peakTrpfly: 0,
    peakTrpsea: 0,
    peakTrpwiz: 0,
  };
}

// ============================================
// PEAK VALUE UPDATES
// ============================================

export function updatePeakValues(stats: GameStats, empire: Empire): void {
  stats.peakGold = Math.max(stats.peakGold, empire.resources.gold);
  stats.peakFood = Math.max(stats.peakFood, empire.resources.food);
  stats.peakRunes = Math.max(stats.peakRunes, empire.resources.runes);
  stats.peakLand = Math.max(stats.peakLand, empire.resources.land);
  stats.peakNetworth = Math.max(stats.peakNetworth, empire.networth);
  stats.peakPeasants = Math.max(stats.peakPeasants, empire.peasants);
  stats.peakTrparm = Math.max(stats.peakTrparm, empire.troops.trparm);
  stats.peakTrplnd = Math.max(stats.peakTrplnd, empire.troops.trplnd);
  stats.peakTrpfly = Math.max(stats.peakTrpfly, empire.troops.trpfly);
  stats.peakTrpsea = Math.max(stats.peakTrpsea, empire.troops.trpsea);
  stats.peakTrpwiz = Math.max(stats.peakTrpwiz, empire.troops.trpwiz);
}

// ============================================
// PRODUCTION STAT UPDATES
// ============================================

export function updateProductionStats(
  stats: GameStats,
  result: TurnActionResult,
  startingNetworth: number
): void {
  // Track turns played
  stats.turnsPlayed += result.turnsSpent;

  // Track production totals
  stats.totalIncome += result.income;
  stats.totalExpenses += result.expenses;
  stats.totalFoodProduction += result.foodProduction;
  stats.totalFoodConsumption += result.foodConsumption;
  stats.totalRuneProduction += result.runeChange;

  // Track troops produced
  if (result.troopsProduced) {
    stats.totalTroopsProduced.trparm += result.troopsProduced.trparm ?? 0;
    stats.totalTroopsProduced.trplnd += result.troopsProduced.trplnd ?? 0;
    stats.totalTroopsProduced.trpfly += result.troopsProduced.trpfly ?? 0;
    stats.totalTroopsProduced.trpsea += result.troopsProduced.trpsea ?? 0;
    stats.totalTroopsProduced.trpwiz += result.troopsProduced.trpwiz ?? 0;
  }

  // Update networth per turn average
  if (stats.turnsPlayed > 0) {
    const networthGain = result.empire.networth - startingNetworth;
    // Calculate rolling average
    stats.networthPerTurn = Math.round(
      (stats.networthPerTurn * (stats.turnsPlayed - result.turnsSpent) + networthGain) / stats.turnsPlayed
    );
  }
}

// ============================================
// COMBAT STAT UPDATES
// ============================================

export function updateCombatStats(
  stats: GameStats,
  combatResult: CombatResult,
  isAttacker: boolean
): void {
  if (isAttacker) {
    stats.totalAttacks++;
    if (combatResult.won) {
      stats.totalAttackWins++;
      stats.totalLandGained += combatResult.landGained;
    }
  } else {
    // Player was attacked
    if (!combatResult.won) {
      // Attacker won, player lost land
      stats.totalLandLost += combatResult.landLost;
    }
  }
}

export function incrementKills(stats: GameStats): void {
  stats.totalKills++;
}

// ============================================
// SPELL STAT UPDATES
// ============================================

export function updateSpellStats(
  stats: GameStats,
  isOffensive: boolean,
  castCount: number = 1
): void {
  stats.totalSpellsCast += castCount;
  if (isOffensive) {
    stats.totalOffensiveSpells += castCount;
  }
}
