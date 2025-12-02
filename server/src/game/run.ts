import type { GameRun, Empire, BotEmpire, Race, TurnActionRequest, TurnActionResult, DraftOption, SpellResult, BotPhaseResult } from '../types';
import { TOTAL_ROUNDS, TURNS_PER_ROUND } from './constants';
import { createEmpire, calculateNetworth, hasAdvisorEffect, hasPolicy } from './empire';
import { executeTurnAction, processEconomy, applyEconomyResult } from './turns';
import { processAttack } from './combat';
import { castSelfSpell, castEnemySpell } from './spells';
import { generateBots, processBotPhase, updateBotMemoryAfterAttack, updateBotMemoryAfterSpell } from './bot';
import { generateMarketPrices, generateShopStock, generateDraftOptions, applyDraftSelection, executeMarketTransaction } from './shop';
import { applyBankInterest, applyLoanInterest } from './bank';

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

    modifiers: [],

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
      empire,
    };
  }

  let result: TurnActionResult;

  switch (action) {
    case 'attack': {
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
          empire,
        };
      }

      result = processAttack(empire, target, run.round.turnsRemaining, request.attackType || 'standard');

      // Update bot's memory so it can retaliate
      if (result.success) {
        updateBotMemoryAfterAttack(target, empire.id, result.landGained ?? 0, run.round.number);
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
          spellResult: lastSpellResult ? {
            ...lastSpellResult,
            // Add cast count to the result message
            castCount,
          } : undefined,
          empire,
        };
      } else {
        // Enemy spell
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
            empire,
          };
        }

        result = castEnemySpell(empire, target, request.spell, run.round.turnsRemaining);

        // Update bot's memory so it can retaliate
        if (result.success) {
          updateBotMemoryAfterSpell(target, empire.id, run.round.number);
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

  run.updatedAt = Date.now();
}

export function selectDraft(run: GameRun, optionIndex: number): boolean {
  if (run.round.phase !== 'shop' || !run.draftOptions) return false;

  if (optionIndex < 0 || optionIndex >= run.draftOptions.length) return false;

  const option = run.draftOptions[optionIndex];
  applyDraftSelection(run.playerEmpire, option, run.botEmpires);

  run.draftOptions = null;
  run.updatedAt = Date.now();

  return true;
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

  // Apply end-of-round bank interest
  // Savings earn 4% (doubled with bank_charter policy)
  const hasDoubleInterest = hasPolicy(run.playerEmpire, 'bank_charter');
  applyBankInterest(run.playerEmpire, hasDoubleInterest);

  // Loan accrues 7.5% interest
  applyLoanInterest(run.playerEmpire);

  // Recalculate networth after interest
  run.playerEmpire.networth = calculateNetworth(run.playerEmpire);

  // Check if game is over
  if (run.round.number >= TOTAL_ROUNDS) {
    run.round.phase = 'complete';
  } else {
    // Move to next round
    run.round.number++;

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
// GAME STATE QUERIES
// ============================================

export function isGameComplete(run: GameRun): boolean {
  return run.round.phase === 'complete';
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
