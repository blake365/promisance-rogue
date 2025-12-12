/**
 * Bot State Machine
 *
 * Determines the strategic state of a bot based on game conditions.
 * State affects action weight modifiers and targeting decisions.
 */

import type { Empire, BotEmpire, BotState } from '../../types';
import { BOT_CONSTANTS } from './definitions';
import { calculateOffensePower, calculateDefensePower } from '../combat';

// ============================================
// STATE DETERMINATION
// ============================================

export function determineBotState(
  bot: BotEmpire,
  player: Empire,
  otherBots: BotEmpire[],
  currentRound: number
): BotState {
  const allEmpires = [player, ...otherBots.filter(b => b.id !== bot.id)];

  // Calculate power metrics
  const botOffense = calculateOffensePower(bot);
  const botDefense = calculateDefensePower(bot);
  const averagePower = getAveragePower(allEmpires);
  const strongestThreat = getStrongestThreat(bot, allEmpires);

  // Check conditions in priority order

  // 1. Retaliating - recently attacked and aggressive enough to strike back
  if (wasRecentlyAttacked(bot, currentRound) && bot.personality.aggressionThreshold < 1.3) {
    return 'retaliating';
  }

  // 2. Defensive - significantly weaker than strongest threat
  if (strongestThreat && botDefense < strongestThreat.power * BOT_CONSTANTS.defensivePowerRatio) {
    if (bot.personality.defenseFocus > 0.4) {
      return 'defensive';
    }
  }

  // 3. Aggressive - strong enough to attack
  if (botOffense > averagePower * BOT_CONSTANTS.aggressivePowerRatio) {
    if (bot.personality.aggressionThreshold < 1.5) {
      return 'aggressive';
    }
  }

  // 4. Developing - early game
  if (currentRound <= BOT_CONSTANTS.developingRounds) {
    return 'developing';
  }

  // 5. Default - militarizing
  return 'militarizing';
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function wasRecentlyAttacked(bot: BotEmpire, currentRound: number): boolean {
  if (!bot.memory.lastAttackedRound) return false;
  return currentRound - bot.memory.lastAttackedRound <= 1;
}

function getAveragePower(empires: Empire[]): number {
  if (empires.length === 0) return 0;

  const totalPower = empires.reduce((sum, empire) => {
    return sum + calculateOffensePower(empire);
  }, 0);

  return totalPower / empires.length;
}

interface ThreatInfo {
  empire: Empire;
  power: number;
}

function getStrongestThreat(bot: BotEmpire, empires: Empire[]): ThreatInfo | null {
  let strongest: ThreatInfo | null = null;

  for (const empire of empires) {
    const power = calculateOffensePower(empire);

    // Consider empires that could attack us (same era or might have gate)
    if (!strongest || power > strongest.power) {
      strongest = { empire, power };
    }
  }

  return strongest;
}

// ============================================
// STATE DESCRIPTIONS (for debugging/display)
// ============================================

export const STATE_DESCRIPTIONS: Record<BotState, string> = {
  developing: 'Building economy and infrastructure',
  militarizing: 'Building military strength',
  aggressive: 'Ready to attack weaker targets',
  defensive: 'Fortifying against threats',
  retaliating: 'Seeking revenge for recent attack',
};
