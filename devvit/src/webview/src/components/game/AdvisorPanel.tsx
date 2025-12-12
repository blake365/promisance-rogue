import { useState } from 'react';
import { clsx } from 'clsx';
import type { Advisor, AdvisorEffect } from '@/types';
import { RarityBadge } from '@/components/ui';

interface AdvisorPanelProps {
  advisors: Advisor[];
  maxAdvisors: number;
  onDismiss: (advisorId: string) => Promise<boolean>;
  onClose: () => void;
}

function formatEffect(effect: AdvisorEffect): string {
  const percentageTypes = [
    'food_production', 'income', 'industry', 'explore', 'offense', 'defense',
    'military', 'build_cost', 'spell_cost', 'market_bonus', 'magic',
    'rune_production', 'casualty_reduction', 'spy_ratio',
  ];

  if (percentageTypes.includes(effect.type)) {
    const pct = Math.round(effect.modifier * 100);
    return `${pct > 0 ? '+' : ''}${pct}% ${effect.type.replace(/_/g, ' ')}`;
  }

  if (['extra_turns', 'extra_attacks', 'health_regen'].includes(effect.type)) {
    return `+${effect.modifier} ${effect.type.replace(/_/g, ' ')}`;
  }

  if (['permanent_gate', 'permanent_shield'].includes(effect.type)) {
    return effect.type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  if (['double_explore', 'double_bank_interest'].includes(effect.type)) {
    return `2x ${effect.type.replace('double_', '').replace(/_/g, ' ')}`;
  }

  return `${effect.modifier} ${effect.type.replace(/_/g, ' ')}`;
}

export function AdvisorPanel({ advisors, maxAdvisors, onDismiss, onClose }: AdvisorPanelProps) {
  const [dismissing, setDismissing] = useState<string | null>(null);
  const [confirmDismiss, setConfirmDismiss] = useState<string | null>(null);

  const handleDismiss = async (advisorId: string) => {
    setDismissing(advisorId);
    const success = await onDismiss(advisorId);
    setDismissing(null);
    if (success) {
      setConfirmDismiss(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="font-display text-lg text-cyan-400">👤 Advisors</h2>
        <span className={clsx(
          'text-sm font-stats',
          advisors.length >= maxAdvisors ? 'text-red-400' : 'text-gray-400'
        )}>
          {advisors.length}/{maxAdvisors}
        </span>
      </div>

      {/* Empty State */}
      {advisors.length === 0 && (
        <div className="bg-game-card rounded-lg border border-game-border p-6 text-center">
          <p className="text-gray-400">No advisors hired yet.</p>
          <p className="text-sm text-gray-500 mt-2">
            Draft advisors during the shop phase to gain bonuses.
          </p>
        </div>
      )}

      {/* Advisor List */}
      <div className="space-y-2">
        {advisors.map((advisor) => {
          const isConfirming = confirmDismiss === advisor.id;
          const isDismissing = dismissing === advisor.id;

          return (
            <div
              key={advisor.id}
              className={clsx(
                'bg-game-card rounded-lg border p-3 transition-all',
                isConfirming ? 'border-red-500/50' : 'border-game-border'
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  {/* Name and Rarity */}
                  <div className="flex items-center gap-2 mb-1">
                    <span className={clsx(
                      'font-display',
                      advisor.rarity === 'legendary' ? 'text-legendary' :
                      advisor.rarity === 'rare' ? 'text-rare' :
                      advisor.rarity === 'uncommon' ? 'text-uncommon' : 'text-common'
                    )}>
                      {advisor.name}
                    </span>
                    <RarityBadge rarity={advisor.rarity} />
                  </div>

                  {/* Description */}
                  <p className="text-sm text-gray-400 mb-2">{advisor.description}</p>

                  {/* Effect */}
                  <div className="text-sm font-stats text-green-400">
                    {formatEffect(advisor.effect)}
                  </div>
                </div>

                {/* Dismiss Button */}
                <div className="flex-shrink-0">
                  {isConfirming ? (
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleDismiss(advisor.id)}
                        disabled={isDismissing}
                        className="px-2 py-1 rounded text-xs bg-red-500/20 text-red-400 border border-red-500/50 hover:bg-red-500/30"
                      >
                        {isDismissing ? '...' : 'Yes'}
                      </button>
                      <button
                        onClick={() => setConfirmDismiss(null)}
                        disabled={isDismissing}
                        className="px-2 py-1 rounded text-xs bg-game-border text-gray-400 hover:bg-game-border/80"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDismiss(advisor.id)}
                      className="px-2 py-1 rounded text-xs text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      title="Dismiss advisor"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              {isConfirming && (
                <div className="mt-2 pt-2 border-t border-red-500/30 text-xs text-red-400">
                  Dismiss this advisor? This cannot be undone.
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Info */}
      {advisors.length > 0 && (
        <p className="text-xs text-gray-500 text-center">
          Dismiss advisors to make room for new ones during drafts.
        </p>
      )}

      {/* Close Button */}
      <button onClick={onClose} className="btn-secondary btn-lg w-full">
        Close
      </button>
    </div>
  );
}
