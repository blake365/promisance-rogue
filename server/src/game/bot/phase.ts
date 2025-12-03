/**
 * Bot Phase Processor (Strategy-Based)
 *
 * Executes bot turns using committed strategies instead of weighted random.
 * Each bot executes phases in order:
 *   1. Era Check - Cast Gate if not in preferred era
 *   2. Land Acquisition - Explore and/or Attack
 *   3. Build - Build toward target building ratios
 *   4. Production - Use remaining turns on priority actions
 *   5. Economic Management - Buy/sell food and resources
 *   6. Defense Check - Cast Shield if needed
 *
 * See STRATEGY_DESIGN.md for full documentation.
 */

import type {
  Empire,
  SpellType,
  BotEmpire,
  BotPhaseResult,
  BotStanding,
  NewsItem,
  TurnAction,
  MarketPrices,
  ShopTransaction,
} from '../../types';
import { TURNS_PER_ROUND, COMBAT, UNIT_COSTS, SHOP } from '../constants';
import { executeTurnAction, calcProvisions, calcFinances } from '../turns';
import { processAttack, calculateOffensePower, calculateDefensePower } from '../combat';
import { castEnemySpell, castSelfSpell, getSpellCost } from '../spells';
import { calculateNetworth, canAttackEra } from '../empire';
import { executeMarketTransaction } from '../shop';
import { selectAttackTarget, selectSpellTarget } from './targeting';
import { updateBotMemoryAfterAttack, updateBotMemoryAfterSpell } from './memory';
import { advanceRng } from './decisions';
import {
  getStrategy,
  getExploreTurns,
  shouldAttack,
  getBuildingsToBuild,
  getNextTurnAction,
  type BotStrategy,
} from './strategies';

// ============================================
// MAIN BOT PHASE PROCESSOR
// ============================================

export function processBotPhase(
  bots: BotEmpire[],
  player: Empire,
  roundNumber: number,
  seed: number,
  marketPrices: MarketPrices
): BotPhaseResult {
  const news: NewsItem[] = [];
  let rng = seed;

  // Store initial networths for change calculation
  const initialNetworthsMap = new Map<string, number>();
  initialNetworthsMap.set(player.id, player.networth);
  for (const bot of bots) {
    initialNetworthsMap.set(bot.id, bot.networth);
  }

  // Process each bot using strategy-based phases
  for (const bot of bots) {
    if (bot.health <= 0) continue; // Skip eliminated bots

    // Reset attack and spell counters for this round
    bot.attacksThisRound = 0;
    bot.offensiveSpellsThisRound = 0;

    const strategy = getStrategy(bot.personality.archetype);
    const context: BotPhaseContext = {
      bot,
      player,
      allBots: bots,
      strategy,
      roundNumber,
      turnsRemaining: TURNS_PER_ROUND,
      rng,
      news,
      marketPrices,
    };

    // Execute phases in order
    executeEraPhase(context);
    executeLandAcquisitionPhase(context);
    executeBuildPhase(context);
    executeProductionPhase(context);
    executeEconomicPhase(context);  // Buy/sell resources after production
    executeDefensePhase(context);

    // Update RNG for next bot
    rng = context.rng;

    // Recalculate networth after all turns
    bot.networth = calculateNetworth(bot);
  }

  // Recalculate player networth (may have been attacked)
  player.networth = calculateNetworth(player);

  // Generate standings
  const standings = generateStandings(bots, player, initialNetworthsMap);

  return {
    botEmpires: bots,
    playerEmpire: player,
    news,
    standings,
    newSeed: rng,
  };
}

// ============================================
// PHASE CONTEXT
// ============================================

interface BotPhaseContext {
  bot: BotEmpire;
  player: Empire;
  allBots: BotEmpire[];
  strategy: BotStrategy;
  roundNumber: number;
  turnsRemaining: number;
  rng: number;
  news: NewsItem[];
  marketPrices: MarketPrices;
}

// ============================================
// PHASE 1: ERA CHECK (REMOVED)
// ============================================

// Bots now have innate cross-era attack ability via the crossEraAttacks bonus.
// They also start in their preferred era, so no need to cast Gate or advance/regress.
// This phase is now a no-op but kept for structure.
function executeEraPhase(_ctx: BotPhaseContext): void {
  // No-op: bots start in preferred era and have cross-era attacks innate
  return;
}

// ============================================
// PHASE 2: LAND ACQUISITION (Explore + Attack + Offensive Spells)
// ============================================

function executeLandAcquisitionPhase(ctx: BotPhaseContext): void {
  const { strategy } = ctx;

  if (strategy.exploreBeforeAttack) {
    executeExploreTurns(ctx);
    executeAttackPhase(ctx);
  } else {
    executeAttackPhase(ctx);
    executeExploreTurns(ctx);
  }

  // Execute offensive spells if strategy uses them
  if (strategy.useOffensiveSpells) {
    executeOffensiveSpellPhase(ctx);
  }
}

function executeExploreTurns(ctx: BotPhaseContext): void {
  const { bot, strategy } = ctx;

  // Determine explore turns for this round
  const exploreTurns = getExploreTurns(strategy, ctx.rng);
  const turnsToUse = Math.min(exploreTurns, ctx.turnsRemaining);

  if (turnsToUse <= 0) return;

  executeTurnAction(bot, 'explore', turnsToUse);
  ctx.turnsRemaining -= turnsToUse;
  ctx.rng = advanceRng(ctx.rng);
}

function executeAttackPhase(ctx: BotPhaseContext): void {
  const { bot, player, allBots, strategy, roundNumber } = ctx;

  // No attacks in round 1
  if (roundNumber === 1) {
    return;
  }

  const otherBots = allBots.filter(b => b.id !== bot.id);

  // Keep attacking while conditions are met
  while (ctx.turnsRemaining >= COMBAT.turnsPerAttack) {
    const botOffense = calculateOffensePower(bot);

    // Find best target
    const target = selectAttackTarget(bot, player, otherBots, roundNumber, ctx.rng);
    ctx.rng = advanceRng(ctx.rng);

    if (!target) {
      break; // No valid targets
    }

    // Check power ratio against this target
    const targetDefense = calculateDefensePower(target);
    const powerRatio = botOffense / (targetDefense + 1);

    // Should we attack based on strategy?
    if (!shouldAttack(strategy, roundNumber, bot.health, powerRatio, bot.attacksThisRound)) {
      break;
    }

    // Check era compatibility
    if (!canAttackEra(bot, target, roundNumber)) {
      break;
    }

    // Check if target is player with protection
    if (target.id === player.id) {
      const hasPacification = player.pacificationExpiresRound !== null &&
        player.pacificationExpiresRound >= roundNumber;
      const hasDivineProtection = player.divineProtectionExpiresRound !== null &&
        player.divineProtectionExpiresRound >= roundNumber;

      if (hasPacification || hasDivineProtection) {
        break; // Player is protected
      }
    }

    // Execute attack
    const result = processAttack(bot, target, ctx.turnsRemaining, 'standard');
    ctx.turnsRemaining -= result.turnsSpent;

    if (result.success) {
      bot.attacksThisRound++;
      const landGained = result.landGained ?? 0;

      // Update defender's memory
      if ('isBot' in target && target.isBot) {
        updateBotMemoryAfterAttack(
          target as BotEmpire,
          bot.id,
          landGained,
          roundNumber
        );
      }

      // Generate news
      ctx.news.push(createAttackNews(bot, target, landGained, roundNumber));

      // Check if target was eliminated
      if (target.health <= 0) {
        ctx.news.push(createEliminationNews(target, bot, roundNumber));
        break; // Stop attacking this round after elimination
      }
    } else {
      // Attack failed, stop attacking
      break;
    }
  }
}

// ============================================
// OFFENSIVE SPELL PHASE (Part of Land Acquisition)
// ============================================

/**
 * Execute offensive spells based on strategy preferences.
 * Only called if strategy.useOffensiveSpells is true.
 *
 * Archetypes like Archon Nyx focus on magical warfare.
 */
function executeOffensiveSpellPhase(ctx: BotPhaseContext): void {
  const { bot, player, allBots, strategy, roundNumber } = ctx;

  // No offensive spells in round 1
  if (roundNumber === 1) {
    return;
  }

  // Check if we have any offensive spells to cast
  if (strategy.preferredOffensiveSpells.length === 0) {
    return;
  }

  // Need minimum wizards and runes
  const minWizards = 10;
  const minRunes = 200;

  if (bot.troops.trpwiz < minWizards || bot.resources.runes < minRunes) {
    return;
  }

  const otherBots = allBots.filter(b => b.id !== bot.id && b.health > 0);

  // Maximum offensive spells per round (to prevent spam)
  const maxOffensiveSpells = 3;

  // Cast offensive spells while conditions are met
  while (
    bot.offensiveSpellsThisRound < maxOffensiveSpells &&
    ctx.turnsRemaining >= 2 &&
    bot.health >= strategy.attackHealthThreshold &&
    bot.troops.trpwiz >= minWizards
  ) {
    // Select a spell from preferred list
    const spell = selectOffensiveSpell(strategy, bot, ctx.rng);
    ctx.rng = advanceRng(ctx.rng);

    if (!spell) {
      break;
    }

    // Check if we can afford this spell
    const spellCost = getSpellCost(bot, spell);
    if (bot.resources.runes < spellCost) {
      break;
    }

    // Find a target for the spell
    const target = selectSpellTarget(bot, player, otherBots, roundNumber, ctx.rng);
    ctx.rng = advanceRng(ctx.rng);

    if (!target) {
      break;
    }

    // Check if target is player with protection
    if (target.id === player.id) {
      const hasPacification = player.pacificationExpiresRound !== null &&
        player.pacificationExpiresRound >= roundNumber;
      const hasDivineProtection = player.divineProtectionExpiresRound !== null &&
        player.divineProtectionExpiresRound >= roundNumber;

      if (hasPacification || hasDivineProtection) {
        break; // Player is protected
      }
    }

    // Cast the spell
    const result = castEnemySpell(bot, target, spell, ctx.turnsRemaining, roundNumber);
    ctx.turnsRemaining -= result.turnsSpent;

    if (result.success) {
      bot.offensiveSpellsThisRound++;

      // Update defender's memory if it's a bot
      if ('isBot' in target && target.isBot) {
        updateBotMemoryAfterSpell(
          target as BotEmpire,
          bot.id,
          roundNumber
        );
      }

      // Generate spell attack news
      ctx.news.push(createSpellNews(bot, target, spell, roundNumber));

      // Check if target was eliminated (some spells can reduce health)
      if (target.health <= 0) {
        ctx.news.push(createEliminationNews(target, bot, roundNumber));
        break;
      }
    } else {
      // Spell failed, might want to try again with different spell
      // For now, just stop casting
      break;
    }
  }
}

/**
 * Select an offensive spell from the strategy's preferred list.
 * Prioritizes fight spell if available (takes land), then others.
 */
function selectOffensiveSpell(
  strategy: BotStrategy,
  bot: BotEmpire,
  rng: number
): SpellType | null {
  const spells = strategy.preferredOffensiveSpells;
  if (spells.length === 0) {
    return null;
  }

  // Check which spells we can actually afford
  const affordableSpells = spells.filter(spell => {
    const cost = getSpellCost(bot, spell);
    return bot.resources.runes >= cost;
  });

  if (affordableSpells.length === 0) {
    return null;
  }

  // Prioritize 'fight' spell if available (takes land like an attack)
  if (affordableSpells.includes('fight')) {
    // 50% chance to use fight if available
    if (rng % 2 === 0) {
      return 'fight';
    }
  }

  // Otherwise pick randomly from affordable spells
  const index = rng % affordableSpells.length;
  return affordableSpells[index];
}

// ============================================
// PHASE 3: BUILD
// ============================================

function executeBuildPhase(ctx: BotPhaseContext): void {
  const { bot, strategy } = ctx;

  // Calculate what to build
  const freeLand = bot.resources.freeland;
  if (freeLand <= 0) {
    return;
  }

  const currentBuildings = {
    bldfood: bot.buildings.bldfood,
    bldcash: bot.buildings.bldcash,
    bldtrp: bot.buildings.bldtrp,
    bldwiz: bot.buildings.bldwiz,
    bldcost: bot.buildings.bldcost,
  };

  const toBuild = getBuildingsToBuild(
    strategy,
    bot.resources.land,
    freeLand,
    currentBuildings
  );

  // Check if we have anything to build
  const totalToBuild = Object.values(toBuild).reduce((sum, v) => sum + (v || 0), 0);
  if (totalToBuild <= 0) {
    return;
  }

  // Check if we have enough gold (simplified - build action handles cost)
  // Each building costs ~500 gold base
  const estimatedCost = totalToBuild * 500;
  if (bot.resources.gold < estimatedCost) {
    // Build what we can afford
    const affordableRatio = bot.resources.gold / estimatedCost;
    for (const key of Object.keys(toBuild) as (keyof typeof toBuild)[]) {
      if (toBuild[key]) {
        toBuild[key] = Math.floor(toBuild[key]! * affordableRatio);
      }
    }
  }

  // Execute build
  executeTurnAction(bot, 'build', 1, { buildingAllocation: toBuild });
  // Build action calculates its own turn cost based on buildings
  ctx.rng = advanceRng(ctx.rng);
}

// ============================================
// PHASE 4: PRODUCTION
// ============================================

function executeProductionPhase(ctx: BotPhaseContext): void {
  const { bot, strategy } = ctx;

  // Use remaining turns on production
  while (ctx.turnsRemaining > 0) {
    const action = getNextTurnAction(
      strategy,
      bot.resources,
      bot.peasants,
      bot.troops.trpwiz
    );

    // Determine how many turns to use
    // Use turns in chunks to allow for resource checks
    const turnsToUse = Math.min(10, ctx.turnsRemaining);

    // For spells (meditate), need at least 2 turns
    if (action === 'meditate' && turnsToUse < 2) {
      // Not enough turns for meditate, try next priority action
      const alternativeAction = strategy.turnPriority.find(a => a !== 'meditate') || 'cash';
      executeTurnAction(bot, alternativeAction, turnsToUse);
    } else {
      executeTurnAction(bot, action, turnsToUse);
    }

    ctx.turnsRemaining -= turnsToUse;
    ctx.rng = advanceRng(ctx.rng);

    // Check for emergency conditions
    if (bot.resources.food <= 0 || bot.resources.gold < -1000000) {
      break; // Stop if in critical state
    }
  }
}

// ============================================
// PHASE 5: ECONOMIC MANAGEMENT
// ============================================

/**
 * Bots manage their resources by buying/selling at the market:
 * - If food production is negative and food reserves are low, buy food
 * - If food reserves are excessive, sell excess food for gold
 * - If gold is needed for building and food is abundant, sell food
 */
function executeEconomicPhase(ctx: BotPhaseContext): void {
  const { bot, marketPrices } = ctx;

  // Calculate food economy
  const provisions = calcProvisions(bot);
  const turnsOfFoodReserves = provisions.consumption > 0
    ? Math.floor(bot.resources.food / provisions.consumption)
    : 999;

  // Target: maintain 20-50 turns worth of food reserves
  const MIN_FOOD_RESERVE_TURNS = 20;
  const MAX_FOOD_RESERVE_TURNS = 50;
  const FOOD_EMERGENCY_TURNS = 5;

  // EMERGENCY: Sell troops if we can't afford food and have no gold
  if (turnsOfFoodReserves < FOOD_EMERGENCY_TURNS && provisions.netFood < 0) {
    const foodNeeded = provisions.consumption * 30;
    const foodCost = foodNeeded * marketPrices.foodBuyPrice;

    // If we can't afford food, sell troops first
    if (bot.resources.gold < foodCost) {
      const goldNeeded = foodCost - bot.resources.gold;
      sellTroopsForGold(ctx, goldNeeded);
    }
  }

  // EMERGENCY: Very low food - buy immediately
  if (turnsOfFoodReserves < FOOD_EMERGENCY_TURNS && provisions.netFood < 0) {
    // Buy enough food for 30 turns
    const targetFood = provisions.consumption * 30;
    const foodNeeded = Math.max(0, targetFood - bot.resources.food);
    const maxAffordable = Math.floor(bot.resources.gold / marketPrices.foodBuyPrice);
    const toBuy = Math.min(foodNeeded, maxAffordable);

    if (toBuy > 0) {
      const result = executeMarketTransaction(
        bot,
        { type: 'buy', resource: 'food', amount: toBuy },
        marketPrices,
        null,
        false
      );
      if (result.success) {
        ctx.rng = advanceRng(ctx.rng);
      }
    }
    return; // Don't sell in emergency
  }

  // LOW FOOD: Buy some food to build reserves
  if (turnsOfFoodReserves < MIN_FOOD_RESERVE_TURNS && bot.resources.gold > 50000) {
    const targetFood = provisions.consumption * (MIN_FOOD_RESERVE_TURNS + 10);
    const foodNeeded = Math.max(0, targetFood - bot.resources.food);
    // Spend up to 30% of gold on food
    const goldBudget = Math.floor(bot.resources.gold * 0.3);
    const maxAffordable = Math.floor(goldBudget / marketPrices.foodBuyPrice);
    const toBuy = Math.min(foodNeeded, maxAffordable);

    if (toBuy > 1000) {
      const result = executeMarketTransaction(
        bot,
        { type: 'buy', resource: 'food', amount: toBuy },
        marketPrices,
        null,
        false
      );
      if (result.success) {
        ctx.rng = advanceRng(ctx.rng);
      }
    }
    return;
  }

  // EXCESS FOOD: Sell surplus food for gold
  if (turnsOfFoodReserves > MAX_FOOD_RESERVE_TURNS && provisions.netFood > 0) {
    // Keep enough food for 30 turns, sell the rest
    const foodToKeep = provisions.consumption * 30;
    const excessFood = Math.max(0, bot.resources.food - foodToKeep);

    if (excessFood > 5000) {
      const result = executeMarketTransaction(
        bot,
        { type: 'sell', resource: 'food', amount: excessFood },
        marketPrices,
        null,
        false
      );
      if (result.success) {
        ctx.rng = advanceRng(ctx.rng);
      }
    }
    return;
  }

  // NEED GOLD FOR BUILDING: If we have lots of food and not much gold, sell some food
  const estimatedBuildCost = bot.resources.freeland * 500;
  if (bot.resources.freeland > 100 &&
      bot.resources.gold < estimatedBuildCost &&
      turnsOfFoodReserves > MIN_FOOD_RESERVE_TURNS + 15) {
    // Sell food to get gold for building, but keep safe reserves
    const foodToKeep = provisions.consumption * MIN_FOOD_RESERVE_TURNS;
    const foodToSell = Math.max(0, bot.resources.food - foodToKeep);
    const goldNeeded = estimatedBuildCost - bot.resources.gold;
    const foodForGold = Math.ceil(goldNeeded / marketPrices.foodSellPrice);
    const toSell = Math.min(foodToSell, foodForGold);

    if (toSell > 1000) {
      const result = executeMarketTransaction(
        bot,
        { type: 'sell', resource: 'food', amount: toSell },
        marketPrices,
        null,
        false
      );
      if (result.success) {
        ctx.rng = advanceRng(ctx.rng);
      }
    }
  }

  // SELL EXCESS TROOPS: Bots with unsustainable upkeep sell troops
  sellExcessTroops(ctx, provisions);

  // BUY TROOPS: Convert excess gold to troops (main networth growth)
  buyTroopsWithExcessGold(ctx, provisions);
}

/**
 * Dynamic troop purchasing based on actual empire economics.
 *
 * Instead of hard-coded gold reserves, we calculate:
 * 1. How much gold we need for N turns of expenses (if running deficit)
 * 2. How much gold we need to buy food (if food production is negative)
 * 3. How much gold we need for building free land
 * 4. What upkeep cost we can sustain with our income
 *
 * Then we spend excess gold on troops, limited by what we can afford to maintain.
 */
function buyTroopsWithExcessGold(ctx: BotPhaseContext, provisions: { consumption: number; netFood: number }): void {
  const { bot, strategy, marketPrices, roundNumber } = ctx;

  // Calculate actual empire finances
  const finances = calcFinances(bot);
  const turnsPerRound = TURNS_PER_ROUND;

  // Get personality aggression factor (how aggressively to spend)
  const aggression = getSpendingAggression(strategy.archetype, roundNumber);

  // === CALCULATE REQUIRED RESERVES ===

  // 1. Operating reserve: Cover N turns of expenses if running a deficit
  const turnsOfReserve = Math.max(5, Math.floor(20 * (1 - aggression))); // 5-20 turns based on aggression
  const operatingReserve = finances.netIncome < 0
    ? Math.abs(finances.netIncome) * turnsPerRound * turnsOfReserve / 50
    : 0;

  // 2. Food reserve: If food production is negative, reserve gold to buy food
  const foodDeficitPerRound = provisions.netFood < 0
    ? Math.abs(provisions.netFood) * turnsPerRound
    : 0;
  const foodReserve = foodDeficitPerRound * marketPrices.foodBuyPrice * 2; // 2 rounds of food

  // 3. Building reserve: Gold needed to build on free land
  const buildingCostPerAcre = 500; // Approximate
  const buildingReserve = bot.resources.freeland * buildingCostPerAcre * 0.5; // Build half

  const totalReserve = operatingReserve + foodReserve + buildingReserve;

  // === CALCULATE SPENDING BUDGET ===

  const availableGold = bot.resources.gold - totalReserve;
  if (availableGold <= 0) {
    return; // No excess gold to spend
  }

  // Spend based on aggression factor
  const spendingBudget = Math.floor(availableGold * aggression);
  if (spendingBudget < 1000) {
    return;
  }

  // === CALCULATE UPKEEP CAPACITY ===

  // How much additional upkeep can we afford?
  // If we have positive net income, we can afford more upkeep
  // Use a portion of our income headroom for new troop upkeep
  const incomeHeadroom = Math.max(0, finances.netIncome * turnsPerRound);
  const upkeepBudget = incomeHeadroom * aggression; // Portion of headroom we're willing to commit

  // === BUY TROOPS ===

  // Use strategy's industry allocation to determine troop mix
  const allocation = strategy.industryAllocation;
  type TroopType = 'trparm' | 'trplnd' | 'trpfly' | 'trpsea';
  const allTroopTypes: Array<{ type: TroopType; pct: number; upkeep: number }> = [
    { type: 'trparm' as const, pct: allocation.trparm, upkeep: UNIT_COSTS.trparm.upkeep },
    { type: 'trplnd' as const, pct: allocation.trplnd, upkeep: UNIT_COSTS.trplnd.upkeep },
    { type: 'trpfly' as const, pct: allocation.trpfly, upkeep: UNIT_COSTS.trpfly.upkeep },
    { type: 'trpsea' as const, pct: allocation.trpsea, upkeep: UNIT_COSTS.trpsea.upkeep },
  ];
  const troopTypes = allTroopTypes.filter(t => t.pct > 0);

  let remainingBudget = spendingBudget;
  let remainingUpkeepBudget = upkeepBudget;

  // Buy troops according to allocation, respecting both gold and upkeep limits
  for (const { type, pct, upkeep } of troopTypes) {
    if (remainingBudget <= 0) break;

    const budgetForType = Math.floor(spendingBudget * (pct / 100));
    const actualBudget = Math.min(budgetForType, remainingBudget);

    const unitCost = Math.floor(UNIT_COSTS[type].buyPrice * marketPrices.troopBuyMultiplier);
    const unitsByGold = Math.floor(actualBudget / unitCost);

    // Also limit by upkeep capacity (if we care about sustainability)
    const unitsByUpkeep = upkeep > 0 ? Math.floor(remainingUpkeepBudget / upkeep) : unitsByGold;
    const unitsToBuy = Math.min(unitsByGold, Math.max(unitsByGold, unitsByUpkeep)); // Buy at least what gold allows

    if (unitsToBuy > 0) {
      const result = executeMarketTransaction(
        bot,
        { type: 'buy', resource: 'troops', amount: unitsToBuy, troopType: type },
        marketPrices,
        null,
        false
      );
      if (result.success) {
        remainingBudget -= Math.abs(result.goldChange);
        remainingUpkeepBudget -= unitsToBuy * upkeep;
        ctx.rng = advanceRng(ctx.rng);
      }
    }
  }
}

/**
 * Get spending aggression factor (0.0 to 1.0) based on archetype and round.
 *
 * Higher aggression means:
 * - Lower reserves (willing to take more risk)
 * - Higher spending on troops
 * - Less concern about sustainability
 *
 * This scales dynamically with the empire's actual economy rather than
 * using hard-coded gold values.
 */
function getSpendingAggression(archetype: string, roundNumber: number): number {
  // Base aggression by archetype
  let aggression: number;

  switch (archetype) {
    case 'general_vask':
      // Highly aggressive military - spends fast
      aggression = 0.85;
      break;

    case 'the_locust':
      // Land rusher - aggressive spending
      aggression = 0.75;
      break;

    case 'iron_baron':
      // Industrial - moderate spending (has troop production too)
      aggression = 0.65;
      break;

    case 'archon_nyx':
      // Mage - needs some reserves for runes
      aggression = 0.55;
      break;

    case 'the_fortress':
      // Defensive - steady spending
      aggression = 0.6;
      break;

    case 'shadow_merchant':
      // Economic - conservative early, aggressive late
      if (roundNumber <= 3) {
        aggression = 0.4;
      } else if (roundNumber <= 7) {
        aggression = 0.7;
      } else {
        aggression = 0.9; // Final push
      }
      break;

    case 'grain_mother':
      // Farmer - conservative early, ramps up
      if (roundNumber <= 5) {
        aggression = 0.5;
      } else {
        aggression = 0.7;
      }
      break;

    default:
      aggression = 0.65;
  }

  // Late game bonus: Everyone gets more aggressive in final rounds
  // to maximize final networth
  if (roundNumber >= 8) {
    aggression = Math.min(0.95, aggression + 0.15);
  } else if (roundNumber >= 6) {
    aggression = Math.min(0.9, aggression + 0.05);
  }

  return aggression;
}

/**
 * Emergency troop selling - sell troops to get gold for food or other critical needs.
 * Sells most expensive troops first (sea > fly > lnd > arm) to maximize gold.
 */
function sellTroopsForGold(ctx: BotPhaseContext, goldNeeded: number): void {
  const { bot, marketPrices } = ctx;

  // Order troops by sell value (highest first)
  type TroopType = 'trparm' | 'trplnd' | 'trpfly' | 'trpsea';
  const troopsBySellValue: TroopType[] = ['trpsea', 'trpfly', 'trplnd', 'trparm'];

  let goldRemaining = goldNeeded;

  for (const troopType of troopsBySellValue) {
    if (goldRemaining <= 0) break;

    const available = bot.troops[troopType];
    if (available <= 0) continue;

    // Keep at least 10% of each troop type for defense
    const minKeep = Math.floor(available * 0.1);
    const canSell = Math.max(0, available - minKeep);
    if (canSell <= 0) continue;

    const unitValue = Math.floor(UNIT_COSTS[troopType].buyPrice * marketPrices.troopSellMultiplier);
    const unitsNeeded = Math.ceil(goldRemaining / unitValue);
    const toSell = Math.min(canSell, unitsNeeded);

    if (toSell > 0) {
      const result = executeMarketTransaction(
        bot,
        { type: 'sell', resource: 'troops', amount: toSell, troopType },
        marketPrices,
        null,
        false
      );
      if (result.success) {
        goldRemaining -= result.goldChange;
        ctx.rng = advanceRng(ctx.rng);
      }
    }
  }
}

/**
 * Sell excess troops when upkeep is unsustainable.
 *
 * Triggers when net income is significantly negative due to troop upkeep.
 * Industrial bots are more willing to sell because they can produce more.
 */
function sellExcessTroops(ctx: BotPhaseContext, provisions: { consumption: number; netFood: number }): void {
  const { bot, strategy, marketPrices, roundNumber } = ctx;

  // Calculate actual finances
  const finances = calcFinances(bot);

  // Only sell if running a significant deficit
  if (finances.netIncome >= 0) {
    return; // Economy is sustainable, no need to sell
  }

  // How bad is the deficit relative to our gold reserves?
  const turnsOfGold = bot.resources.gold / Math.abs(finances.netIncome);

  // Industrial bots are more tolerant of deficits (they can produce troops)
  const isIndustrial = strategy.archetype === 'iron_baron' ||
                       strategy.archetype === 'general_vask' ||
                       strategy.archetype === 'the_locust';

  const deficitThreshold = isIndustrial ? 10 : 20; // Turns of runway before we worry

  if (turnsOfGold > deficitThreshold) {
    return; // We have enough runway, don't panic sell
  }

  // Calculate how much gold we need to be comfortable
  const targetRunway = deficitThreshold * 2; // Want 2x threshold
  const goldNeeded = Math.abs(finances.netIncome) * targetRunway - bot.resources.gold;

  if (goldNeeded <= 0) {
    return;
  }

  // Sell troops to cover the deficit, prioritizing troops we don't use as much
  type TroopType = 'trparm' | 'trplnd' | 'trpfly' | 'trpsea';
  const allocation = strategy.industryAllocation;

  // Sort by allocation (lowest first - sell what we don't prioritize)
  const allTroops: Array<{ type: TroopType; pct: number }> = [
    { type: 'trparm' as const, pct: allocation.trparm },
    { type: 'trplnd' as const, pct: allocation.trplnd },
    { type: 'trpfly' as const, pct: allocation.trpfly },
    { type: 'trpsea' as const, pct: allocation.trpsea },
  ];
  const troopPriority = allTroops.sort((a, b) => a.pct - b.pct);

  let goldRemaining = goldNeeded;

  for (const { type } of troopPriority) {
    if (goldRemaining <= 0) break;

    const available = bot.troops[type];
    if (available <= 100) continue; // Keep minimum forces

    // Sell up to 20% of this troop type per round
    const maxSell = Math.floor(available * 0.2);
    const unitValue = Math.floor(UNIT_COSTS[type].buyPrice * marketPrices.troopSellMultiplier);
    const unitsNeeded = Math.ceil(goldRemaining / unitValue);
    const toSell = Math.min(maxSell, unitsNeeded);

    if (toSell > 50) {
      const result = executeMarketTransaction(
        bot,
        { type: 'sell', resource: 'troops', amount: toSell, troopType: type },
        marketPrices,
        null,
        false
      );
      if (result.success) {
        goldRemaining -= result.goldChange;
        ctx.rng = advanceRng(ctx.rng);
      }
    }
  }
}

// ============================================
// PHASE 6: DEFENSE CHECK
// ============================================

function executeDefensePhase(ctx: BotPhaseContext): void {
  const { bot, strategy, roundNumber } = ctx;

  // Only if strategy wants to maintain shield
  if (!strategy.maintainShield) {
    return;
  }

  // Check if already shielded
  if (bot.shieldExpiresRound !== null && bot.shieldExpiresRound >= roundNumber) {
    return;
  }

  // Check if we have runes and wizards
  const shieldCost = getSpellCost(bot, 'shield');
  if (bot.resources.runes < shieldCost) {
    return;
  }

  if (bot.troops.trpwiz < 3) {
    return;
  }

  // We need turns to cast (spell costs 2 turns)
  // This happens at end of phase, so use any remaining turns or accept going slightly negative
  const result = castSelfSpell(bot, 'shield', Math.max(2, ctx.turnsRemaining), roundNumber);
  ctx.turnsRemaining -= result.turnsSpent;
  ctx.rng = advanceRng(ctx.rng);
}

// ============================================
// NEWS GENERATION
// ============================================

function createAttackNews(
  attacker: BotEmpire,
  defender: Empire,
  landTaken: number,
  round: number
): NewsItem {
  return {
    round,
    actor: attacker.personality.name,
    actorId: attacker.id,
    target: defender.name,
    targetId: defender.id,
    action: {
      type: 'attack',
      success: true,
      landTaken,
    },
  };
}

function createSpellNews(
  caster: BotEmpire,
  target: Empire,
  spell: SpellType,
  round: number
): NewsItem {
  return {
    round,
    actor: caster.personality.name,
    actorId: caster.id,
    target: target.name,
    targetId: target.id,
    action: {
      type: 'spell',
      spell,
      success: true,
    },
  };
}

function createEliminationNews(
  eliminated: Empire,
  eliminator: BotEmpire,
  round: number
): NewsItem {
  return {
    round,
    actor: eliminated.name,
    actorId: eliminated.id,
    target: eliminator.personality.name,
    targetId: eliminator.id,
    action: {
      type: 'eliminated',
      eliminatedBy: eliminator.personality.name,
    },
  };
}

// ============================================
// STANDINGS
// ============================================

function generateStandings(
  bots: BotEmpire[],
  player: Empire,
  initialNetworthsMap: Map<string, number>
): BotStanding[] {
  const allEmpires: (Empire | BotEmpire)[] = [player, ...bots];

  const standings: BotStanding[] = allEmpires.map(empire => {
    const initialNetworth = initialNetworthsMap.get(empire.id) ?? empire.networth;
    const isBot = 'isBot' in empire && empire.isBot;

    return {
      id: empire.id,
      name: isBot ? (empire as BotEmpire).personality.name : empire.name,
      networth: empire.networth,
      networthChange: empire.networth - initialNetworth,
      isEliminated: empire.health <= 0,
    };
  });

  // Sort by networth descending
  return standings.sort((a, b) => b.networth - a.networth);
}
