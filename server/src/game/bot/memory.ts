/**
 * Bot Memory System
 *
 * Tracks interactions between bots and other empires.
 * Used for grudge/retaliation targeting decisions.
 */

import type { BotMemory, BotEmpire } from '../../types';

// ============================================
// MEMORY CREATION
// ============================================

export function createEmptyMemory(): BotMemory {
  return {
    attacksReceived: {},
    spellsReceived: {},
    landLostTo: {},
    lastAttackedBy: null,
    lastAttackedRound: null,
  };
}

// ============================================
// MEMORY UPDATES
// ============================================

export function recordAttackReceived(
  memory: BotMemory,
  attackerId: string,
  landLost: number,
  currentRound: number
): BotMemory {
  return {
    ...memory,
    attacksReceived: {
      ...memory.attacksReceived,
      [attackerId]: (memory.attacksReceived[attackerId] ?? 0) + 1,
    },
    landLostTo: {
      ...memory.landLostTo,
      [attackerId]: (memory.landLostTo[attackerId] ?? 0) + landLost,
    },
    lastAttackedBy: attackerId,
    lastAttackedRound: currentRound,
  };
}

export function recordSpellReceived(
  memory: BotMemory,
  casterId: string,
  currentRound: number
): BotMemory {
  return {
    ...memory,
    spellsReceived: {
      ...memory.spellsReceived,
      [casterId]: (memory.spellsReceived[casterId] ?? 0) + 1,
    },
    lastAttackedBy: casterId,
    lastAttackedRound: currentRound,
  };
}

// ============================================
// MEMORY QUERIES
// ============================================

export function getTotalAttacksFrom(memory: BotMemory, attackerId: string): number {
  return memory.attacksReceived[attackerId] ?? 0;
}

export function getTotalSpellsFrom(memory: BotMemory, casterId: string): number {
  return memory.spellsReceived[casterId] ?? 0;
}

export function getTotalLandLostTo(memory: BotMemory, attackerId: string): number {
  return memory.landLostTo[attackerId] ?? 0;
}

export function getGrudgeLevel(memory: BotMemory, targetId: string): number {
  const attacks = memory.attacksReceived[targetId] ?? 0;
  const spells = memory.spellsReceived[targetId] ?? 0;
  const landLost = memory.landLostTo[targetId] ?? 0;

  // Weighted grudge score
  return attacks * 10 + spells * 5 + Math.floor(landLost / 100);
}

export function getTopGrudge(memory: BotMemory): { targetId: string; level: number } | null {
  const allTargets = new Set([
    ...Object.keys(memory.attacksReceived),
    ...Object.keys(memory.spellsReceived),
  ]);

  let topTarget: { targetId: string; level: number } | null = null;

  for (const targetId of allTargets) {
    const level = getGrudgeLevel(memory, targetId);
    if (!topTarget || level > topTarget.level) {
      topTarget = { targetId, level };
    }
  }

  return topTarget;
}

// ============================================
// MEMORY FOR BOT-VS-BOT
// When a bot attacks another bot, update the defender's memory
// ============================================

export function updateBotMemoryAfterAttack(
  defender: BotEmpire,
  attackerId: string,
  landLost: number,
  currentRound: number
): void {
  defender.memory = recordAttackReceived(
    defender.memory,
    attackerId,
    landLost,
    currentRound
  );
}

export function updateBotMemoryAfterSpell(
  defender: BotEmpire,
  casterId: string,
  currentRound: number
): void {
  defender.memory = recordSpellReceived(
    defender.memory,
    casterId,
    currentRound
  );
}
