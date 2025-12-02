/**
 * Bot Targeting System
 *
 * Scores potential targets and selects the best one for attacks/spells.
 * Considers power ratios, grudges, wealth, and personality.
 */

import type { Empire, BotEmpire } from '../../types';
import type { TargetScore } from './types';
import { TARGETING_WEIGHTS } from './definitions';
import { calculateOffensePower, calculateDefensePower } from '../combat';
import { canAttackEra } from '../empire';

// ============================================
// TARGET SCORING
// ============================================

export function scoreTargets(
  bot: BotEmpire,
  player: Empire,
  otherBots: BotEmpire[],
  currentRound: number
): TargetScore[] {
  // Get all valid targets (alive empires, not self)
  const validTargets: (Empire | BotEmpire)[] = [
    player,
    ...otherBots.filter(b => b.id !== bot.id && b.health > 0),
  ];

  const scores: TargetScore[] = [];
  const botOffense = calculateOffensePower(bot);

  for (const target of validTargets) {
    const result = scoreTarget(bot, target, botOffense, currentRound);
    scores.push(result);
  }

  // Sort by score descending
  return scores.sort((a, b) => b.score - a.score);
}

function scoreTarget(
  bot: BotEmpire,
  target: Empire | BotEmpire,
  botOffense: number,
  currentRound: number
): TargetScore {
  const reasons: string[] = [];
  let score = 0;

  const targetDefense = calculateDefensePower(target);
  const powerRatio = botOffense / (targetDefense + 1);

  // Can't win? Score 0
  if (powerRatio < TARGETING_WEIGHTS.minPowerRatio) {
    return { target, score: 0, reasons: ['too strong'] };
  }

  // Era compatibility
  if (canAttackEra(bot, target, currentRound)) {
    if (bot.era === target.era) {
      score += TARGETING_WEIGHTS.sameEraBias;
      reasons.push('same era');
    }
  } else {
    // Can't attack different era without gate
    return { target, score: 0, reasons: ['wrong era, no gate'] };
  }

  // Grudge - attacks received
  const attackGrudge = bot.memory.attacksReceived[target.id] ?? 0;
  if (attackGrudge > 0) {
    score += attackGrudge * TARGETING_WEIGHTS.grudgePerAttack;
    reasons.push(`grudge (${attackGrudge} attacks)`);
  }

  // Grudge - spells received
  const spellGrudge = bot.memory.spellsReceived[target.id] ?? 0;
  if (spellGrudge > 0) {
    score += spellGrudge * TARGETING_WEIGHTS.grudgePerSpell;
    reasons.push(`spell grudge (${spellGrudge})`);
  }

  // Weak target bonus
  if (powerRatio > 1.5) {
    score += TARGETING_WEIGHTS.weakTargetBonus;
    reasons.push('weak');
  }

  // Wealth factor for greedy archetypes
  if (bot.personality.archetype === 'shadow_merchant' ||
      bot.personality.archetype === 'the_locust') {
    const wealthScore = Math.log10(Math.max(target.resources.gold, 1)) * TARGETING_WEIGHTS.wealthFactor;
    score += wealthScore;
    reasons.push('wealthy');
  }

  // Player bias - bots slightly prefer attacking player for gameplay tension
  const isPlayer = !('isBot' in target);
  if (isPlayer) {
    score += TARGETING_WEIGHTS.playerBias;
    reasons.push('player');
  }

  // Retaliation target - if this target just attacked us
  if (bot.memory.lastAttackedBy === target.id) {
    score += 25; // Strong preference for retaliation target
    reasons.push('retaliation');
  }

  return { target, score, reasons };
}

// ============================================
// TARGET SELECTION
// ============================================

export function selectAttackTarget(
  bot: BotEmpire,
  player: Empire,
  otherBots: BotEmpire[],
  currentRound: number,
  rng: number
): (Empire | BotEmpire) | null {
  const scores = scoreTargets(bot, player, otherBots, currentRound);

  // Filter out zero-score targets
  const validScores = scores.filter(s => s.score > 0);

  if (validScores.length === 0) {
    return null;
  }

  // Usually pick highest score, but add some randomness
  // 70% chance to pick best target, 30% chance to pick from top 3
  const roll = (rng % 100);

  if (roll < 70 || validScores.length === 1) {
    return validScores[0].target;
  }

  // Pick randomly from top 3 (or fewer if not enough)
  const topTargets = validScores.slice(0, Math.min(3, validScores.length));
  const index = rng % topTargets.length;
  return topTargets[index].target;
}

export function selectSpellTarget(
  bot: BotEmpire,
  player: Empire,
  otherBots: BotEmpire[],
  currentRound: number,
  rng: number
): (Empire | BotEmpire) | null {
  // Spells have different considerations - don't need to win combat
  // But still prefer grudge targets and player

  const validTargets: (Empire | BotEmpire)[] = [
    player,
    ...otherBots.filter(b => b.id !== bot.id && b.health > 0),
  ];

  if (validTargets.length === 0) {
    return null;
  }

  // Score based on grudge and player bias only (spells can hit anyone)
  const scores = validTargets.map(target => {
    let score = 10; // Base score

    // Grudge
    const attackGrudge = bot.memory.attacksReceived[target.id] ?? 0;
    const spellGrudge = bot.memory.spellsReceived[target.id] ?? 0;
    score += (attackGrudge + spellGrudge) * 10;

    // Player bias
    if (!('isBot' in target)) {
      score += TARGETING_WEIGHTS.playerBias;
    }

    // Retaliation
    if (bot.memory.lastAttackedBy === target.id) {
      score += 20;
    }

    return { target, score };
  });

  scores.sort((a, b) => b.score - a.score);

  // Pick from top targets with some randomness
  const topCount = Math.min(2, scores.length);
  const index = rng % topCount;
  return scores[index].target;
}
