import type { GameRun, Empire, BotEmpire, Race, TurnActionRequest, TurnActionResult, DraftOption, SpellResult, BotPhaseResult, DefeatReason, RngState, EdictResult } from '../types';
import { TOTAL_ROUNDS, TURNS_PER_ROUND, COMBAT, SHOP } from './constants';
import { createEmpire, calculateNetworth, hasAdvisorEffect, getAdvisorEffectModifier } from './empire';
import { executeTurnAction, processEconomy, applyEconomyResult } from './turns';
import { isLoanEmergency } from './bank';
import { processAttack } from './combat';
import { castSelfSpell, castEnemySpell } from './spells';
import { generateBots, processBotPhase, updateBotMemoryAfterAttack, updateBotMemoryAfterSpell } from './bot';
import { generateMarketPrices, generateShopStock, generateDraftOptions, applyDraftSelection, executeMarketTransaction, calculateRerollCost } from './shop';
import { createRngState, nextRng, advanceRngBy } from './rng';
import { createInitialStats, updatePeakValues, updateProductionStats, updateCombatStats, incrementKills, updateSpellStats } from './stats';

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
  let rngState = createRngState(gameSeed);

  // Create player empire
  const playerEmpire = createEmpire(`player_${playerId}`, playerName, race);

  // Generate bot empires (uses seed directly for now, advances rng state)
  const botEmpires = generateBots(rngState.current);
  rngState = advanceRngBy(rngState, 100); // Advance state after bot generation

  // Generate initial market prices
  const marketResult = generateMarketPrices(rngState);
  const marketPrices = marketResult.prices;
  rngState = marketResult.rngState;

  // Generate initial shop stock and draft options for the starting shop
  const initialShopStock = generateShopStock(playerEmpire, marketPrices);
  const initialDraftResult = generateDraftOptions(rngState, playerEmpire, []);
  rngState = initialDraftResult.rngState;

  const initialRerollCost = calculateRerollCost(playerEmpire, marketPrices);

  // Initialize stats and set initial peak values based on starting empire
  const stats = createInitialStats();
  updatePeakValues(stats, playerEmpire);

  return {
    id,
    playerId,
    seed: gameSeed,
    rngState,
    version: 1,  // Initial optimistic locking version

    round: {
      number: 1,
      turnsRemaining: TURNS_PER_ROUND,
      phase: 'shop', // Start with initial shop phase
    },

    playerEmpire,
    botEmpires,

    marketPrices,
    shopStock: initialShopStock,
    draftOptions: initialDraftResult.options,

    // Reroll system - initialized for initial shop
    rerollCost: initialRerollCost,
    rerollCount: 0,

    // Track offered advisor IDs from initial draft
    offeredAdvisorIds: initialDraftResult.newOfferedAdvisorIds,

    intel: {},

    modifiers: [],

    playerDefeated: null,

    stats,

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
  const startingNetworth = empire.networth;

  // Helper for failed result
  const failedResult = (): TurnActionResult => ({
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
  });

  // Validate turns - must be positive integer within remaining
  if (!Number.isInteger(turns) || turns <= 0 || turns > run.round.turnsRemaining) {
    return failedResult();
  }

  // Block attacks and spells when in loan emergency (loan > 2x max)
  // Player must use regular turns to recover or pay off loan
  if (isLoanEmergency(empire) && (action === 'attack' || action === 'spell')) {
    return { ...failedResult(), stoppedEarly: 'loan' };
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

      // Pacifist advisor blocks all attacks
      if (hasAdvisorEffect(empire, 'pacifist')) {
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

      // Check attack limit per round (sum all extra_attacks modifiers from advisors)
      const extraAttacks = getAdvisorEffectModifier(empire, 'extra_attacks');
      if (empire.attacksThisRound >= COMBAT.attacksPerRound + extraAttacks) {
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

      const attackOutcome = processAttack(empire, target, run.round.turnsRemaining, request.attackType || 'standard', run.rngState);
      result = attackOutcome.result;
      run.rngState = attackOutcome.rngState;

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
          const spellOutcome = castSelfSpell(
            empire,
            request.spell,
            run.round.turnsRemaining - totalTurnsSpent,
            run.round.number,
            run.rngState
          );
          run.rngState = spellOutcome.rngState;
          const singleResult = spellOutcome.result;

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

        // Pacifist blocks fight spell (it's like an attack)
        if (isFightSpell && hasAdvisorEffect(empire, 'pacifist')) {
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

        const extraAttacks = getAdvisorEffectModifier(empire, 'extra_attacks');
        const limitReached = isFightSpell
          ? empire.attacksThisRound >= COMBAT.attacksPerRound + extraAttacks
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

        const enemySpellOutcome = castEnemySpell(empire, target, request.spell, run.round.turnsRemaining, run.round.number, run.rngState);
        run.rngState = enemySpellOutcome.rngState;
        result = enemySpellOutcome.result;

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
      // Apply tax rate and industry allocation changes before executing action
      if (action === 'cash' && request.taxRate !== undefined) {
        // Validate tax rate is an integer between 0-100
        if (!Number.isInteger(request.taxRate) || request.taxRate < 0 || request.taxRate > 100) {
          return failedResult();
        }
        empire.taxRate = request.taxRate;
      }
      if (action === 'industry' && request.industryAllocation !== undefined) {
        // Validate industry allocation
        const alloc = request.industryAllocation;
        const values = [alloc.trparm, alloc.trplnd, alloc.trpfly, alloc.trpsea];

        // All values must be integers between 0-100
        for (const val of values) {
          if (!Number.isInteger(val) || val < 0 || val > 100) {
            return failedResult();
          }
        }

        // Sum must equal 100
        const sum = values.reduce((a, b) => a + b, 0);
        if (sum !== 100) {
          return failedResult();
        }

        empire.industryAllocation = { ...request.industryAllocation };
      }
      result = executeTurnAction(empire, action, turns, {
        buildingAllocation: request.buildingAllocation,
        demolishAllocation: request.demolishAllocation,
      });
  }

  // Update turn counter
  run.round.turnsRemaining -= result.turnsSpent;
  result.turnsRemaining = run.round.turnsRemaining;

  // Track stats after successful turn actions
  if (result.success && result.turnsSpent > 0) {
    // Track production stats for all actions
    updateProductionStats(run.stats, result, startingNetworth);

    // Track combat stats for attacks
    if (action === 'attack' && result.combatResult) {
      updateCombatStats(run.stats, result.combatResult, true);
      // Check if we killed a bot
      if (result.combatResult.won) {
        const target = run.botEmpires.find((b) => b.id === request.targetId);
        if (target && target.resources.land <= 0) {
          incrementKills(run.stats);
        }
      }
    }

    // Track spell stats
    if (action === 'spell' && result.spellResult) {
      const selfSpells = ['shield', 'food', 'cash', 'runes', 'gate', 'advance', 'regress'];
      const isOffensive = !selfSpells.includes(result.spellResult.spell);
      const castCount = result.spellResult.castCount ?? 1;
      updateSpellStats(run.stats, isOffensive, castCount);
    }

    // Update peak values after every action
    updatePeakValues(run.stats, empire);
  }

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

  run.round.turnsRemaining = 0;

  // Skip shop and bot phases on final round - game ends after player's last turn
  if (run.round.number >= TOTAL_ROUNDS) {
    run.round.phase = 'complete';
    run.updatedAt = Date.now();
    return;
  }

  // Move to shop phase
  run.round.phase = 'shop';

  // Generate market prices using current RNG state (Balatro-style: state flows from player actions)
  const marketResult = generateMarketPrices(run.rngState);
  run.marketPrices = marketResult.prices;
  run.rngState = marketResult.rngState;

  run.shopStock = generateShopStock(run.playerEmpire, run.marketPrices);

  // Generate draft options using updated RNG state
  const draftResult = generateDraftOptions(run.rngState, run.playerEmpire, run.offeredAdvisorIds);
  run.draftOptions = draftResult.options;
  run.rngState = draftResult.rngState;

  // Track newly offered advisors
  run.offeredAdvisorIds = [...run.offeredAdvisorIds, ...draftResult.newOfferedAdvisorIds];

  // Reset guaranteed rare flag after draft generation (it's consumed)
  run.playerEmpire.guaranteedRareDraft = false;

  // Lock reroll cost at 20% of liquidation value (paid in gold, prevents gaming by selling assets first)
  run.rerollCost = calculateRerollCost(run.playerEmpire, run.marketPrices);
  run.rerollCount = 0;

  run.updatedAt = Date.now();
}

export function selectDraft(run: GameRun, optionIndex: number): { success: boolean; error?: string; picksRemaining?: number; edictResult?: EdictResult } {
  if (run.round.phase !== 'shop' || !run.draftOptions) {
    return { success: false, error: 'Not in shop phase' };
  }

  if (!Number.isInteger(optionIndex) || optionIndex < 0 || optionIndex >= run.draftOptions.length) {
    return { success: false, error: 'Invalid option index' };
  }

  const option = run.draftOptions[optionIndex];
  const result = applyDraftSelection(run.playerEmpire, option, {
    bots: run.botEmpires,
    currentRound: run.round.number,
    seed: run.rngState.current,
    clearOfferedCallback: () => {
      run.offeredAdvisorIds = [];
    },
  });

  if (!result.success) {
    return result;
  }

  // Balatro-style: Advance RNG based on which option was selected
  // Picking option 0 vs option 2 will diverge future RNG states
  run.rngState = advanceRngBy(run.rngState, optionIndex + 1);

  // Check for extra draft picks
  const extraPicks = run.playerEmpire.extraDraftPicks ?? 0;

  if (extraPicks > 0) {
    // Remove the selected option from the list and decrement picks
    run.draftOptions = run.draftOptions.filter((_, i) => i !== optionIndex);
    run.playerEmpire.extraDraftPicks = extraPicks - 1;

    // If no more options left, close the draft even if picks remain
    if (run.draftOptions.length === 0) {
      run.draftOptions = null;
      run.playerEmpire.extraDraftPicks = 0;
    }

    run.updatedAt = Date.now();
    return { success: true, picksRemaining: run.playerEmpire.extraDraftPicks, edictResult: result.edictResult };
  }

  // Normal case - close the draft
  run.draftOptions = null;
  run.updatedAt = Date.now();

  return { success: true, picksRemaining: 0, edictResult: result.edictResult };
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

  // Check if player has reached the reroll limit
  if (run.rerollCount >= SHOP.maxRerolls) {
    return { success: false, error: `Maximum rerolls reached (${SHOP.maxRerolls} per shop)` };
  }

  // Check if player can afford the reroll
  if (run.playerEmpire.resources.gold < run.rerollCost) {
    return { success: false, error: `Not enough gold. Need ${run.rerollCost.toLocaleString()}` };
  }

  // Deduct the cost
  run.playerEmpire.resources.gold -= run.rerollCost;
  run.rerollCount++;

  // Generate new draft options using current RNG state (Balatro-style: rerolls advance state)
  const draftResult = generateDraftOptions(run.rngState, run.playerEmpire, run.offeredAdvisorIds);
  run.draftOptions = draftResult.options;
  run.rngState = draftResult.rngState;

  // Track newly offered advisors
  run.offeredAdvisorIds = [...run.offeredAdvisorIds, ...draftResult.newOfferedAdvisorIds];

  run.updatedAt = Date.now();

  return { success: true, cost: run.rerollCost };
}

export function getRerollInfo(run: GameRun): { cost: number | null; canAfford: boolean; rerollCount: number; maxRerolls: number; rerollsRemaining: number } {
  const rerollsRemaining = Math.max(0, SHOP.maxRerolls - run.rerollCount);
  return {
    cost: run.rerollCost,
    canAfford: run.rerollCost !== null && run.playerEmpire.resources.gold >= run.rerollCost && rerollsRemaining > 0,
    rerollCount: run.rerollCount,
    maxRerolls: SHOP.maxRerolls,
    rerollsRemaining,
  };
}

export function endShopPhase(run: GameRun): void {
  if (run.round.phase !== 'shop') return;

  // Clear any remaining draft options and shop stock
  run.draftOptions = null;
  run.shopStock = null;

  // Determine next phase:
  // - If turnsRemaining > 0, this was the initial shop → go to player phase
  // - If turnsRemaining = 0, this was post-player shop → go to bot phase
  if (run.round.turnsRemaining > 0) {
    run.round.phase = 'player';
  } else {
    run.round.phase = 'bot';
  }
  run.updatedAt = Date.now();
}

export function executeBotPhase(run: GameRun): BotPhaseResult {
  if (run.round.phase !== 'bot') {
    return {
      botEmpires: run.botEmpires,
      playerEmpire: run.playerEmpire,
      news: [],
      standings: [],
      newSeed: run.rngState.current,
    };
  }

  // Process all bot turns using current RNG state
  const result = processBotPhase(
    run.botEmpires,
    run.playerEmpire,
    run.round.number,
    run.rngState.current,
    run.marketPrices
  );

  // Update run state with results
  run.botEmpires = result.botEmpires;
  run.playerEmpire = result.playerEmpire;
  // Update RNG state from bot phase result
  run.rngState = { current: result.newSeed };

  // Track land lost from bot attacks on player
  for (const news of result.news) {
    if (news.targetId === run.playerEmpire.id && news.action.type === 'attack' && news.action.success) {
      run.stats.totalLandLost += news.action.landTaken;
    }
  }

  // Update peak values after bot phase (player may have gained/lost resources)
  updatePeakValues(run.stats, run.playerEmpire);

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

    // Add efficiency_training policy bonus (+5 turns every round)
    if (run.playerEmpire.policies.includes('efficiency_training')) {
      baseTurns += 5;
    }

    // Add one-time bonus turns from edicts (e.g., Overtime)
    if (run.playerEmpire.bonusTurnsNextRound > 0) {
      baseTurns += run.playerEmpire.bonusTurnsNextRound;
      run.playerEmpire.bonusTurnsNextRound = 0;  // Consume the bonus
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
