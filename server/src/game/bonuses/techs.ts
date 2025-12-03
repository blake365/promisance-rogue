/**
 * Mastery definitions for the draft/shop system
 * Masteries provide stackable bonuses to specific actions (up to level 5)
 * Each level-up grants: +10% (levels 1-3), +15% (levels 4-5) = 60% max
 *
 * In the draft, selecting a mastery increases your level by 1.
 */

import type { Tech } from '../../types';

export const MASTERIES: Tech[] = [
  {
    id: 'farming',
    name: 'Farming Mastery',
    description: '+10% food production per level',
    action: 'farm',
  },
  {
    id: 'commerce',
    name: 'Commerce Mastery',
    description: '+10% gold income per level',
    action: 'cash',
  },
  {
    id: 'exploration',
    name: 'Exploration Mastery',
    description: '+10% land from exploring per level',
    action: 'explore',
  },
  {
    id: 'industry',
    name: 'Industry Mastery',
    description: '+10% troop production per level',
    action: 'industry',
  },
  {
    id: 'mysticism',
    name: 'Mysticism Mastery',
    description: '+10% rune production per level',
    action: 'meditate',
  },
];

// Bonus per level (percentage points)
// Levels 1-3: 10% each, Levels 4-5: 15% each = 60% total at max
export const MASTERY_BONUS_PER_LEVEL = [10, 10, 10, 15, 15];
export const MAX_MASTERY_LEVEL = 5;

// Legacy export for backwards compatibility
export const TECHS = MASTERIES;
