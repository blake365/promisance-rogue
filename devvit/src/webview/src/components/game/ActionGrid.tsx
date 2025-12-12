import { clsx } from 'clsx';
import type { TurnAction } from '@/types';

type ActionType = TurnAction | 'market' | 'bank' | 'overview' | 'enemies' | 'guide' | 'end_phase' | 'abandon';

interface ActionItem {
  action: ActionType;
  icon: string;
  label: string;
  description: string;
  color: string;
  turnsRequired?: number;
}

const ACTIONS: ActionItem[] = [
  { action: 'explore', icon: '🗺️', label: 'Explore', description: 'Discover land', color: 'text-green-400', turnsRequired: 1 },
  { action: 'build', icon: '🏗️', label: 'Build', description: 'Build structures', color: 'text-blue-400', turnsRequired: 1 },
  { action: 'farm', icon: '🌾', label: 'Farm', description: '+25% food', color: 'text-food', turnsRequired: 1 },
  { action: 'cash', icon: '💰', label: 'Cash', description: '+25% income', color: 'text-gold', turnsRequired: 1 },
  { action: 'industry', icon: '⚙️', label: 'Industry', description: '+25% troops', color: 'text-yellow-400', turnsRequired: 1 },
  { action: 'meditate', icon: '🔮', label: 'Meditate', description: '+25% runes', color: 'text-runes', turnsRequired: 1 },
  { action: 'attack', icon: '⚔️', label: 'Attack', description: 'Battle & capture', color: 'text-red-400', turnsRequired: 2 },
  { action: 'spell', icon: '✨', label: 'Spell', description: 'Cast magic', color: 'text-runes', turnsRequired: 2 },
];

const SECONDARY_ACTIONS: ActionItem[] = [
  { action: 'market', icon: '🏪', label: 'Market', description: 'Buy & sell', color: 'text-cyan-400' },
  { action: 'bank', icon: '🏦', label: 'Bank', description: 'Savings & loans', color: 'text-green-400' },
  { action: 'overview', icon: '📊', label: 'Overview', description: 'Empire details', color: 'text-gray-400' },
  { action: 'enemies', icon: '👁️', label: 'Enemies', description: 'View opponents', color: 'text-red-400' },
  { action: 'guide', icon: '📖', label: 'Guide', description: 'How to play', color: 'text-yellow-400' },
  { action: 'abandon', icon: '🏳️', label: 'Abandon', description: 'Quit game', color: 'text-gray-500' },
];

interface ActionGridProps {
  turnsRemaining: number;
  health: number;
  onAction: (action: ActionType) => void;
  onQuickAction: (action: TurnAction, turns: number) => void;
  onEndPhase: () => void;
  disabled?: boolean;
}

export function ActionGrid({ turnsRemaining, health, onAction, onQuickAction, onEndPhase, disabled }: ActionGridProps) {
  // Smart defaults for quick actions
  const turnsToHeal = Math.min(100 - health, turnsRemaining);
  const exploreQuickTurns = health < 100 && turnsToHeal > 0 ? turnsToHeal : Math.min(10, turnsRemaining);
  const economyQuickTurns = Math.min(turnsRemaining, 10);

  return (
    <div className="space-y-3">
      {/* Quick Actions Bar - one-tap common actions */}
      {turnsRemaining > 0 && (
        <div>
          <h3 className="text-label mb-2">Quick Actions</h3>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {/* Explore quick action - health-aware */}
            <button
              onClick={() => onQuickAction('explore', exploreQuickTurns)}
              disabled={disabled || turnsRemaining < 1}
              className={clsx(
                'flex-shrink-0 px-3 py-2 rounded-lg',
                'bg-green-600/20 border border-green-500/50',
                'text-green-400 text-sm font-display',
                'transition-all duration-150',
                !disabled && 'active:scale-95 hover:bg-green-600/30',
                disabled && 'opacity-50 cursor-not-allowed'
              )}
            >
              🗺️ Explore {exploreQuickTurns}
              {health < 100 && <span className="text-xs ml-1 text-green-300">(heal)</span>}
            </button>

            {/* Farm quick */}
            <button
              onClick={() => onQuickAction('farm', economyQuickTurns)}
              disabled={disabled || turnsRemaining < 1}
              className={clsx(
                'flex-shrink-0 px-3 py-2 rounded-lg',
                'bg-food/20 border border-food/50',
                'text-food text-sm font-display',
                'transition-all duration-150',
                !disabled && 'active:scale-95 hover:bg-food/30',
                disabled && 'opacity-50 cursor-not-allowed'
              )}
            >
              🌾 Farm {economyQuickTurns}
            </button>

            {/* Cash quick */}
            <button
              onClick={() => onQuickAction('cash', economyQuickTurns)}
              disabled={disabled || turnsRemaining < 1}
              className={clsx(
                'flex-shrink-0 px-3 py-2 rounded-lg',
                'bg-gold/20 border border-gold/50',
                'text-gold text-sm font-display',
                'transition-all duration-150',
                !disabled && 'active:scale-95 hover:bg-gold/30',
                disabled && 'opacity-50 cursor-not-allowed'
              )}
            >
              💰 Cash {economyQuickTurns}
            </button>

            {/* Industry quick */}
            <button
              onClick={() => onQuickAction('industry', economyQuickTurns)}
              disabled={disabled || turnsRemaining < 1}
              className={clsx(
                'flex-shrink-0 px-3 py-2 rounded-lg',
                'bg-cyan-600/20 border border-cyan-500/50',
                'text-cyan-400 text-sm font-display',
                'transition-all duration-150',
                !disabled && 'active:scale-95 hover:bg-cyan-600/30',
                disabled && 'opacity-50 cursor-not-allowed'
              )}
            >
              ⚙️ Industry {economyQuickTurns}
            </button>

            {/* All turns button */}
            <button
              onClick={() => onQuickAction('explore', turnsRemaining)}
              disabled={disabled || turnsRemaining < 1}
              className={clsx(
                'flex-shrink-0 px-3 py-2 rounded-lg',
                'bg-purple-600/20 border border-purple-500/50',
                'text-purple-400 text-sm font-display',
                'transition-all duration-150',
                !disabled && 'active:scale-95 hover:bg-purple-600/30',
                disabled && 'opacity-50 cursor-not-allowed'
              )}
            >
              🗺️ Explore All
            </button>
          </div>
        </div>
      )}

      {/* Primary Actions - 2x4 grid on mobile */}
      <div>
        <h3 className="text-label mb-2">Turn Actions</h3>
        <div className="grid grid-cols-4 gap-2">
          {ACTIONS.map((item) => {
            const canAfford = !item.turnsRequired || turnsRemaining >= item.turnsRequired;
            const isDisabled = disabled || !canAfford;

            return (
              <button
                key={item.action}
                onClick={() => !isDisabled && onAction(item.action)}
                disabled={isDisabled}
                className={clsx(
                  'flex flex-col items-center justify-center',
                  'min-h-[80px] p-2 rounded-lg',
                  'bg-game-card border border-game-border',
                  'transition-all duration-150',
                  !isDisabled && 'active:scale-95 active:bg-game-border hover:border-game-highlight',
                  isDisabled && 'opacity-50 cursor-not-allowed'
                )}
              >
                <span className="text-2xl">{item.icon}</span>
                <span className={clsx('text-sm font-display uppercase tracking-wider mt-1', item.color)}>
                  {item.label}
                </span>
                <span className="text-xs text-text-muted">
                  {item.description}
                  {item.turnsRequired && item.turnsRequired > 1 && ` · ${item.turnsRequired}T`}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Secondary Actions - 3 columns */}
      <div>
        <h3 className="text-label mb-2">Other</h3>
        <div className="grid grid-cols-3 gap-2">
          {SECONDARY_ACTIONS.map((item) => (
            <button
              key={item.action}
              onClick={() => !disabled && onAction(item.action)}
              disabled={disabled}
              className={clsx(
                'flex flex-col items-center justify-center',
                'min-h-[70px] p-2 rounded-lg',
                'bg-game-card/50 border border-game-border/50',
                'transition-all duration-150',
                !disabled && 'active:scale-95 hover:bg-game-card hover:border-game-border',
                disabled && 'opacity-50 cursor-not-allowed'
              )}
            >
              <span className="text-xl">{item.icon}</span>
              <span className={clsx('text-xs uppercase tracking-wider mt-1', item.color)}>
                {item.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* End Phase Button */}
      <button
        onClick={onEndPhase}
        disabled={disabled}
        className={clsx(
          'w-full py-3 rounded-lg',
          'bg-gradient-to-r from-red-600/80 to-red-800/80',
          'border border-red-500/50',
          'font-display uppercase tracking-wider text-sm',
          'transition-all duration-150',
          !disabled && 'active:scale-[0.98] hover:from-red-500/80 hover:to-red-700/80',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        End Round ({turnsRemaining} turns unused)
      </button>
    </div>
  );
}

// Compact version for bottom navigation
export function ActionBar({
  onAction,
  activeAction,
}: {
  onAction: (action: ActionType) => void;
  activeAction?: ActionType;
}) {
  const navItems: Array<{ action: ActionType; icon: string; label: string }> = [
    { action: 'overview', icon: '📊', label: 'Status' },
    { action: 'explore', icon: '⚡', label: 'Actions' },
    { action: 'market', icon: '🏪', label: 'Market' },
    { action: 'enemies', icon: '👁️', label: 'Enemies' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-game-panel border-t-2 border-game-border flex justify-around items-center h-16 px-2 z-50 pb-safe">
      {navItems.map((item) => (
        <button
          key={item.action}
          onClick={() => onAction(item.action)}
          className={clsx(
            'flex flex-col items-center justify-center flex-1 h-full',
            'transition-colors duration-150',
            activeAction === item.action ? 'text-cyan-400' : 'text-gray-400'
          )}
        >
          <span className="text-xl">{item.icon}</span>
          <span className="text-xs uppercase tracking-wider">{item.label}</span>
        </button>
      ))}
    </nav>
  );
}
