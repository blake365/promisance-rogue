import { useState } from 'react';
import { clsx } from 'clsx';
import type { DraftOption, Advisor, AdvisorEffect, RerollInfo } from '@/types';
import { formatNumber, toRomanNumeral } from '@/utils/format';
import { RarityBadge } from '@/components/ui';

interface DraftCarouselProps {
  options: DraftOption[];
  rerollInfo: RerollInfo | null;
  masteryLevels?: Record<string, number>;
  extraPicks?: number;
  onSelect: (index: number) => void;
  onReroll: () => void;
  onAdvance: () => void;
  onMarket?: () => void;
  onAdvisors?: () => void;
}

const TYPE_ICONS: Record<string, string> = {
  advisor: '👤',
  tech: '🔬',
  edict: '📜',
  policy: '📋',
};

const MASTERY_NAMES: Record<string, string> = {
  farm: 'Farming',
  cash: 'Commerce',
  explore: 'Exploration',
  industry: 'Industry',
  meditate: 'Mysticism',
};

function formatEffectShort(effect: AdvisorEffect): { text: string; positive: boolean } | null {
  const percentageTypes = [
    'food_production', 'income', 'industry', 'explore', 'offense', 'defense',
    'military', 'build_cost', 'spell_cost', 'market_bonus', 'magic',
    'rune_production', 'casualty_reduction', 'spy_ratio',
  ];

  if (percentageTypes.includes(effect.type)) {
    const pct = Math.round(effect.modifier * 100);
    const isCost = effect.type.includes('cost') || effect.type === 'spy_ratio' || effect.type === 'casualty_reduction';
    const isPositive = isCost ? pct < 0 : pct > 0;
    return { text: `${pct > 0 ? '+' : ''}${pct}%`, positive: isPositive };
  }

  if (['extra_turns', 'extra_attacks', 'health_regen'].includes(effect.type)) {
    return { text: `+${effect.modifier}`, positive: true };
  }

  if (['permanent_gate', 'permanent_shield'].includes(effect.type)) {
    return { text: 'ACTIVE', positive: true };
  }

  if (['double_explore', 'double_bank_interest'].includes(effect.type)) {
    return { text: '2x', positive: true };
  }

  return null;
}

export function DraftCarousel({
  options,
  rerollInfo,
  masteryLevels = {},
  extraPicks = 0,
  onSelect,
  onReroll,
  onAdvance,
  onMarket,
  onAdvisors,
}: DraftCarouselProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const advisorCapacity = rerollInfo?.advisorCapacity;
  const isAtAdvisorCapacity = advisorCapacity && advisorCapacity.current >= advisorCapacity.max;

  const getItemDetails = (option: DraftOption) => {
    const item = option.item as Advisor & { action?: string; level?: number };

    if (option.type === 'tech' && item.action) {
      const currentLevel = masteryLevels[item.action] ?? 0;
      const nextLevel = currentLevel + 1;
      return {
        name: item.name,
        description: item.description || `${MASTERY_NAMES[item.action] || item.action} mastery`,
        rarity: 'common' as const,
        effect: null as AdvisorEffect | null,
        levelInfo: `${currentLevel > 0 ? toRomanNumeral(currentLevel) : '0'} → ${toRomanNumeral(nextLevel)}`,
      };
    }

    return {
      name: item.name,
      description: item.description || `Level ${item.level || 1} ${option.type}`,
      rarity: item.rarity || ('common' as const),
      effect: option.type === 'advisor' ? item.effect : null,
      levelInfo: null as string | null,
    };
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="font-display text-lg text-gold">Choose Your Bonus</h2>
          {extraPicks > 0 && (
            <span className="text-sm text-green-400">+{extraPicks} extra pick{extraPicks > 1 ? 's' : ''}</span>
          )}
        </div>
        {advisorCapacity && (
          <span className={clsx('text-sm', isAtAdvisorCapacity ? 'text-red-400' : 'text-gray-400')}>
            Advisors: {advisorCapacity.current}/{advisorCapacity.max}
          </span>
        )}
      </div>

      {isAtAdvisorCapacity && (
        <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-2 text-red-400 text-sm">
          Advisor slots full! Dismiss one or choose tech/edict.
        </div>
      )}

      {/* Swipeable Cards */}
      <div className="overflow-x-auto scrollbar-hide -mx-4 px-4">
        <div className="flex gap-3" style={{ width: 'max-content' }}>
          {options.map((option, index) => {
            const details = getItemDetails(option);
            const isSelected = index === selectedIndex;
            const isAdvisorBlocked = option.type === 'advisor' && isAtAdvisorCapacity;
            const effectInfo = details.effect ? formatEffectShort(details.effect) : null;

            return (
              <button
                key={index}
                onClick={() => {
                  if (!isAdvisorBlocked) {
                    setSelectedIndex(index);
                  }
                }}
                disabled={isAdvisorBlocked}
                className={clsx(
                  'flex-shrink-0 w-[160px] p-3 rounded-lg border-2 transition-all text-left',
                  isSelected && !isAdvisorBlocked && 'border-cyan-400 shadow-blue-glow bg-cyan-500/10',
                  !isSelected && !isAdvisorBlocked && 'border-game-border bg-game-card hover:border-gray-500',
                  isAdvisorBlocked && 'border-red-500/50 bg-game-dark/50 opacity-60 cursor-not-allowed'
                )}
              >
                {/* Type Badge */}
                <div className="flex justify-between items-center mb-2">
                  <span className="text-lg">{TYPE_ICONS[option.type]}</span>
                  <span className="text-sm text-text-muted uppercase">{option.type}</span>
                </div>

                {/* Name */}
                <div className={clsx(
                  'font-display text-sm mb-1',
                  isAdvisorBlocked ? 'text-red-400' : (
                    details.rarity === 'legendary' ? 'text-legendary' :
                    details.rarity === 'rare' ? 'text-rare' :
                    details.rarity === 'uncommon' ? 'text-uncommon' : 'text-common'
                  )
                )}>
                  {details.name}
                </div>

                {/* Rarity or Level Info */}
                {details.levelInfo ? (
                  <div className="text-cyan-400 font-stats text-sm mb-2">
                    {details.levelInfo}
                  </div>
                ) : (
                  <div className="mb-2">
                    <RarityBadge rarity={details.rarity} />
                  </div>
                )}

                {/* Description */}
                <p className={clsx(
                  'text-sm line-clamp-3',
                  isAdvisorBlocked ? 'text-red-400' : 'text-text-secondary'
                )}>
                  {isAdvisorBlocked ? 'SLOTS FULL' : details.description}
                </p>

                {/* Effect Preview */}
                {effectInfo && !isAdvisorBlocked && (
                  <div className={clsx(
                    'mt-2 font-stats text-sm',
                    effectInfo.positive ? 'text-green-400' : 'text-red-400'
                  )}>
                    {effectInfo.text}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Pagination Dots */}
      <div className="flex justify-center gap-2">
        {options.map((option, index) => {
          const isAdvisorBlocked = option.type === 'advisor' && isAtAdvisorCapacity;
          return (
            <button
              key={index}
              onClick={() => !isAdvisorBlocked && setSelectedIndex(index)}
              disabled={isAdvisorBlocked}
              className={clsx(
                'w-2 h-2 rounded-full transition-colors',
                index === selectedIndex ? 'bg-cyan-400' : 'bg-game-border',
                isAdvisorBlocked && 'opacity-50'
              )}
            />
          );
        })}
      </div>

      {/* Reroll Section */}
      {rerollInfo && rerollInfo.rerollsRemaining > 0 && (
        <div className="flex justify-between items-center bg-game-card rounded-lg p-3 border border-game-border">
          <div>
            <div className="text-sm text-text-secondary">
              Rerolls: {rerollInfo.rerollsRemaining}/{rerollInfo.maxRerolls}
            </div>
            {rerollInfo.cost !== null && (
              <div className="text-sm text-text-muted">
                Cost: {formatNumber(rerollInfo.cost)} gold
              </div>
            )}
          </div>
          <button
            onClick={onReroll}
            disabled={!rerollInfo.canAfford}
            className={clsx(
              'btn-sm',
              rerollInfo.canAfford ? 'btn-gold' : 'btn-secondary opacity-50'
            )}
          >
            🎲 Reroll
          </button>
        </div>
      )}

      {/* Confirm Selection */}
      {selectedIndex !== null && (
        <button
          onClick={() => {
            onSelect(selectedIndex);
            setSelectedIndex(null);
          }}
          className="btn-primary btn-lg w-full"
        >
          ✓ Confirm Selection
        </button>
      )}

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-2">
        {onMarket && (
          <button onClick={onMarket} className="btn-secondary btn-md">
            🏪 Market
          </button>
        )}
        {onAdvisors && (
          <button onClick={onAdvisors} className="btn-secondary btn-md">
            👤 Advisors
          </button>
        )}
      </div>

      <button onClick={onAdvance} className="btn-secondary btn-lg w-full">
        ⏩ Advance to Bot Phase
      </button>
    </div>
  );
}
