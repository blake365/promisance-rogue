/**
 * Bot Memory System
 *
 * Tracks interactions between bots and other empires.
 * Used for grudge/retaliation targeting decisions and combat intelligence.
 */

import type { BotMemory, BotEmpire, CombatIntelligence, CombatResult, AttackType, Troops, SpyIntel } from '../../types';

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
    combatIntel: {},
    spyIntel: {},
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

// ============================================
// COMBAT INTELLIGENCE
// Records results of attacks for tactical adaptation
// ============================================

/**
 * Record combat results to gather intelligence about a target.
 * Used to adapt attack tactics in future encounters.
 */
export function recordCombatIntel(
  memory: BotMemory,
  targetId: string,
  combatResult: CombatResult,
  attackType: AttackType,
  currentRound: number
): BotMemory {
  const existing = memory.combatIntel[targetId];

  const newIntel: CombatIntelligence = {
    lastDefenderLosses: combatResult.defenderLosses,
    lastAttackWon: combatResult.won,
    lastAttackType: attackType,
    round: currentRound,
    failedAttacks: (existing?.failedAttacks ?? 0) + (combatResult.won ? 0 : 1),
    successfulAttacks: (existing?.successfulAttacks ?? 0) + (combatResult.won ? 1 : 0),
  };

  return {
    ...memory,
    combatIntel: {
      ...memory.combatIntel,
      [targetId]: newIntel,
    },
  };
}

/**
 * Get combat intel for a specific target.
 */
export function getCombatIntel(
  memory: BotMemory,
  targetId: string
): CombatIntelligence | null {
  return memory.combatIntel[targetId] ?? null;
}

/**
 * Analyze combat intel to find exploitable weaknesses.
 * Returns troop types that appear weak based on low defender losses.
 *
 * Logic: If a troop line had very low losses relative to others,
 * it likely means the defender has few of those troops.
 */
export function findWeakTroopLines(
  intel: CombatIntelligence
): AttackType[] {
  const losses = intel.lastDefenderLosses;
  const troopTypes: { type: AttackType; loss: number }[] = [
    { type: 'trparm', loss: losses.trparm ?? 0 },
    { type: 'trplnd', loss: losses.trplnd ?? 0 },
    { type: 'trpfly', loss: losses.trpfly ?? 0 },
    { type: 'trpsea', loss: losses.trpsea ?? 0 },
  ];

  // Calculate total and average losses
  const totalLosses = troopTypes.reduce((sum, t) => sum + t.loss, 0);
  if (totalLosses === 0) {
    return []; // No intel from a failed attack
  }

  const avgLoss = totalLosses / 4;

  // Find troop types with losses significantly below average (< 30% of avg)
  // These are likely weak lines worth targeting
  const weakLines: AttackType[] = [];
  for (const { type, loss } of troopTypes) {
    if (loss < avgLoss * 0.3 && loss < 10) {
      weakLines.push(type);
    }
  }

  return weakLines;
}

/**
 * Update bot's combat intel after performing an attack.
 */
export function updateBotCombatIntel(
  attacker: BotEmpire,
  targetId: string,
  combatResult: CombatResult,
  attackType: AttackType,
  currentRound: number
): void {
  attacker.memory = recordCombatIntel(
    attacker.memory,
    targetId,
    combatResult,
    attackType,
    currentRound
  );
}

// ============================================
// SPY INTELLIGENCE
// Stores intel from spy spells for tactical use
// ============================================

/**
 * Store spy intel gathered from a successful spy spell.
 */
export function recordSpyIntel(
  memory: BotMemory,
  intel: SpyIntel
): BotMemory {
  return {
    ...memory,
    spyIntel: {
      ...memory.spyIntel,
      [intel.targetId]: intel,
    },
  };
}

/**
 * Get spy intel for a specific target.
 * Returns null if no intel or if intel is stale (older than 2 rounds).
 */
export function getSpyIntel(
  memory: BotMemory,
  targetId: string,
  currentRound: number,
  maxAge: number = 2
): SpyIntel | null {
  const intel = memory.spyIntel[targetId];
  if (!intel) return null;

  // Check if intel is too old
  if (currentRound - intel.round > maxAge) {
    return null; // Stale intel
  }

  return intel;
}

/**
 * Update bot's spy intel after a successful spy spell.
 */
export function updateBotSpyIntel(
  bot: BotEmpire,
  intel: SpyIntel
): void {
  bot.memory = recordSpyIntel(bot.memory, intel);
}

/**
 * Check if bot has fresh spy intel on a target.
 */
export function hasSpyIntel(
  memory: BotMemory,
  targetId: string,
  currentRound: number,
  maxAge: number = 2
): boolean {
  return getSpyIntel(memory, targetId, currentRound, maxAge) !== null;
}
