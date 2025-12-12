import { clsx } from 'clsx';
import type { ReactNode } from 'react';
import type { Era, BonusRarity } from '@/types';

interface BadgeProps {
  children: ReactNode;
  variant?: 'default' | 'era' | 'rarity';
  era?: Era;
  rarity?: BonusRarity;
  className?: string;
}

/**
 * Badge component for era, rarity, and status indicators
 */
export function Badge({
  children,
  variant = 'default',
  era,
  rarity,
  className,
}: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider',
        // Default styling
        variant === 'default' && 'bg-game-border text-gray-300',
        // Era styling
        variant === 'era' && era === 'past' && 'era-past',
        variant === 'era' && era === 'present' && 'era-present',
        variant === 'era' && era === 'future' && 'era-future',
        // Rarity styling
        variant === 'rarity' &&
          rarity === 'common' &&
          'bg-common/20 text-common border border-common/50',
        variant === 'rarity' &&
          rarity === 'uncommon' &&
          'bg-uncommon/20 text-uncommon border border-uncommon/50',
        variant === 'rarity' &&
          rarity === 'rare' &&
          'bg-rare/20 text-rare border border-rare/50',
        variant === 'rarity' &&
          rarity === 'legendary' &&
          'bg-legendary/20 text-legendary border border-legendary/50',
        className
      )}
    >
      {children}
    </span>
  );
}

/**
 * Convenience component for era badges
 */
export function EraBadge({ era }: { era: Era }) {
  return (
    <Badge variant="era" era={era}>
      {era}
    </Badge>
  );
}

/**
 * Convenience component for rarity badges
 */
export function RarityBadge({ rarity }: { rarity: BonusRarity }) {
  return (
    <Badge variant="rarity" rarity={rarity}>
      {rarity}
    </Badge>
  );
}
