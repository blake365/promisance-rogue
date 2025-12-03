import { useState } from 'react';
import { clsx } from 'clsx';
import type { BotSummary, SpyIntel, Era } from '@/types';
import { formatNumber } from '@/utils/format';
import { EraBadge } from '@/components/ui';

interface EnemyListProps {
  bots: BotSummary[];
  intel?: Record<string, SpyIntel>;
  currentRound?: number;
  playerEra?: Era;
  hasActiveGate?: boolean;
  selectable?: boolean;
  onSelect?: (botId: string) => void;
  onClose?: () => void;
}

export function EnemyList({
  bots,
  intel = {},
  currentRound = 1,
  playerEra,
  hasActiveGate,
  selectable,
  onSelect,
  onClose,
}: EnemyListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const canAttackBot = (bot: BotSummary): boolean => {
    if (!playerEra) return true;
    if (bot.era === playerEra) return true;
    if (hasActiveGate) return true;
    return false;
  };

  const handleSelect = (bot: BotSummary) => {
    if (selectable && onSelect && canAttackBot(bot)) {
      onSelect(bot.id);
    }
  };

  const toggleExpand = (botId: string) => {
    setExpandedId((prev) => (prev === botId ? null : botId));
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="font-display text-lg text-red-400">👁️ Enemy Empires</h2>
        {onClose && (
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl">
            ✕
          </button>
        )}
      </div>

      {/* Bot Cards */}
      <div className="space-y-2">
        {bots.map((bot) => {
          const botIntel = intel[bot.id];
          const hasIntel = !!botIntel;
          const isStale = botIntel && botIntel.round < currentRound;
          const roundsOld = botIntel ? currentRound - botIntel.round : 0;
          const needsGate = playerEra && bot.era !== playerEra && !hasActiveGate;
          const isExpanded = expandedId === bot.id;
          const canAttack = canAttackBot(bot);

          return (
            <div key={bot.id} className="bg-game-card rounded-lg border border-game-border overflow-hidden">
              {/* Bot Header - Always Visible */}
              <button
                onClick={() => (selectable && canAttack ? handleSelect(bot) : toggleExpand(bot.id))}
                className={clsx(
                  'w-full p-3 text-left transition-colors',
                  selectable && canAttack && 'hover:bg-game-border',
                  needsGate && 'opacity-60'
                )}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={clsx('font-display', needsGate ? 'text-gray-500' : 'text-white')}>
                        {bot.name}
                      </span>
                      <EraBadge era={bot.era as Era} />
                      {hasIntel && (
                        <span className={clsx('text-xs px-1.5 py-0.5 rounded', isStale ? 'bg-yellow-500/20 text-yellow-400' : 'bg-runes/20 text-runes')}>
                          {isStale ? `Intel (${roundsOld}R old)` : 'Intel'}
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-400 capitalize mt-1">{bot.race}</div>
                  </div>

                  <div className="text-right">
                    <div className="font-stats text-gold">{formatNumber(bot.networth)}</div>
                    <div className="text-xs text-gray-500">
                      {formatNumber(bot.land)} land
                    </div>
                  </div>
                </div>

                {needsGate && (
                  <div className="mt-2 text-xs text-red-400 flex items-center gap-1">
                    <span>🌀</span> Needs Time Gate to attack (different era)
                  </div>
                )}

                {selectable && canAttack && (
                  <div className="mt-2 text-xs text-cyan-400">Tap to select target</div>
                )}

                {!selectable && hasIntel && (
                  <div className="mt-2 text-xs text-gray-500">
                    {isExpanded ? '▼ Hide intel' : '▶ View intel'}
                  </div>
                )}
              </button>

              {/* Expanded Intel View */}
              {isExpanded && botIntel && (
                <div className="border-t border-game-border p-3 bg-game-dark/50 space-y-3">
                  {/* Resources */}
                  <div>
                    <h4 className="text-xs text-gray-500 uppercase tracking-wider mb-1">Resources</h4>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div>
                        <span className="text-gray-400">Gold:</span>{' '}
                        <span className="text-gold font-stats">{formatNumber(botIntel.gold)}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Food:</span>{' '}
                        <span className="text-food font-stats">{formatNumber(botIntel.food)}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Runes:</span>{' '}
                        <span className="text-runes font-stats">{formatNumber(botIntel.runes)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Stats */}
                  <div>
                    <h4 className="text-xs text-gray-500 uppercase tracking-wider mb-1">Status</h4>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div>
                        <span className="text-gray-400">Health:</span>{' '}
                        <span className={clsx('font-stats', botIntel.health < 50 ? 'text-red-400' : botIntel.health < 80 ? 'text-yellow-400' : 'text-green-400')}>
                          {botIntel.health}%
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400">Tax:</span>{' '}
                        <span className="font-stats text-gray-300">{botIntel.taxRate}%</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Peasants:</span>{' '}
                        <span className="font-stats text-gray-300">{formatNumber(botIntel.peasants)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Military */}
                  <div>
                    <h4 className="text-xs text-gray-500 uppercase tracking-wider mb-1">Military</h4>
                    <div className="grid grid-cols-5 gap-1 text-center text-xs">
                      <div>
                        <div className="text-gray-500">Inf</div>
                        <div className="font-stats text-gray-300">{formatNumber(botIntel.troops.trparm)}</div>
                      </div>
                      <div>
                        <div className="text-gray-500">Cav</div>
                        <div className="font-stats text-gray-300">{formatNumber(botIntel.troops.trplnd)}</div>
                      </div>
                      <div>
                        <div className="text-gray-500">Air</div>
                        <div className="font-stats text-gray-300">{formatNumber(botIntel.troops.trpfly)}</div>
                      </div>
                      <div>
                        <div className="text-gray-500">Sea</div>
                        <div className="font-stats text-gray-300">{formatNumber(botIntel.troops.trpsea)}</div>
                      </div>
                      <div>
                        <div className="text-gray-500">Wiz</div>
                        <div className="font-stats text-runes">{formatNumber(botIntel.troops.trpwiz)}</div>
                      </div>
                    </div>
                  </div>

                  {isStale && (
                    <p className="text-xs text-yellow-400 italic">
                      ⚠️ This intel is {roundsOld} round{roundsOld > 1 ? 's' : ''} old and may be outdated
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Helper Text */}
      {selectable && (
        <p className="text-xs text-gray-500 text-center">
          Select an enemy to attack. You can only attack empires in your era{hasActiveGate ? ' (Gate active: all eras available)' : ''}.
        </p>
      )}

      {onClose && (
        <button onClick={onClose} className="btn-secondary btn-lg w-full">
          Close
        </button>
      )}
    </div>
  );
}
