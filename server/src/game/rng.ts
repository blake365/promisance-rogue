/**
 * Seeded Random Number Generator (RNG) Utility
 *
 * Implements a Linear Congruential Generator (LCG) for deterministic randomness.
 * Used throughout the game to ensure same seed + same actions = same outcomes.
 */

// LCG constants (same as used elsewhere in codebase)
const LCG_MULT = 1103515245;
const LCG_ADD = 12345;
const LCG_MASK = 0x7fffffff;

export interface RngState {
  current: number;
}

/**
 * Create initial RNG state from a seed value
 */
export function createRngState(seed: number): RngState {
  return {
    current: seed & LCG_MASK,
  };
}

/**
 * Advance RNG and return new state + raw value
 */
export function nextRng(state: RngState): { state: RngState; value: number } {
  const next = (state.current * LCG_MULT + LCG_ADD) & LCG_MASK;
  return {
    state: { current: next },
    value: next,
  };
}

/**
 * Get a random integer in range [0, max)
 */
export function randomInt(state: RngState, max: number): { state: RngState; value: number } {
  const { state: newState, value } = nextRng(state);
  return { state: newState, value: value % max };
}

/**
 * Get a random float in range [0, 1)
 */
export function randomFloat(state: RngState): { state: RngState; value: number } {
  const { state: newState, value } = nextRng(state);
  return { state: newState, value: (value % 10000) / 10000 };
}

/**
 * Get a random float in range [min, max)
 */
export function randomRange(state: RngState, min: number, max: number): { state: RngState; value: number } {
  const { state: newState, value } = randomFloat(state);
  return { state: newState, value: min + value * (max - min) };
}

/**
 * Advance RNG state multiple times (useful for creating divergence based on choices)
 */
export function advanceRngBy(state: RngState, count: number): RngState {
  let current = state;
  for (let i = 0; i < count; i++) {
    current = nextRng(current).state;
  }
  return current;
}

/**
 * Shuffle an array using Fisher-Yates with seeded RNG
 */
export function shuffleArray<T>(state: RngState, array: T[]): { state: RngState; result: T[] } {
  const result = [...array];
  let currentState = state;

  for (let i = result.length - 1; i > 0; i--) {
    const { state: newState, value } = randomInt(currentState, i + 1);
    currentState = newState;
    [result[i], result[value]] = [result[value], result[i]];
  }

  return { state: currentState, result };
}

/**
 * Select a random item from an array
 */
export function selectRandom<T>(state: RngState, array: T[]): { state: RngState; value: T } {
  const { state: newState, value } = randomInt(state, array.length);
  return { state: newState, value: array[value] };
}
