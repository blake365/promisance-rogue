import { useState } from 'react';
import { clsx } from 'clsx';
import type { Empire, GameRound } from '@/types';
import { formatNumber, toRomanNumeral } from '@/utils/format';
import { Panel, EraBadge } from '@/components/ui';

interface EmpireStatusProps {
  empire: Empire;
  round: GameRound;
  expanded?: boolean;
}

const MASTERY_NAMES: Record<string, string> = {
  farm: 'Farming',
  cash: 'Commerce',
  explore: 'Exploration',
  industry: 'Industry',
  meditate: 'Mysticism',
};

export function EmpireStatus({ empire, round, expanded = false }: EmpireStatusProps) {
  const [isExpanded, setIsExpanded] = useState(expanded);

  // Calculate active effects
  const effects: Array<{ name: string; icon: string; expires?: number }> = [];
  if (empire.shieldExpiresRound !== null && empire.shieldExpiresRound >= round.number) {
    effects.push({ name: 'Shield', icon: '🛡️', expires: empire.shieldExpiresRound });
  }
  if (empire.gateExpiresRound !== null && empire.gateExpiresRound >= round.number) {
    effects.push({ name: 'Gate', icon: '🌀', expires: empire.gateExpiresRound });
  }
  if (empire.pacificationExpiresRound !== null && empire.pacificationExpiresRound >= round.number) {
    effects.push({ name: 'Pacified', icon: '🕊️', expires: empire.pacificationExpiresRound });
  }
  if (empire.divineProtectionExpiresRound !== null && empire.divineProtectionExpiresRound >= round.number) {
    effects.push({ name: 'Divine', icon: '✨', expires: empire.divineProtectionExpiresRound });
  }
  if (empire.bonusTurnsNextRound > 0) {
    effects.push({ name: `+${empire.bonusTurnsNextRound} turns`, icon: '⏰' });
  }

  return (
    <Panel className="select-none">
      {/* Compact Header - Always Visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full text-left"
      >
        <div className="flex justify-between items-start">
          <div>
            <h2 className="font-display text-lg text-gold">{empire.name}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-gray-400 text-sm capitalize">{empire.race}</span>
              <EraBadge era={empire.era} />
            </div>
          </div>
          <div className="text-right">
            <div className="font-stats text-cyan-400">
              Round {round.number}/10
            </div>
            <div className={clsx(
              'font-stats text-sm',
              round.turnsRemaining > 10 ? 'text-green-400' : 'text-red-400'
            )}>
              {round.turnsRemaining} turns
            </div>
          </div>
        </div>

        {/* Resource Bar - Always Visible */}
        <div className="grid grid-cols-5 gap-1 mt-3">
          <ResourceItem label="Gold" value={empire.resources.gold} color="text-gold" icon="💰" />
          <ResourceItem label="Food" value={empire.resources.food} color="text-food" icon="🌾" />
          <ResourceItem label="Runes" value={empire.resources.runes} color="text-runes" icon="✨" />
          <ResourceItem label="Land" value={empire.resources.land} color="text-land" icon="🏰" />
          <ResourceItem label="NW" value={empire.networth} color="text-gold" />
        </div>

        {/* Active Effects */}
        {effects.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {effects.map((eff) => (
              <span
                key={eff.name}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-game-card rounded text-xs"
              >
                <span>{eff.icon}</span>
                <span className="text-gray-300">{eff.name}</span>
                {eff.expires && (
                  <span className="text-gray-500">R{eff.expires}</span>
                )}
              </span>
            ))}
          </div>
        )}

        {/* Expand Indicator */}
        <div className="flex justify-center mt-2">
          <span className={clsx(
            'text-gray-500 text-xs transition-transform',
            isExpanded && 'rotate-180'
          )}>
            ▼ {isExpanded ? 'Less' : 'More'}
          </span>
        </div>
      </button>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-game-border space-y-3">
          {/* Land & Population */}
          <div>
            <h3 className="text-label mb-1">Territory</h3>
            <div className="grid grid-cols-3 gap-2">
              <ResourceItem label="Land" value={empire.resources.land} color="text-land" icon="🏰" />
              <ResourceItem label="Free" value={empire.resources.freeland} color="text-gray-400" icon="🌲" />
              <ResourceItem label="People" value={empire.peasants} color="text-white" icon="👥" />
            </div>
          </div>

          {/* Economy */}
          <div>
            <h3 className="text-label mb-1">Economy</h3>
            <div className="grid grid-cols-3 gap-2">
              <ResourceItem label="Savings" value={empire.bank} color="text-green-400" icon="🏦" />
              <ResourceItem label="Loan" value={empire.loan} color="text-red-400" icon="💳" />
              <div className="text-center">
                <div className="text-sm text-text-muted">Health</div>
                <div className={clsx(
                  'font-stats',
                  empire.health > 50 ? 'text-green-400' : 'text-red-400'
                )}>
                  {empire.health}%
                </div>
              </div>
            </div>
          </div>

          {/* Military */}
          <div>
            <h3 className="text-label mb-1">Military</h3>
            <div className="grid grid-cols-5 gap-1 text-center text-sm">
              <TroopItem label="Inf" value={empire.troops.trparm} />
              <TroopItem label="Cav" value={empire.troops.trplnd} />
              <TroopItem label="Air" value={empire.troops.trpfly} />
              <TroopItem label="Sea" value={empire.troops.trpsea} />
              <TroopItem label="Wiz" value={empire.troops.trpwiz} color="text-runes" />
            </div>
          </div>

          {/* Advisors */}
          {empire.advisors.length > 0 && (
            <div>
              <h3 className="text-label mb-1">
                Advisors ({empire.advisors.length}/{3 + empire.bonusAdvisorSlots})
              </h3>
              <div className="flex flex-wrap gap-1">
                {empire.advisors.map((advisor) => (
                  <span
                    key={advisor.id}
                    className={clsx(
                      'px-2 py-1 rounded text-sm',
                      advisor.rarity === 'legendary' && 'bg-legendary/20 text-legendary',
                      advisor.rarity === 'rare' && 'bg-rare/20 text-rare',
                      advisor.rarity === 'uncommon' && 'bg-uncommon/20 text-uncommon',
                      advisor.rarity === 'common' && 'bg-common/20 text-common'
                    )}
                  >
                    {advisor.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Masteries */}
          {Object.keys(empire.techs).length > 0 && (
            <div>
              <h3 className="text-label mb-1">Masteries</h3>
              <div className="flex flex-wrap gap-1">
                {Object.entries(empire.techs).map(([action, level]) => (
                  <span
                    key={action}
                    className="px-2 py-1 bg-cyan-500/20 text-cyan-400 rounded text-sm"
                  >
                    {MASTERY_NAMES[action] || action} {toRomanNumeral(level)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Policies */}
          {empire.policies.length > 0 && (
            <div>
              <h3 className="text-label mb-1">Policies</h3>
              <div className="flex flex-wrap gap-1">
                {empire.policies.map((policy) => (
                  <span
                    key={policy}
                    className="px-2 py-1 bg-runes/20 text-runes rounded text-sm"
                  >
                    {policy.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            </div>
          )}

        </div>
      )}
    </Panel>
  );
}

function ResourceItem({
  label,
  value,
  color,
  icon,
}: {
  label: string;
  value: number;
  color: string;
  icon?: string;
}) {
  return (
    <div className="text-center">
      <div className="text-sm text-text-muted">
        {icon && <span className="mr-1">{icon}</span>}
        {label}
      </div>
      <div className={clsx('font-stats', color)}>{formatNumber(value)}</div>
    </div>
  );
}

function TroopItem({
  label,
  value,
  color = 'text-gray-300',
}: {
  label: string;
  value: number;
  color?: string;
}) {
  return (
    <div>
      <div className="text-text-muted">{label}</div>
      <div className={clsx('font-stats', color)}>{formatNumber(value)}</div>
    </div>
  );
}
