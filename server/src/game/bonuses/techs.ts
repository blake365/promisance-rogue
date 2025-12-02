/**
 * Technology definitions for the draft/shop system
 * Techs provide stackable bonuses to specific actions (up to level 3)
 */

import type { Tech } from '../../types';

export const TECHS: Tech[] = [
  // ============================================
  // FARMING TECH LINE
  // +15% food production per level (cumulative)
  // ============================================
  { id: 'farming_1', name: 'Farming I', action: 'farm', level: 1, bonus: 15 },
  { id: 'farming_2', name: 'Farming II', action: 'farm', level: 2, bonus: 15 },
  { id: 'farming_3', name: 'Farming III', action: 'farm', level: 3, bonus: 15 },

  // ============================================
  // COMMERCE TECH LINE
  // +15% gold income per level (cumulative)
  // ============================================
  { id: 'commerce_1', name: 'Commerce I', action: 'cash', level: 1, bonus: 15 },
  { id: 'commerce_2', name: 'Commerce II', action: 'cash', level: 2, bonus: 15 },
  { id: 'commerce_3', name: 'Commerce III', action: 'cash', level: 3, bonus: 15 },

  // ============================================
  // EXPLORATION TECH LINE
  // +20% land gain per level (cumulative)
  // ============================================
  { id: 'exploration_1', name: 'Exploration I', action: 'explore', level: 1, bonus: 20 },
  { id: 'exploration_2', name: 'Exploration II', action: 'explore', level: 2, bonus: 20 },
  { id: 'exploration_3', name: 'Exploration III', action: 'explore', level: 3, bonus: 20 },

  // ============================================
  // INDUSTRY TECH LINE
  // +15% troop production per level (cumulative)
  // ============================================
  { id: 'industry_1', name: 'Industry I', action: 'industry', level: 1, bonus: 15 },
  { id: 'industry_2', name: 'Industry II', action: 'industry', level: 2, bonus: 15 },
  { id: 'industry_3', name: 'Industry III', action: 'industry', level: 3, bonus: 15 },

  // ============================================
  // MYSTICISM TECH LINE
  // +15% rune production per level (cumulative)
  // ============================================
  { id: 'mysticism_1', name: 'Mysticism I', action: 'meditate', level: 1, bonus: 15 },
  { id: 'mysticism_2', name: 'Mysticism II', action: 'meditate', level: 2, bonus: 15 },
  { id: 'mysticism_3', name: 'Mysticism III', action: 'meditate', level: 3, bonus: 15 },
];
