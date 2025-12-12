import { useState, useEffect, useMemo } from 'react';
import { clsx } from 'clsx';
import type { TurnAction, IndustryAllocation, Troops, Buildings } from '@/types';
import { formatNumber } from '@/utils/format';

type SimpleAction = 'explore' | 'farm' | 'cash' | 'meditate' | 'industry';

interface ActionConfig {
  action: SimpleAction;
  icon: string;
  label: string;
  color: string;
  description: string;
}

const ACTIONS: ActionConfig[] = [
  { action: 'explore', icon: '🗺️', label: 'Explore', color: 'green', description: 'Gain land & heal' },
  { action: 'farm', icon: '🌾', label: 'Farm', color: 'amber', description: '+25% food production' },
  { action: 'cash', icon: '💰', label: 'Cash', color: 'yellow', description: '+25% tax income' },
  { action: 'industry', icon: '⚙️', label: 'Industry', color: 'cyan', description: '+25% troop production' },
  { action: 'meditate', icon: '🔮', label: 'Meditate', color: 'purple', description: '+25% rune production' },
];

interface ActionPanelProps {
  turnsRemaining: number;
  health: number;
  taxRate: number;
  industryAllocation: IndustryAllocation;
  troops: Troops;
  buildings: Buildings;
  disabled?: boolean;
  onExecute: (action: TurnAction, turns: number, options?: {
    taxRate?: number;
    industryAllocation?: IndustryAllocation;
  }) => Promise<void>;
  onBuild: () => void;
  onAttack: () => void;
  onSpell: () => void;
  onMarket: () => void;
  onBank: () => void;
  onEnemies: () => void;
  onOverview: () => void;
  onGuide: () => void;
  onEndPhase: () => void;
  onAbandon: () => void;
}

export function ActionPanel({
  turnsRemaining,
  health,
  taxRate: initialTaxRate,
  industryAllocation: initialIndustryAllocation,
  troops,
  buildings,
  disabled,
  onExecute,
  onBuild,
  onAttack,
  onSpell,
  onMarket,
  onBank,
  onEnemies,
  onOverview,
  onGuide,
  onEndPhase,
  onAbandon,
}: ActionPanelProps) {
  const [selectedAction, setSelectedAction] = useState<SimpleAction>('explore');
  const [turns, setTurns] = useState(10);
  const [taxRate, setTaxRate] = useState(initialTaxRate);
  const [industryAllocation, setIndustryAllocation] = useState(initialIndustryAllocation);
  const [isExecuting, setIsExecuting] = useState(false);

  // Smart turn default: health-based if not full, otherwise 10
  const smartTurns = health < 100
    ? Math.min(100 - health, turnsRemaining)
    : Math.min(10, turnsRemaining);

  // Sort quick actions by building count (most buildings = first)
  const sortedQuickActions = useMemo(() => {
    const actionScores: Array<{ action: SimpleAction; score: number; config: ActionConfig }> = [
      { action: 'farm', score: buildings.bldfood, config: ACTIONS.find(a => a.action === 'farm')! },
      { action: 'cash', score: buildings.bldcash, config: ACTIONS.find(a => a.action === 'cash')! },
      { action: 'industry', score: buildings.bldtrp, config: ACTIONS.find(a => a.action === 'industry')! },
      { action: 'meditate', score: buildings.bldwiz, config: ACTIONS.find(a => a.action === 'meditate')! },
    ];

    // Sort by building count descending
    return actionScores.sort((a, b) => b.score - a.score);
  }, [buildings.bldfood, buildings.bldcash, buildings.bldtrp, buildings.bldwiz]);

  // Update turns when action changes - use smartTurns for all actions
  useEffect(() => {
    setTurns(smartTurns);
  }, [selectedAction, smartTurns]);

  // Sync settings when they change externally
  useEffect(() => {
    setTaxRate(initialTaxRate);
  }, [initialTaxRate]);

  useEffect(() => {
    setIndustryAllocation(initialIndustryAllocation);
  }, [initialIndustryAllocation]);

  const handleExecute = async () => {
    if (turns <= 0 || turns > turnsRemaining || isExecuting) return;

    setIsExecuting(true);
    try {
      await onExecute(selectedAction, turns, {
        taxRate: selectedAction === 'cash' ? taxRate : undefined,
        industryAllocation: selectedAction === 'industry' ? industryAllocation : undefined,
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const handleQuickExecute = async (action: SimpleAction, quickTurns: number) => {
    if (quickTurns <= 0 || quickTurns > turnsRemaining || isExecuting) return;

    setIsExecuting(true);
    try {
      // Pass settings for cash and industry actions
      await onExecute(action, quickTurns, {
        taxRate: action === 'cash' ? taxRate : undefined,
        industryAllocation: action === 'industry' ? industryAllocation : undefined,
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const selectedConfig = ACTIONS.find(a => a.action === selectedAction)!;
  const allocationTotal = industryAllocation.trparm + industryAllocation.trplnd + industryAllocation.trpfly + industryAllocation.trpsea;
  const isAllocationValid = allocationTotal === 100;

  const getColorClasses = (color: string, selected: boolean) => {
    const colors: Record<string, { bg: string; border: string; text: string }> = {
      green: { bg: 'bg-green-600/20', border: 'border-green-500', text: 'text-green-400' },
      amber: { bg: 'bg-amber-600/20', border: 'border-amber-500', text: 'text-amber-400' },
      yellow: { bg: 'bg-yellow-600/20', border: 'border-yellow-500', text: 'text-yellow-400' },
      cyan: { bg: 'bg-cyan-600/20', border: 'border-cyan-500', text: 'text-cyan-400' },
      purple: { bg: 'bg-purple-600/20', border: 'border-purple-500', text: 'text-purple-400' },
    };
    const c = colors[color];
    return selected
      ? `${c.bg} ${c.border} ${c.text}`
      : 'bg-game-card border-game-border text-gray-400 hover:border-gray-500';
  };

  return (
    <div className="space-y-2 sm:space-y-3">
      {/* Quick Actions - One tap, sorted by building allocation */}
      <div>
        <div className="flex justify-between items-center mb-1.5">
          <h3 className="text-label">Quick Actions</h3>
          <span className="text-xs text-gray-500">(one tap)</span>
        </div>
        <div className="flex gap-1 sm:gap-2 overflow-x-auto pb-1">
          {/* Explore - always first */}
          <button
            onClick={() => handleQuickExecute('explore', smartTurns)}
            disabled={disabled || isExecuting || turnsRemaining < 1}
            className={clsx(
              'flex-shrink-0 px-2 py-1.5 sm:px-3 sm:py-2 rounded-lg text-xs sm:text-sm font-display',
              'bg-green-600/20 border border-green-500/50 text-green-400',
              'transition-all active:scale-95',
              (disabled || isExecuting) && 'opacity-50'
            )}
          >
            🗺️ Explore {smartTurns}
          </button>

          {/* Building-based actions sorted by count */}
          {sortedQuickActions.map(({ action, config }) => {
            const colorStyles: Record<string, string> = {
              amber: 'bg-amber-600/20 border-amber-500/50 text-amber-400',
              yellow: 'bg-yellow-600/20 border-yellow-500/50 text-yellow-400',
              cyan: 'bg-cyan-600/20 border-cyan-500/50 text-cyan-400',
              purple: 'bg-purple-600/20 border-purple-500/50 text-purple-400',
            };
            return (
              <button
                key={action}
                onClick={() => handleQuickExecute(action, smartTurns)}
                disabled={disabled || isExecuting || turnsRemaining < 1}
                className={clsx(
                  'flex-shrink-0 px-2 py-1.5 sm:px-3 sm:py-2 rounded-lg text-xs sm:text-sm font-display border',
                  colorStyles[config.color],
                  'transition-all active:scale-95',
                  (disabled || isExecuting) && 'opacity-50'
                )}
              >
                {config.icon} {config.label} {smartTurns}
              </button>
            );
          })}

          {/* Explore All - always last */}
          <button
            onClick={() => handleQuickExecute('explore', turnsRemaining)}
            disabled={disabled || isExecuting || turnsRemaining < 1}
            className={clsx(
              'flex-shrink-0 px-2 py-1.5 sm:px-3 sm:py-2 rounded-lg text-xs sm:text-sm font-display',
              'bg-purple-600/20 border border-purple-500/50 text-purple-400',
              'transition-all active:scale-95',
              (disabled || isExecuting) && 'opacity-50'
            )}
          >
            🗺️ All
          </button>
        </div>
      </div>

      {/* Action Type Selector */}
      <div>
        <h3 className="text-label mb-1.5">Turn Action</h3>
        <div className="grid grid-cols-5 gap-0.5 sm:gap-1">
          {ACTIONS.map((config) => (
            <button
              key={config.action}
              onClick={() => setSelectedAction(config.action)}
              disabled={disabled || isExecuting}
              className={clsx(
                'flex flex-col items-center p-1.5 sm:p-2 rounded-lg border transition-all',
                getColorClasses(config.color, selectedAction === config.action),
                (disabled || isExecuting) && 'opacity-50'
              )}
            >
              <span className="text-lg sm:text-xl">{config.icon}</span>
              <span className="text-xs font-display uppercase tracking-wider mt-0.5">
                {config.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Turn Input + Action Config */}
      <div className="bg-game-card rounded-lg border border-game-border p-2 sm:p-3 space-y-2 sm:space-y-3">
        <div className="text-xs sm:text-sm text-gray-400">{selectedConfig.description}</div>

        {/* Turn Selector */}
        <div className="flex items-center gap-1 sm:gap-2">
          <span className="text-gray-500 text-xs sm:text-sm flex-shrink-0">Turns:</span>
          <div className="flex items-center gap-0.5 sm:gap-1 flex-1 min-w-0">
            <button
              onClick={() => setTurns(Math.max(1, turns - 10))}
              disabled={disabled || isExecuting || turns <= 1}
              className="hidden sm:block w-9 h-9 rounded bg-game-dark border border-game-border text-red-400 text-xs disabled:opacity-30"
            >
              -10
            </button>
            <button
              onClick={() => setTurns(Math.max(1, turns - 1))}
              disabled={disabled || isExecuting || turns <= 1}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded bg-game-dark border border-game-border text-red-400 disabled:opacity-30"
            >
              -1
            </button>
            <input
              type="number"
              value={turns}
              onChange={(e) => {
                const v = parseInt(e.target.value);
                if (!isNaN(v)) setTurns(Math.max(1, Math.min(turnsRemaining, v)));
              }}
              disabled={disabled || isExecuting}
              className="w-12 sm:w-14 h-8 sm:h-9 text-center font-stats text-sm sm:text-base bg-game-dark border border-game-border rounded"
            />
            <button
              onClick={() => setTurns(Math.min(turnsRemaining, turns + 1))}
              disabled={disabled || isExecuting || turns >= turnsRemaining}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded bg-game-dark border border-game-border text-green-400 disabled:opacity-30"
            >
              +1
            </button>
            <button
              onClick={() => setTurns(Math.min(turnsRemaining, turns + 10))}
              disabled={disabled || isExecuting || turns >= turnsRemaining}
              className="hidden sm:block w-9 h-9 rounded bg-game-dark border border-game-border text-green-400 text-xs disabled:opacity-30"
            >
              +10
            </button>
          </div>
          <button
            onClick={() => setTurns(turnsRemaining)}
            disabled={disabled || isExecuting}
            className="px-2 sm:px-3 h-8 sm:h-9 rounded bg-game-dark border border-game-border text-cyan-400 text-xs flex-shrink-0"
          >
            Max
          </button>
        </div>

        {/* Cash-specific: Tax Rate */}
        {selectedAction === 'cash' && (
          <div className="pt-2 border-t border-game-border">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-400">Tax Rate:</span>
              <span className="font-stats text-gold">{taxRate}%</span>
            </div>
            <div className="flex gap-2">
              {[20, 40, 60, 80].map((rate) => (
                <button
                  key={rate}
                  onClick={() => setTaxRate(rate)}
                  className={clsx(
                    'flex-1 py-1 rounded text-sm border transition-colors',
                    taxRate === rate
                      ? 'border-gold bg-gold/20 text-gold'
                      : 'border-game-border bg-game-dark text-gray-400 hover:border-gray-500'
                  )}
                >
                  {rate}%
                </button>
              ))}
            </div>
            <div className="text-xs text-center mt-1">
              {taxRate <= 20 && <span className="text-green-400">Population grows faster</span>}
              {taxRate > 20 && taxRate <= 40 && <span className="text-yellow-400">Normal growth</span>}
              {taxRate > 40 && taxRate <= 60 && <span className="text-orange-400">Slower growth</span>}
              {taxRate > 60 && <span className="text-red-400">Population leaving!</span>}
            </div>
          </div>
        )}

        {/* Industry-specific: Allocation */}
        {selectedAction === 'industry' && (
          <div className="pt-2 border-t border-game-border space-y-1.5 sm:space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs sm:text-sm text-gray-400">Troop Allocation:</span>
              <span className={clsx('font-stats text-xs sm:text-sm', isAllocationValid ? 'text-green-400' : 'text-red-400')}>
                {allocationTotal}%
              </span>
            </div>
            {(['trparm', 'trplnd', 'trpfly', 'trpsea'] as const).map((type) => {
              const names = { trparm: 'Inf', trplnd: 'Cav', trpfly: 'Air', trpsea: 'Sea' };
              const fullNames = { trparm: 'Infantry', trplnd: 'Cavalry', trpfly: 'Aircraft', trpsea: 'Navy' };
              return (
                <div key={type} className="flex items-center gap-1 sm:gap-2">
                  <span className="text-gray-400 text-xs w-8 sm:w-16 sm:text-sm">
                    <span className="sm:hidden">{names[type]}</span>
                    <span className="hidden sm:inline">{fullNames[type]}</span>
                  </span>
                  <button
                    onClick={() => setIndustryAllocation(prev => ({ ...prev, [type]: Math.max(0, prev[type] - 10) }))}
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded bg-game-dark border border-game-border text-red-400 text-sm"
                  >
                    -
                  </button>
                  <div className="flex-1 relative h-5 sm:h-6">
                    <div className="h-full bg-game-dark rounded border border-game-border overflow-hidden">
                      <div
                        className="h-full bg-cyan-500/30 transition-all"
                        style={{ width: `${industryAllocation[type]}%` }}
                      />
                    </div>
                    <span className="absolute inset-0 flex items-center justify-center text-xs sm:text-sm font-stats">
                      {industryAllocation[type]}%
                    </span>
                  </div>
                  <button
                    onClick={() => setIndustryAllocation(prev => ({ ...prev, [type]: Math.min(100, prev[type] + 10) }))}
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded bg-game-dark border border-game-border text-green-400 text-sm"
                  >
                    +
                  </button>
                </div>
              );
            })}
            <div className="flex gap-0.5 sm:gap-1 flex-wrap">
              <button
                onClick={() => setIndustryAllocation({ trparm: 25, trplnd: 25, trpfly: 25, trpsea: 25 })}
                className="px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-xs border border-game-border bg-game-dark text-gray-400 hover:text-cyan-400"
              >
                Equal
              </button>
              <button
                onClick={() => setIndustryAllocation({ trparm: 100, trplnd: 0, trpfly: 0, trpsea: 0 })}
                className="px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-xs border border-game-border bg-game-dark text-gray-400 hover:text-cyan-400"
              >
                Inf
              </button>
              <button
                onClick={() => setIndustryAllocation({ trparm: 0, trplnd: 100, trpfly: 0, trpsea: 0 })}
                className="px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-xs border border-game-border bg-game-dark text-gray-400 hover:text-cyan-400"
              >
                Cav
              </button>
              <button
                onClick={() => setIndustryAllocation({ trparm: 0, trplnd: 0, trpfly: 100, trpsea: 0 })}
                className="px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-xs border border-game-border bg-game-dark text-gray-400 hover:text-cyan-400"
              >
                Air
              </button>
              <button
                onClick={() => setIndustryAllocation({ trparm: 0, trplnd: 0, trpfly: 0, trpsea: 100 })}
                className="px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-xs border border-game-border bg-game-dark text-gray-400 hover:text-cyan-400"
              >
                Navy
              </button>
            </div>
            <div className="text-xs text-gray-500 truncate">
              {formatNumber(troops.trparm)} Inf, {formatNumber(troops.trplnd)} Cav, {formatNumber(troops.trpfly)} Air, {formatNumber(troops.trpsea)} Sea
            </div>
          </div>
        )}

        {/* Execute Button */}
        <button
          onClick={handleExecute}
          disabled={disabled || isExecuting || turns <= 0 || (selectedAction === 'industry' && !isAllocationValid)}
          className={clsx(
            'w-full py-2 sm:py-3 rounded-lg font-display uppercase tracking-wider text-sm transition-all',
            'bg-gradient-to-r from-cyan-600 to-cyan-800 border border-cyan-500/50',
            'active:scale-[0.98]',
            (disabled || isExecuting || (selectedAction === 'industry' && !isAllocationValid)) && 'opacity-50 cursor-not-allowed'
          )}
        >
          {isExecuting ? 'Executing...' : `${selectedConfig.icon} ${selectedConfig.label} (${turns}T)`}
        </button>
      </div>

      {/* Complex Actions */}
      <div>
        <h3 className="text-label mb-1.5">Complex Actions</h3>
        <div className="grid grid-cols-3 gap-1 sm:gap-2">
          <button
            onClick={onBuild}
            disabled={disabled || isExecuting || turnsRemaining < 1}
            className={clsx(
              'flex flex-col items-center p-1.5 sm:p-2 rounded-lg',
              'bg-blue-600/20 border border-blue-500/50 text-blue-400',
              'transition-all active:scale-95',
              (disabled || isExecuting || turnsRemaining < 1) && 'opacity-50'
            )}
          >
            <span className="text-lg sm:text-xl">🏗️</span>
            <span className="text-xs font-display">Build</span>
          </button>
          <button
            onClick={onAttack}
            disabled={disabled || isExecuting || turnsRemaining < 2}
            className={clsx(
              'flex flex-col items-center p-1.5 sm:p-2 rounded-lg',
              'bg-red-600/20 border border-red-500/50 text-red-400',
              'transition-all active:scale-95',
              (disabled || isExecuting || turnsRemaining < 2) && 'opacity-50'
            )}
          >
            <span className="text-lg sm:text-xl">⚔️</span>
            <span className="text-xs font-display">Attack <span className="text-gray-500">2T</span></span>
          </button>
          <button
            onClick={onSpell}
            disabled={disabled || isExecuting || turnsRemaining < 2}
            className={clsx(
              'flex flex-col items-center p-1.5 sm:p-2 rounded-lg',
              'bg-purple-600/20 border border-purple-500/50 text-purple-400',
              'transition-all active:scale-95',
              (disabled || isExecuting || turnsRemaining < 2) && 'opacity-50'
            )}
          >
            <span className="text-lg sm:text-xl">✨</span>
            <span className="text-xs font-display">Spell <span className="text-gray-500">2T</span></span>
          </button>
        </div>
      </div>

      {/* Secondary Actions */}
      <div className="grid grid-cols-4 gap-0.5 sm:gap-1">
        <button onClick={onMarket} disabled={disabled} className="btn-ghost text-xs py-1.5 sm:py-2">🏪 <span className="hidden sm:inline">Market</span></button>
        <button onClick={onBank} disabled={disabled} className="btn-ghost text-xs py-1.5 sm:py-2">🏦 <span className="hidden sm:inline">Bank</span></button>
        <button onClick={onEnemies} disabled={disabled} className="btn-ghost text-xs py-1.5 sm:py-2">👁️ <span className="hidden sm:inline">Enemies</span></button>
        <button onClick={onOverview} disabled={disabled} className="btn-ghost text-xs py-1.5 sm:py-2">📊 <span className="hidden sm:inline">Overview</span></button>
      </div>

      {/* End Phase */}
      <button
        onClick={onEndPhase}
        disabled={disabled || isExecuting}
        className={clsx(
          'w-full py-2 sm:py-3 rounded-lg font-display uppercase tracking-wider text-xs sm:text-sm',
          'bg-gradient-to-r from-red-600/80 to-red-800/80 border border-red-500/50',
          'transition-all active:scale-[0.98]',
          (disabled || isExecuting) && 'opacity-50'
        )}
      >
        End Round ({turnsRemaining}T unused)
      </button>

      {/* Footer Actions */}
      <div className="flex justify-between text-xs">
        <button onClick={onGuide} className="text-gray-500 hover:text-gray-300 py-1">📖 Guide</button>
        <button onClick={onAbandon} className="text-gray-500 hover:text-red-400 py-1">🏳️ Abandon</button>
      </div>
    </div>
  );
}
