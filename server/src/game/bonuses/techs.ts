/**
 * Mastery definitions for the draft/shop system
 * Masteries provide stackable bonuses to specific actions (up to level 5)
 *
 * Bonus progression: 10%, 10%, 10%, 15%, 15% = 60% total at max level
 */

import type { Tech } from '../../types';

export const TECHS: Tech[] = [
  // ============================================
  // FARMING MASTERY LINE
  // Food production bonus per level
  // ============================================
  { id: 'farming_1', name: 'Farming Mastery I', action: 'farm', level: 1, bonus: 10 },
  { id: 'farming_2', name: 'Farming Mastery II', action: 'farm', level: 2, bonus: 10 },
  { id: 'farming_3', name: 'Farming Mastery III', action: 'farm', level: 3, bonus: 10 },
  { id: 'farming_4', name: 'Farming Mastery IV', action: 'farm', level: 4, bonus: 15 },
  { id: 'farming_5', name: 'Farming Mastery V', action: 'farm', level: 5, bonus: 15 },

  // ============================================
  // COMMERCE MASTERY LINE
  // Gold income bonus per level
  // ============================================
  { id: 'commerce_1', name: 'Commerce Mastery I', action: 'cash', level: 1, bonus: 10 },
  { id: 'commerce_2', name: 'Commerce Mastery II', action: 'cash', level: 2, bonus: 10 },
  { id: 'commerce_3', name: 'Commerce Mastery III', action: 'cash', level: 3, bonus: 10 },
  { id: 'commerce_4', name: 'Commerce Mastery IV', action: 'cash', level: 4, bonus: 15 },
  { id: 'commerce_5', name: 'Commerce Mastery V', action: 'cash', level: 5, bonus: 15 },

  // ============================================
  // EXPLORATION MASTERY LINE
  // Land gain bonus per level
  // ============================================
  { id: 'exploration_1', name: 'Exploration Mastery I', action: 'explore', level: 1, bonus: 10 },
  { id: 'exploration_2', name: 'Exploration Mastery II', action: 'explore', level: 2, bonus: 10 },
  { id: 'exploration_3', name: 'Exploration Mastery III', action: 'explore', level: 3, bonus: 10 },
  { id: 'exploration_4', name: 'Exploration Mastery IV', action: 'explore', level: 4, bonus: 15 },
  { id: 'exploration_5', name: 'Exploration Mastery V', action: 'explore', level: 5, bonus: 15 },

  // ============================================
  // INDUSTRY MASTERY LINE
  // Troop production bonus per level
  // ============================================
  { id: 'industry_1', name: 'Industry Mastery I', action: 'industry', level: 1, bonus: 10 },
  { id: 'industry_2', name: 'Industry Mastery II', action: 'industry', level: 2, bonus: 10 },
  { id: 'industry_3', name: 'Industry Mastery III', action: 'industry', level: 3, bonus: 10 },
  { id: 'industry_4', name: 'Industry Mastery IV', action: 'industry', level: 4, bonus: 15 },
  { id: 'industry_5', name: 'Industry Mastery V', action: 'industry', level: 5, bonus: 15 },

  // ============================================
  // MYSTICISM MASTERY LINE
  // Rune production bonus per level
  // ============================================
  { id: 'mysticism_1', name: 'Mysticism Mastery I', action: 'meditate', level: 1, bonus: 10 },
  { id: 'mysticism_2', name: 'Mysticism Mastery II', action: 'meditate', level: 2, bonus: 10 },
  { id: 'mysticism_3', name: 'Mysticism Mastery III', action: 'meditate', level: 3, bonus: 10 },
  { id: 'mysticism_4', name: 'Mysticism Mastery IV', action: 'meditate', level: 4, bonus: 15 },
  { id: 'mysticism_5', name: 'Mysticism Mastery V', action: 'meditate', level: 5, bonus: 15 },
];
