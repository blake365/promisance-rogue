import { useEffect, useState, useCallback } from 'react';
import { clsx } from 'clsx';
import type { TurnActionResult, TurnAction } from '@/types';
import { formatNumber } from '@/utils/format';

interface ActionToastProps {
  result: TurnActionResult;
  action: TurnAction;
  onDismiss: () => void;
  onViewDetails?: () => void;
  autoHideMs?: number;
}

export function ActionToast({
  result,
  action,
  onDismiss,
  onViewDetails,
  autoHideMs = 3000,
}: ActionToastProps) {
  const [isVisible, setIsVisible] = useState(true);

  const dismiss = useCallback(() => {
    setIsVisible(false);
    setTimeout(onDismiss, 300); // Wait for animation
  }, [onDismiss]);

  useEffect(() => {
    const timer = setTimeout(dismiss, autoHideMs);
    return () => clearTimeout(timer);
  }, [autoHideMs, dismiss]);

  const hasDetails = !!(result.combatResult || result.spellResult?.intel);
  const isSuccess = result.success;

  // Get primary result summary
  const summary = getSummary(result);

  return (
    <div
      className={clsx(
        'fixed bottom-20 left-4 right-4 z-50 pointer-events-auto',
        'transform transition-all duration-300 ease-out',
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
      )}
    >
      <div
        className={clsx(
          'bg-game-card border rounded-lg shadow-lg p-4 max-w-lg mx-auto',
          isSuccess ? 'border-green-500/50' : 'border-red-500/50'
        )}
        onClick={hasDetails ? onViewDetails : dismiss}
      >
        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <span className="text-2xl">{getActionIcon(action)}</span>
          <div className="flex-1 min-w-0">
            <h3 className={clsx('font-display text-sm', isSuccess ? 'text-green-400' : 'text-red-400')}>
              {getActionTitle(action)} {isSuccess ? '✓' : '✗'}
            </h3>
            <p className="text-xs text-gray-500">
              {result.turnsSpent} turn{result.turnsSpent !== 1 ? 's' : ''} • {result.turnsRemaining} left
            </p>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              dismiss();
            }}
            className="text-gray-500 hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* Stopped Early Warning */}
        {result.stoppedEarly && (
          <p className="text-xs text-yellow-400 mb-2">
            ⚠️ {result.stoppedEarly === 'food' ? 'Ran out of food!' : 'Loan limit exceeded!'}
          </p>
        )}

        {/* Key Results */}
        {summary.length > 0 && (
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
            {summary.map((item, i) => (
              <span key={i} className={item.color}>
                {item.prefix}{formatNumber(item.value)} {item.label}
              </span>
            ))}
          </div>
        )}

        {/* Combat/Spell Brief */}
        {result.combatResult && (
          <div className={clsx(
            'mt-2 text-sm font-display',
            result.combatResult.won ? 'text-green-400' : 'text-red-400'
          )}>
            ⚔️ {result.combatResult.won ? 'Victory!' : 'Defeat'}
            {result.combatResult.won && result.combatResult.landGained > 0 && (
              <span className="text-land ml-2">+{formatNumber(result.combatResult.landGained)} land</span>
            )}
          </div>
        )}

        {result.spellResult && (
          <div className={clsx(
            'mt-2 text-sm font-display',
            result.spellResult.success ? 'text-runes' : 'text-red-400'
          )}>
            ✨ {result.spellResult.success ? 'Spell succeeded' : 'Spell failed'}
            {result.spellResult.castCount && result.spellResult.castCount > 1 && ` (${result.spellResult.castCount}x)`}
          </div>
        )}

        {/* View Details Link */}
        {hasDetails && (
          <p className="text-xs text-cyan-400 mt-2">Tap to view details →</p>
        )}
      </div>
    </div>
  );
}

interface SummaryItem {
  label: string;
  value: number;
  color: string;
  prefix: string;
}

function getSummary(result: TurnActionResult): SummaryItem[] {
  const items: SummaryItem[] = [];

  // Net gold change (income - expenses + interest)
  const netGold = result.income - result.expenses + (result.bankInterest || 0) - (result.loanInterest || 0);
  if (netGold !== 0) {
    items.push({
      label: 'gold',
      value: Math.abs(netGold),
      color: netGold > 0 ? 'text-gold' : 'text-red-400',
      prefix: netGold > 0 ? '+' : '-',
    });
  }

  // Net food change
  const netFood = result.foodProduction - result.foodConsumption;
  if (netFood !== 0) {
    items.push({
      label: 'food',
      value: Math.abs(netFood),
      color: netFood > 0 ? 'text-food' : 'text-red-400',
      prefix: netFood > 0 ? '+' : '-',
    });
  }

  // Runes
  if (result.runeChange !== 0) {
    items.push({
      label: 'runes',
      value: Math.abs(result.runeChange),
      color: result.runeChange > 0 ? 'text-runes' : 'text-red-400',
      prefix: result.runeChange > 0 ? '+' : '-',
    });
  }

  // Land (for explore)
  if (result.landGained && result.landGained > 0) {
    items.push({
      label: 'land',
      value: result.landGained,
      color: 'text-land',
      prefix: '+',
    });
  }

  // Troops produced (count total)
  if (result.troopsProduced) {
    const totalTroops = Object.values(result.troopsProduced).reduce((a, b) => a + (b || 0), 0);
    if (totalTroops > 0) {
      items.push({
        label: 'troops',
        value: totalTroops,
        color: 'text-cyan-400',
        prefix: '+',
      });
    }
  }

  // Buildings constructed (count total)
  if (result.buildingsConstructed) {
    const totalBuildings = Object.values(result.buildingsConstructed).reduce((a, b) => a + (b || 0), 0);
    if (totalBuildings > 0) {
      items.push({
        label: 'buildings',
        value: totalBuildings,
        color: 'text-blue-400',
        prefix: '+',
      });
    }
  }

  return items.slice(0, 4); // Max 4 items in toast
}

function getActionIcon(action: TurnAction): string {
  const icons: Record<TurnAction, string> = {
    explore: '🗺️',
    farm: '🌾',
    cash: '💰',
    meditate: '🧘',
    industry: '⚒️',
    build: '🏗️',
    demolish: '🔨',
    attack: '⚔️',
    spell: '✨',
  };
  return icons[action] || '📋';
}

function getActionTitle(action: TurnAction): string {
  const titles: Record<TurnAction, string> = {
    explore: 'Explore',
    farm: 'Farm',
    cash: 'Cash',
    meditate: 'Meditate',
    industry: 'Industry',
    build: 'Build',
    demolish: 'Demolish',
    attack: 'Attack',
    spell: 'Spell',
  };
  return titles[action] || action;
}
