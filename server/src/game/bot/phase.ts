/**
 * Bot Phase Processor
 *
 * Orchestrates all bot turns for a round, generates news feed,
 * and returns updated game state.
 */

import type {
  Empire,
  SpellType,
  BotEmpire,
  BotPhaseResult,
  BotStanding,
  NewsItem,
} from '../../types';
import type { BotTurnResult } from './types';
import { TURNS_PER_ROUND, COMBAT } from '../constants';
import { decideBotAction, advanceRng } from './decisions';
import { updateBotMemoryAfterAttack, updateBotMemoryAfterSpell } from './memory';
import { executeTurnAction, applyEconomyResult } from '../turns';
import { processAttack } from '../combat';
import { castEnemySpell, castSelfSpell } from '../spells';
import { calculateNetworth } from '../empire';

// ============================================
// MAIN BOT PHASE PROCESSOR
// ============================================

export function processBotPhase(
  bots: BotEmpire[],
  player: Empire,
  roundNumber: number,
  seed: number
): BotPhaseResult {
  const news: NewsItem[] = [];
  let rng = seed;

  // Store initial netwworths for change calculation
  const initialNetworthsMap = new Map<string, number>();
  initialNetworthsMap.set(player.id, player.networth);
  for (const bot of bots) {
    initialNetworthsMap.set(bot.id, bot.networth);
  }

  // Process each bot's turns
  for (const bot of bots) {
    if (bot.health <= 0) continue; // Skip eliminated bots

    // Reset attack and spell counters for this round
    bot.attacksThisRound = 0;
    bot.offensiveSpellsThisRound = 0;

    let turnsRemaining = TURNS_PER_ROUND;

    while (turnsRemaining > 0) {
      const result = processSingleBotTurn(
        bot,
        player,
        bots,
        roundNumber,
        turnsRemaining,
        rng
      );

      turnsRemaining -= result.turnsSpent;
      rng = result.newSeed;

      // Add news item if significant action occurred
      if (result.news) {
        news.push(result.news);
      }
    }

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
// SINGLE BOT TURN
// ============================================

function processSingleBotTurn(
  bot: BotEmpire,
  player: Empire,
  allBots: BotEmpire[],
  roundNumber: number,
  turnsRemaining: number,
  seed: number
): BotTurnResult {
  const otherBots = allBots.filter(b => b.id !== bot.id);

  // Decide what to do
  const decision = decideBotAction({
    bot,
    player,
    otherBots,
    currentRound: roundNumber,
    turnsRemaining,
    seed,
  });

  let rng = advanceRng(seed);
  let news: NewsItem | undefined;

  switch (decision.action) {
    case 'explore':
    case 'farm':
    case 'cash':
    case 'meditate':
    case 'industry': {
      executeTurnAction(bot, decision.action, decision.turns);
      break;
    }

    case 'build': {
      if (decision.buildingAllocation) {
        executeTurnAction(bot, 'build', 1, {
          buildingAllocation: decision.buildingAllocation,
        });
      }
      break;
    }

    case 'attack': {
      // No attacks in round 1 or if limit reached
      if (roundNumber === 1 || bot.attacksThisRound >= COMBAT.attacksPerRound) {
        break; // Skip attack, bot will choose another action next iteration
      }

      if (decision.targetId) {
        const target = findTarget(decision.targetId, player, allBots);
        if (target) {
          const result = processAttack(bot, target, turnsRemaining, 'standard');

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

            // Generate news for successful attacks
            news = createAttackNews(bot, target, landGained, roundNumber);

            // Check if target was eliminated
            if (target.health <= 0) {
              news = createEliminationNews(target, bot, roundNumber);
            }
          }

          return {
            turnsSpent: result.turnsSpent,
            action: 'attack',
            targetId: decision.targetId,
            news,
            newSeed: rng,
          };
        }
      }
      break;
    }

    case 'spell': {
      if (decision.spell) {
        const spellResult = processSpell(
          bot,
          decision.spell,
          decision.targetId,
          player,
          allBots,
          roundNumber,
          turnsRemaining
        );

        if (spellResult.news) {
          news = spellResult.news;
        }

        return {
          turnsSpent: spellResult.turnsSpent,
          action: 'spell',
          targetId: decision.targetId,
          news,
          newSeed: rng,
        };
      }
      break;
    }
  }

  return {
    turnsSpent: decision.turns,
    action: decision.action,
    newSeed: rng,
  };
}

// ============================================
// SPELL PROCESSING
// ============================================

interface SpellProcessResult {
  turnsSpent: number;
  success: boolean;
  news?: NewsItem;
}

function processSpell(
  bot: BotEmpire,
  spell: SpellType,
  targetId: string | undefined,
  player: Empire,
  allBots: BotEmpire[],
  roundNumber: number,
  turnsRemaining: number
): SpellProcessResult {
  // Self spells
  if (['shield', 'food', 'cash', 'runes', 'gate', 'advance'].includes(spell)) {
    const result = castSelfSpell(bot, spell, turnsRemaining, roundNumber);
    return {
      turnsSpent: result.turnsSpent,
      success: result.success,
    };
  }

  // Enemy spells - no offensive spells in round 1 or if limit reached
  if (roundNumber === 1 || bot.offensiveSpellsThisRound >= COMBAT.offensiveSpellsPerRound) {
    return { turnsSpent: 0, success: false };
  }

  // Enemy spells need a target
  if (!targetId) {
    return { turnsSpent: 2, success: false };
  }

  const target = findTarget(targetId, player, allBots);
  if (!target) {
    return { turnsSpent: 2, success: false };
  }

  const result = castEnemySpell(bot, target, spell, turnsRemaining);

  // Update defender's memory and increment counter if spell was successful
  if (result.success) {
    bot.offensiveSpellsThisRound++;
    if ('isBot' in target && target.isBot) {
      updateBotMemoryAfterSpell(target as BotEmpire, bot.id, roundNumber);
    }
  }

  // Generate news for offensive spells
  let news: NewsItem | undefined;
  if (result.success) {
    news = createSpellNews(bot, target, spell, roundNumber);
  }

  return {
    turnsSpent: result.turnsSpent,
    success: result.success,
    news,
  };
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

// ============================================
// HELPERS
// ============================================

function findTarget(
  targetId: string,
  player: Empire,
  bots: BotEmpire[]
): Empire | BotEmpire | null {
  if (player.id === targetId) {
    return player;
  }

  return bots.find(b => b.id === targetId) ?? null;
}
