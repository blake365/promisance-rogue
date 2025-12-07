import { useEffect, useState, useCallback } from 'react';
import { clsx } from 'clsx';
import type { TurnActionResult, TurnAction, SpellType, Buildings, Troops } from '@/types';
import { formatNumber } from '@/utils/format';

const SPELL_NAMES: Record<SpellType, string> = {
  shield: 'Magic Shield',
  food: 'Cornucopia',
  cash: "Midas Touch",
  runes: 'Arcane Flow',
  blast: 'Fire Blast',
  steal: 'Thievery',
  storm: 'Lightning Storm',
  struct: 'Earthquake',
  advance: 'Time Warp',
  regress: 'Time Shift',
  gate: 'Time Gate',
  spy: 'Spy',
  fight: 'Battle Cry',
};

const BUILDING_NAMES: Record<keyof Buildings, string> = {
  bldpop: 'Huts',
  bldcash: 'Markets',
  bldtrp: 'Barracks',
  bldcost: 'Blacksmiths',
  bldfood: 'Farms',
  bldwiz: 'Towers',
  blddef: 'Forts',
};

const TROOP_NAMES: Record<keyof Troops, string> = {
  trparm: 'Infantry',
  trplnd: 'Cavalry',
  trpfly: 'Air',
  trpsea: 'Navy',
  trpwiz: 'Wizards',
};

interface ActionToastProps {
  result: TurnActionResult;
  action: TurnAction;
  onDismiss: () => void;
  onViewDetails?: () => void;
  onAttackSameTarget?: () => void;
  onAttackNewTarget?: () => void;
  autoHideMs?: number;
}

export function ActionToast({
  result,
  action,
  onDismiss,
  onViewDetails,
  onAttackSameTarget,
  onAttackNewTarget,
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

        {/* Explore Details */}
        {action === 'explore' && result.landGained && result.landGained > 0 && (
          <div className="mb-2">
            <div className="text-lg font-display text-land">
              🗺️ +{formatNumber(result.landGained)} land discovered!
            </div>
            <div className="text-xs text-gray-400">
              New territory ready for development
            </div>
          </div>
        )}

        {/* Build Details */}
        {action === 'build' && result.buildingsConstructed && Object.values(result.buildingsConstructed).some(v => v && v > 0) && (
          <div className="mb-2">
            <div className="text-sm font-display text-blue-400 mb-1">🏗️ Construction Complete</div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs">
              {Object.entries(result.buildingsConstructed)
                .filter(([, v]) => v && v > 0)
                .map(([k, v]) => (
                  <div key={k} className="flex justify-between">
                    <span className="text-gray-400">{BUILDING_NAMES[k as keyof Buildings]}</span>
                    <span className="text-blue-400">+{v}</span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Industry Details */}
        {action === 'industry' && result.troopsProduced && Object.values(result.troopsProduced).some(v => v && v > 0) && (
          <div className="mb-2">
            <div className="text-sm font-display text-cyan-400 mb-1">⚙️ Troops Trained</div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs">
              {Object.entries(result.troopsProduced)
                .filter(([, v]) => v && v > 0)
                .map(([k, v]) => (
                  <div key={k} className="flex justify-between">
                    <span className="text-gray-400">{TROOP_NAMES[k as keyof Troops]}</span>
                    <span className="text-cyan-400">+{formatNumber(v!)}</span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Key Results - for actions without specific sections */}
        {!['explore', 'build', 'industry', 'attack', 'spell'].includes(action) && summary.length > 0 && (
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
            {summary.map((item, i) => (
              <span key={i} className={item.color}>
                {item.prefix}{formatNumber(item.value)} {item.label}
              </span>
            ))}
          </div>
        )}

        {/* Economy summary for resource-generating actions */}
        {['farm', 'cash', 'meditate'].includes(action) && (
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
            {summary.map((item, i) => (
              <span key={i} className={item.color}>
                {item.prefix}{formatNumber(item.value)} {item.label}
              </span>
            ))}
          </div>
        )}

        {/* Combat Details */}
        {result.combatResult && (
          <div className="mt-2 space-y-1">
            <div className={clsx(
              'text-sm font-display',
              result.combatResult.won ? 'text-green-400' : 'text-red-400'
            )}>
              ⚔️ {result.combatResult.won ? 'Victory!' : 'Defeat'}
              {result.combatResult.won && result.combatResult.landGained > 0 && (
                <span className="text-land ml-2">+{formatNumber(result.combatResult.landGained)} land</span>
              )}
            </div>

            {/* Power comparison */}
            <div className="text-xs text-gray-400">
              Power: <span className="text-cyan-400">{formatNumber(result.combatResult.offpower)}</span>
              {' vs '}
              <span className="text-red-400">{formatNumber(result.combatResult.defpower)}</span>
            </div>

            {/* Casualties */}
            {result.combatResult.attackerLosses && Object.keys(result.combatResult.attackerLosses).length > 0 && (
              <div className="text-xs">
                <span className="text-gray-500">Your losses:</span>{' '}
                <span className="text-red-400">
                  {Object.entries(result.combatResult.attackerLosses)
                    .filter(([, v]) => v && v > 0)
                    .map(([k, v]) => `${formatNumber(v!)} ${TROOP_NAMES[k as keyof Troops]}`)
                    .join(', ') || 'None'}
                </span>
              </div>
            )}

            {/* Enemy casualties (on victory) */}
            {result.combatResult.won && result.combatResult.defenderLosses && Object.keys(result.combatResult.defenderLosses).length > 0 && (
              <div className="text-xs">
                <span className="text-gray-500">Enemy losses:</span>{' '}
                <span className="text-green-400">
                  {Object.entries(result.combatResult.defenderLosses)
                    .filter(([, v]) => v && v > 0)
                    .map(([k, v]) => `${formatNumber(v!)} ${TROOP_NAMES[k as keyof Troops]}`)
                    .join(', ') || 'None'}
                </span>
              </div>
            )}

            {/* Buildings captured */}
            {result.combatResult.won && result.combatResult.buildingsGained && Object.values(result.combatResult.buildingsGained).some(v => v && v > 0) && (
              <div className="text-xs">
                <span className="text-gray-500">Captured:</span>{' '}
                <span className="text-blue-400">
                  {Object.entries(result.combatResult.buildingsGained)
                    .filter(([, v]) => v && v > 0)
                    .map(([k, v]) => `${v} ${BUILDING_NAMES[k as keyof Buildings]}`)
                    .join(', ')}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Spell Details */}
        {result.spellResult && (
          <div className="mt-2 space-y-1">
            <div className={clsx(
              'text-sm font-display',
              result.spellResult.success ? 'text-runes' : 'text-red-400'
            )}>
              ✨ {SPELL_NAMES[result.spellResult.spell] || result.spellResult.spell}
              {result.spellResult.castCount && result.spellResult.castCount > 1 && ` (${result.spellResult.castCount}x)`}
              {' '}{result.spellResult.success ? '✓' : '✗'}
            </div>

            {/* Self-buff spells - resources gained */}
            {result.spellResult.resourcesGained && Object.keys(result.spellResult.resourcesGained).length > 0 && (
              <div className="text-xs">
                {result.spellResult.resourcesGained.gold && result.spellResult.resourcesGained.gold > 0 && (
                  <span className="text-gold mr-2">+{formatNumber(result.spellResult.resourcesGained.gold)} gold</span>
                )}
                {result.spellResult.resourcesGained.food && result.spellResult.resourcesGained.food > 0 && (
                  <span className="text-food mr-2">+{formatNumber(result.spellResult.resourcesGained.food)} food</span>
                )}
                {result.spellResult.resourcesGained.runes && result.spellResult.resourcesGained.runes > 0 && (
                  <span className="text-runes mr-2">+{formatNumber(result.spellResult.resourcesGained.runes)} runes</span>
                )}
              </div>
            )}

            {/* Effect applied (shield, gate, etc.) */}
            {result.spellResult.effectApplied && (
              <div className="text-xs text-cyan-400">
                {result.spellResult.effectApplied}
                {result.spellResult.effectDuration && ` for ${result.spellResult.effectDuration} rounds`}
              </div>
            )}

            {/* Offensive spell results */}
            {result.spellResult.goldStolen && result.spellResult.goldStolen > 0 && (
              <div className="text-xs text-gold">Stole {formatNumber(result.spellResult.goldStolen)} gold!</div>
            )}

            {result.spellResult.troopsDestroyed && Object.values(result.spellResult.troopsDestroyed).some(v => v && v > 0) && (
              <div className="text-xs text-green-400">
                Destroyed: {Object.entries(result.spellResult.troopsDestroyed)
                  .filter(([, v]) => v && v > 0)
                  .map(([k, v]) => `${formatNumber(v!)} ${TROOP_NAMES[k as keyof Troops]}`)
                  .join(', ')}
              </div>
            )}

            {result.spellResult.buildingsDestroyed && Object.values(result.spellResult.buildingsDestroyed).some(v => v && v > 0) && (
              <div className="text-xs text-green-400">
                Razed: {Object.entries(result.spellResult.buildingsDestroyed)
                  .filter(([, v]) => v && v > 0)
                  .map(([k, v]) => `${v} ${BUILDING_NAMES[k as keyof Buildings]}`)
                  .join(', ')}
              </div>
            )}

            {result.spellResult.foodDestroyed && result.spellResult.foodDestroyed > 0 && (
              <div className="text-xs text-green-400">Destroyed {formatNumber(result.spellResult.foodDestroyed)} food</div>
            )}

            {/* Wizards lost */}
            {result.spellResult.wizardsLost && result.spellResult.wizardsLost > 0 && (
              <div className="text-xs text-red-400">Lost {formatNumber(result.spellResult.wizardsLost)} wizards</div>
            )}

            {/* Spy intel */}
            {result.spellResult.intel && (
              <div className="text-xs text-cyan-400">Intel gathered on {result.spellResult.intel.targetName}</div>
            )}
          </div>
        )}

        {/* View Details Link */}
        {hasDetails && !onAttackSameTarget && !onAttackNewTarget && (
          <p className="text-xs text-cyan-400 mt-2">Tap to view details →</p>
        )}

        {/* Attack Again buttons for combat */}
        {(onAttackSameTarget || onAttackNewTarget) && (
          <div className="flex gap-2 mt-3">
            {onAttackSameTarget && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAttackSameTarget();
                }}
                className="flex-1 py-2 px-3 rounded bg-red-600/80 hover:bg-red-500 text-white text-sm font-display uppercase tracking-wider transition-colors"
              >
                ⚔️ Same
              </button>
            )}
            {onAttackNewTarget && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAttackNewTarget();
                }}
                className="flex-1 py-2 px-3 rounded bg-orange-600/80 hover:bg-orange-500 text-white text-sm font-display uppercase tracking-wider transition-colors"
              >
                🎯 New
              </button>
            )}
            {hasDetails && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onViewDetails?.();
                }}
                className="py-2 px-3 rounded bg-game-border hover:bg-gray-600 text-gray-300 text-sm transition-colors"
              >
                Info
              </button>
            )}
          </div>
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
