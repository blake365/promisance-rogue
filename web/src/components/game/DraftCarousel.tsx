import { useState } from 'react';
import { clsx } from 'clsx';
import type { DraftOption, Advisor, AdvisorEffect, RerollInfo, ShopStock, EffectiveTroopPrices, ShopTransaction } from '@/types';
import { formatNumber, toRomanNumeral } from '@/utils/format';
import { RarityBadge } from '@/components/ui';

interface QuickBuyInfo {
  gold: number;
  food: number;
  shopStock: ShopStock;
  effectivePrices: EffectiveTroopPrices;
  foodBuyPrice: number;
}

interface DraftCarouselProps {
  options: DraftOption[];
  rerollInfo: RerollInfo | null;
  masteryLevels?: Record<string, number>;
  extraPicks?: number;
  quickBuyInfo?: QuickBuyInfo;
  onSelect: (index: number) => void;
  onReroll: () => void;
  onAdvance: () => void;
  onMarket?: () => void;
  onAdvisors?: () => void;
  onQuickBuy?: (transaction: ShopTransaction) => Promise<boolean>;
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
  quickBuyInfo,
  onSelect,
  onReroll,
  onAdvance,
  onMarket,
  onAdvisors,
  onQuickBuy,
}: DraftCarouselProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [buyingItem, setBuyingItem] = useState<string | null>(null);

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
      <div className="overflow-x-auto scrollbar-hide -mx-4 px-4 snap-x snap-mandatory scroll-smooth">
        <div className="flex gap-3 pb-2" style={{ width: 'max-content' }}>
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
                  'flex-shrink-0 w-[160px] p-3 rounded-lg border-2 transition-all text-left snap-start',
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
      <div className="flex justify-center gap-1">
        {options.map((option, index) => {
          const isAdvisorBlocked = option.type === 'advisor' && isAtAdvisorCapacity;
          return (
            <button
              key={index}
              onClick={() => !isAdvisorBlocked && setSelectedIndex(index)}
              disabled={isAdvisorBlocked}
              className={clsx(
                'w-11 h-11 flex items-center justify-center', // 44px touch target
                isAdvisorBlocked && 'opacity-50'
              )}
            >
              <span
                className={clsx(
                  'w-3 h-3 rounded-full transition-colors',
                  index === selectedIndex ? 'bg-cyan-400' : 'bg-game-border'
                )}
              />
            </button>
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

      {/* Quick Buy Section */}
      {quickBuyInfo && onQuickBuy && (
        <div className="bg-game-card rounded-lg p-3 border border-game-border space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-500 uppercase tracking-wider">Quick Buy</span>
            <span className="text-sm text-gold font-stats">{formatNumber(quickBuyInfo.gold)} gold</span>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1">
            {/* Food quick buy */}
            {quickBuyInfo.shopStock.food > 0 && (() => {
              const foodToBuy = Math.min(
                quickBuyInfo.shopStock.food,
                Math.floor(quickBuyInfo.gold / quickBuyInfo.foodBuyPrice),
                1000 // Cap at 1000
              );
              const cost = foodToBuy * quickBuyInfo.foodBuyPrice;
              if (foodToBuy <= 0) return null;
              return (
                <button
                  onClick={async () => {
                    setBuyingItem('food');
                    await onQuickBuy({ type: 'buy', resource: 'food', amount: foodToBuy });
                    setBuyingItem(null);
                  }}
                  disabled={buyingItem !== null}
                  className={clsx(
                    'flex-shrink-0 px-3 py-2 rounded-lg text-sm',
                    'bg-food/20 border border-food/50 text-food',
                    'transition-all duration-150',
                    buyingItem === null ? 'active:scale-95 hover:bg-food/30' : 'opacity-50'
                  )}
                >
                  🍞 +{formatNumber(foodToBuy)}
                  <span className="text-xs ml-1 text-food/70">({formatNumber(cost)}g)</span>
                </button>
              );
            })()}

            {/* Infantry quick buy */}
            {quickBuyInfo.shopStock.trparm > 0 && (() => {
              const troopsToBuy = Math.min(
                quickBuyInfo.shopStock.trparm,
                Math.floor(quickBuyInfo.gold / quickBuyInfo.effectivePrices.trparm.buy),
                100 // Cap at 100
              );
              const cost = troopsToBuy * quickBuyInfo.effectivePrices.trparm.buy;
              if (troopsToBuy <= 0) return null;
              return (
                <button
                  onClick={async () => {
                    setBuyingItem('trparm');
                    await onQuickBuy({ type: 'buy', resource: 'troops', amount: troopsToBuy, troopType: 'trparm' });
                    setBuyingItem(null);
                  }}
                  disabled={buyingItem !== null}
                  className={clsx(
                    'flex-shrink-0 px-3 py-2 rounded-lg text-sm',
                    'bg-cyan-600/20 border border-cyan-500/50 text-cyan-400',
                    'transition-all duration-150',
                    buyingItem === null ? 'active:scale-95 hover:bg-cyan-600/30' : 'opacity-50'
                  )}
                >
                  ⚔️ +{troopsToBuy} Inf
                  <span className="text-xs ml-1 text-cyan-400/70">({formatNumber(cost)}g)</span>
                </button>
              );
            })()}

            {/* Cavalry quick buy */}
            {quickBuyInfo.shopStock.trplnd > 0 && (() => {
              const troopsToBuy = Math.min(
                quickBuyInfo.shopStock.trplnd,
                Math.floor(quickBuyInfo.gold / quickBuyInfo.effectivePrices.trplnd.buy),
                50
              );
              const cost = troopsToBuy * quickBuyInfo.effectivePrices.trplnd.buy;
              if (troopsToBuy <= 0) return null;
              return (
                <button
                  onClick={async () => {
                    setBuyingItem('trplnd');
                    await onQuickBuy({ type: 'buy', resource: 'troops', amount: troopsToBuy, troopType: 'trplnd' });
                    setBuyingItem(null);
                  }}
                  disabled={buyingItem !== null}
                  className={clsx(
                    'flex-shrink-0 px-3 py-2 rounded-lg text-sm',
                    'bg-yellow-600/20 border border-yellow-500/50 text-yellow-400',
                    'transition-all duration-150',
                    buyingItem === null ? 'active:scale-95 hover:bg-yellow-600/30' : 'opacity-50'
                  )}
                >
                  🐴 +{troopsToBuy} Cav
                  <span className="text-xs ml-1 text-yellow-400/70">({formatNumber(cost)}g)</span>
                </button>
              );
            })()}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-2">
        {onMarket && (
          <button onClick={onMarket} className="btn-secondary btn-md">
            🏪 Full Market
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
