import type { GameRun, Empire, BotEmpire, Race, TurnActionRequest, TurnActionResult, DraftOption, SpellResult, BotPhaseResult, DefeatReason } from '../types';
import { TOTAL_ROUNDS, TURNS_PER_ROUND, COMBAT } from './constants';
import { createEmpire, calculateNetworth, hasAdvisorEffect } from './empire';
import { executeTurnAction, processEconomy, applyEconomyResult } from './turns';
import { isLoanEmergency } from './bank';
import { processAttack } from './combat';
import { castSelfSpell, castEnemySpell } from './spells';
import { generateBots, processBotPhase, updateBotMemoryAfterAttack, updateBotMemoryAfterSpell } from './bot';
import { generateMarketPrices, generateShopStock, generateDraftOptions, applyDraftSelection, executeMarketTransaction, calculateRerollCost } from './shop';

// ============================================
// GAME RUN CREATION
// ============================================

export function createGameRun(
  id: string,
  playerId: string,
  playerName: string,
  race: Race,
  seed?: number
): GameRun {
  const gameSeed = seed ?? Math.floor(Math.random() * 2147483647);

  // Create player empire
  const playerEmpire = createEmpire(`player_${playerId}`, playerName, race);

  // Generate bot empires
  const botEmpires = generateBots(gameSeed);

  // Generate initial market prices
  const marketPrices = generateMarketPrices(gameSeed);

  return {
    id,
    playerId,
    seed: gameSeed,

    round: {
      number: 1,
      turnsRemaining: TURNS_PER_ROUND,
      phase: 'player',
    },

    playerEmpire,
    botEmpires,

    marketPrices,
    shopStock: null,
    draftOptions: null,

    // Reroll system - initialized when shop phase starts
    rerollCost: null,
    rerollCount: 0,

    intel: {},

    modifiers: [],

    playerDefeated: null,

    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

// ============================================
// TURN ACTIONS
// ============================================

export function executeTurn(
  run: GameRun,
  request: TurnActionRequest
): TurnActionResult {
  if (run.round.phase !== 'player') {
    return {
      success: false,
      turnsSpent: 0,
      turnsRemaining: run.round.turnsRemaining,
      income: 0,
      expenses: 0,
      foodProduction: 0,
      foodConsumption: 0,
      runeChange: 0,
      troopsProduced: {},
      loanPayment: 0,
      bankInterest: 0,
      loanInterest: 0,
      empire: run.playerEmpire,
    };
  }

  const { action, turns } = request;
  const empire = run.playerEmpire;

  // Validate turns
  if (turns > run.round.turnsRemaining) {
    return {
      success: false,
      turnsSpent: 0,
      turnsRemaining: run.round.turnsRemaining,
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

  let result: TurnActionResult;

  switch (action) {
    case 'attack': {
      // No attacks allowed in round 1
      if (run.round.number === 1) {
        return {
          success: false,
          turnsSpent: 0,
          turnsRemaining: run.round.turnsRemaining,
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

      // Check attack limit per round
      if (empire.attacksThisRound >= COMBAT.attacksPerRound) {
        return {
          success: false,
          turnsSpent: 0,
          turnsRemaining: run.round.turnsRemaining,
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

      if (!request.targetId) {
        return {
          success: false,
          turnsSpent: 0,
          turnsRemaining: run.round.turnsRemaining,
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

      const target = run.botEmpires.find((b) => b.id === request.targetId);
      if (!target) {
        return {
          success: false,
          turnsSpent: 0,
          turnsRemaining: run.round.turnsRemaining,
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

      result = processAttack(empire, target, run.round.turnsRemaining, request.attackType || 'standard');

      // Update bot's memory and increment attack counter on success
      if (result.success) {
        updateBotMemoryAfterAttack(target, empire.id, result.landGained ?? 0, run.round.number);
        empire.attacksThisRound++;
      }
      break;
    }

    case 'spell': {
      if (!request.spell) {
        return {
          success: false,
          turnsSpent: 0,
          turnsRemaining: run.round.turnsRemaining,
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

      const selfSpells = ['shield', 'food', 'cash', 'runes', 'gate', 'advance', 'regress'];

      if (selfSpells.includes(request.spell)) {
        // Self spells can be cast multiple times (request.turns = number of casts)
        const numCasts = request.turns || 1;
        let totalTurnsSpent = 0;
        let totalIncome = 0;
        let totalExpenses = 0;
        let totalFoodPro = 0;
        let totalFoodCon = 0;
        let totalRuneChange = 0;
        let totalLoanPayment = 0;
        let totalBankInterest = 0;
        let totalLoanInterest = 0;
        let lastSpellResult: SpellResult | undefined;
        let castCount = 0;

        for (let i = 0; i < numCasts; i++) {
          // Check if we can still cast (have enough runes, turns, etc.)
          const singleResult = castSelfSpell(
            empire,
            request.spell,
            run.round.turnsRemaining - totalTurnsSpent,
            run.round.number
          );

          if (!singleResult.success && singleResult.turnsSpent === 0) {
            // Can't cast anymore (not enough resources/turns)
            break;
          }

          castCount++;
          totalTurnsSpent += singleResult.turnsSpent;
          totalIncome += singleResult.income;
          totalExpenses += singleResult.expenses;
          totalFoodPro += singleResult.foodProduction;
          totalFoodCon += singleResult.foodConsumption;
          totalRuneChange += singleResult.runeChange;
          totalLoanPayment += singleResult.loanPayment;
          totalBankInterest += singleResult.bankInterest;
          totalLoanInterest += singleResult.loanInterest;
          lastSpellResult = singleResult.spellResult;
        }

        result = {
          success: castCount > 0,
          turnsSpent: totalTurnsSpent,
          turnsRemaining: run.round.turnsRemaining - totalTurnsSpent,
          income: totalIncome,
          expenses: totalExpenses,
          foodProduction: totalFoodPro,
          foodConsumption: totalFoodCon,
          runeChange: totalRuneChange,
          troopsProduced: {},
          loanPayment: totalLoanPayment,
          bankInterest: totalBankInterest,
          loanInterest: totalLoanInterest,
          spellResult: lastSpellResult ? {
            ...lastSpellResult,
            // Add cast count to the result message
            castCount,
          } : undefined,
          empire,
        };
      } else {
        // Enemy spell - no offensive spells/attacks in round 1
        if (run.round.number === 1) {
          return {
            success: false,
            turnsSpent: 0,
            turnsRemaining: run.round.turnsRemaining,
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

        // Fight spell uses attack counter, other offensive spells use spell counter
        const isFightSpell = request.spell === 'fight';
        const limitReached = isFightSpell
          ? empire.attacksThisRound >= COMBAT.attacksPerRound
          : empire.offensiveSpellsThisRound >= COMBAT.offensiveSpellsPerRound;

        if (limitReached) {
          return {
            success: false,
            turnsSpent: 0,
            turnsRemaining: run.round.turnsRemaining,
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

        if (!request.spellTargetId) {
          return {
            success: false,
            turnsSpent: 0,
            turnsRemaining: run.round.turnsRemaining,
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

        const target = run.botEmpires.find((b) => b.id === request.spellTargetId);
        if (!target) {
          return {
            success: false,
            turnsSpent: 0,
            turnsRemaining: run.round.turnsRemaining,
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

        result = castEnemySpell(empire, target, request.spell, run.round.turnsRemaining, run.round.number);

        // Update bot's memory and increment counter on success
        if (result.success) {
          updateBotMemoryAfterSpell(target, empire.id, run.round.number);

          // Fight spell uses attack counter, other offensive spells use spell counter
          if (isFightSpell) {
            empire.attacksThisRound++;
          } else {
            empire.offensiveSpellsThisRound++;
          }

          // Store spy intel if this was a successful spy spell
          if (result.spellResult?.spell === 'spy' && result.spellResult.intel) {
            run.intel[target.id] = result.spellResult.intel;
          }
        }
      }
      break;
    }

    default:
      result = executeTurnAction(empire, action, turns, {
        buildingAllocation: request.buildingAllocation,
      });
  }

  // Update turn counter
  run.round.turnsRemaining -= result.turnsSpent;
  result.turnsRemaining = run.round.turnsRemaining;

  // Check for player defeat after turn processing
  const defeatReason = checkPlayerDefeated(run.playerEmpire);
  if (defeatReason) {
    run.playerDefeated = defeatReason;
    run.round.phase = 'complete';
  }

  run.updatedAt = Date.now();

  return result;
}

// ============================================
// PHASE TRANSITIONS
// ============================================

export function endPlayerPhase(run: GameRun): void {
  if (run.round.phase !== 'player') return;

  // Move to shop phase
  run.round.phase = 'shop';
  run.round.turnsRemaining = 0;

  // Generate market prices, shop stock, and draft options
  const phaseSeed = run.seed + run.round.number * 1000;
  run.marketPrices = generateMarketPrices(phaseSeed);
  run.shopStock = generateShopStock(run.playerEmpire, run.marketPrices);
  run.draftOptions = generateDraftOptions(phaseSeed + 500, run.playerEmpire);

  // Lock reroll cost at 20% of current gold (prevents gaming by spending gold first)
  run.rerollCost = calculateRerollCost(run.playerEmpire);
  run.rerollCount = 0;

  run.updatedAt = Date.now();
}

export function selectDraft(run: GameRun, optionIndex: number): { success: boolean; error?: string } {
  if (run.round.phase !== 'shop' || !run.draftOptions) {
    return { success: false, error: 'Not in shop phase' };
  }

  if (optionIndex < 0 || optionIndex >= run.draftOptions.length) {
    return { success: false, error: 'Invalid option index' };
  }

  const option = run.draftOptions[optionIndex];
  const result = applyDraftSelection(run.playerEmpire, option, run.botEmpires);

  if (!result.success) {
    return result;
  }

  run.draftOptions = null;
  run.updatedAt = Date.now();

  return { success: true };
}

export function rerollDraft(run: GameRun): { success: boolean; error?: string; cost?: number } {
  if (run.round.phase !== 'shop') {
    return { success: false, error: 'Not in shop phase' };
  }

  if (!run.draftOptions) {
    return { success: false, error: 'No draft options to reroll (already selected)' };
  }

  if (run.rerollCost === null) {
    return { success: false, error: 'Reroll cost not set' };
  }

  // Check if player can afford the reroll
  if (run.playerEmpire.resources.gold < run.rerollCost) {
    return { success: false, error: `Not enough gold. Need ${run.rerollCost.toLocaleString()}` };
  }

  // Deduct the cost
  run.playerEmpire.resources.gold -= run.rerollCost;
  run.rerollCount++;

  // Generate new draft options with a different seed
  const rerollSeed = run.seed + run.round.number * 1000 + 500 + run.rerollCount * 100;
  run.draftOptions = generateDraftOptions(rerollSeed, run.playerEmpire);

  run.updatedAt = Date.now();

  return { success: true, cost: run.rerollCost };
}

export function getRerollInfo(run: GameRun): { cost: number | null; canAfford: boolean; rerollCount: number } {
  return {
    cost: run.rerollCost,
    canAfford: run.rerollCost !== null && run.playerEmpire.resources.gold >= run.rerollCost,
    rerollCount: run.rerollCount,
  };
}

export function endShopPhase(run: GameRun): void {
  if (run.round.phase !== 'shop') return;

  // Clear any remaining draft options and shop stock
  run.draftOptions = null;
  run.shopStock = null;

  // Move to bot phase
  run.round.phase = 'bot';
  run.updatedAt = Date.now();
}

export function executeBotPhase(run: GameRun): BotPhaseResult {
  if (run.round.phase !== 'bot') {
    return {
      botEmpires: run.botEmpires,
      playerEmpire: run.playerEmpire,
      news: [],
      standings: [],
      newSeed: run.seed,
    };
  }

  // Process all bot turns (no artificial scaling - bots grow through using turns)
  const phaseSeed = run.seed + run.round.number * 2000;
  const result = processBotPhase(
    run.botEmpires,
    run.playerEmpire,
    run.round.number,
    phaseSeed
  );

  // Update run state with results
  run.botEmpires = result.botEmpires;
  run.playerEmpire = result.playerEmpire;
  run.seed = result.newSeed;

  // Check for player defeat after bot attacks
  const defeatReason = checkPlayerDefeated(run.playerEmpire);
  if (defeatReason) {
    run.playerDefeated = defeatReason;
    run.round.phase = 'complete';
    run.updatedAt = Date.now();
    return result;
  }

  // Check if game is over (all rounds completed)
  if (run.round.number >= TOTAL_ROUNDS) {
    run.round.phase = 'complete';
  } else {
    // Move to next round
    run.round.number++;

    // Reset attack and spell counters for new round
    run.playerEmpire.attacksThisRound = 0;
    run.playerEmpire.offensiveSpellsThisRound = 0;

    // Base turns + extra_turns from empire_builder advisor
    let baseTurns = TURNS_PER_ROUND;
    for (const advisor of run.playerEmpire.advisors) {
      if (advisor.effect.type === 'extra_turns') {
        baseTurns += advisor.effect.modifier;
      }
    }
    run.round.turnsRemaining = baseTurns;
    run.round.phase = 'player';
  }

  run.updatedAt = Date.now();

  return result;
}

// ============================================
// PLAYER DEFEAT CHECKS
// ============================================

/**
 * Check if player has been defeated (game over)
 * Returns the defeat reason or null if player is still alive
 */
export function checkPlayerDefeated(empire: Empire): DefeatReason | null {
  // No land = defeated (lost all territory)
  if (empire.resources.land <= 0) {
    return 'no_land';
  }

  // No peasants = defeated (no population to sustain empire)
  if (empire.peasants <= 0) {
    return 'no_peasants';
  }

  // Excessive loan = defeated (bankruptcy)
  // Uses same threshold as emergency loan limit (loan > 2x max loan)
  if (isLoanEmergency(empire)) {
    return 'excessive_loan';
  }

  return null;
}

// ============================================
// GAME STATE QUERIES
// ============================================

export function isGameComplete(run: GameRun): boolean {
  return run.round.phase === 'complete' || run.playerDefeated !== null;
}

export function getFinalScore(run: GameRun): number {
  return run.playerEmpire.networth;
}

export function getGameSummary(run: GameRun) {
  return {
    id: run.id,
    playerId: run.playerId,
    round: run.round.number,
    phase: run.round.phase,
    turnsRemaining: run.round.turnsRemaining,
    playerNetworth: run.playerEmpire.networth,
    isComplete: isGameComplete(run),
    finalScore: isGameComplete(run) ? getFinalScore(run) : null,
  };
}

// ============================================
// SERIALIZATION
// ============================================

export function serializeGameRun(run: GameRun): string {
  return JSON.stringify(run);
}

export function deserializeGameRun(data: string): GameRun {
  return JSON.parse(data) as GameRun;
}
