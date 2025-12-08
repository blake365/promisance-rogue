import { useState } from 'react';
import { clsx } from 'clsx';
import type { Empire, GameRound } from '@/types';
import { formatNumber, toRomanNumeral } from '@/utils/format';
import { Panel, EraBadge } from '@/components/ui';

interface EmpireStatusProps {
  empire: Empire;
  round: GameRound;
  expanded?: boolean;
  onClose?: () => void;
}

const MASTERY_NAMES: Record<string, string> = {
  farm: 'Farming',
  cash: 'Commerce',
  explore: 'Exploration',
  industry: 'Industry',
  meditate: 'Mysticism',
};

export function EmpireStatus({ empire, round, expanded = false, onClose }: EmpireStatusProps) {
  const [isExpanded, setIsExpanded] = useState(expanded);

  // Calculate estimates (per-turn values) - matching server constants
  const usedLand = empire.resources.land - empire.resources.freeland;
  const land = Math.max(empire.resources.land, 1);

  // Food estimates (from server calcProvisions)
  // Production = freeland * 10 + farms * 85 * sqrt(1 - 0.75 * farmRatio)
  const freelandFood = empire.resources.freeland * 10;
  const farmRatio = empire.buildings.bldfood / land;
  const farmEfficiency = Math.sqrt(Math.max(0, 1 - 0.75 * farmRatio));
  const farmFood = empire.buildings.bldfood * 85 * farmEfficiency;
  const foodProduction = Math.round(freelandFood + farmFood);

  // Consumption rates from server: peasant=0.01, trparm=0.05, trplnd=0.03, trpfly=0.02, trpsea=0.01, trpwiz=0.25
  const foodConsumption = Math.round(
    empire.peasants * 0.01 +
    empire.troops.trparm * 0.05 +
    empire.troops.trplnd * 0.03 +
    empire.troops.trpfly * 0.02 +
    empire.troops.trpsea * 0.01 +
    empire.troops.trpwiz * 0.25
  );
  const foodNet = foodProduction - foodConsumption;

  // Income estimates (from server calcFinances)
  // PCI = 25 * (1 + bldcash/land)
  // Income = (PCI * taxRate * health * peasants + bldcash * 500) / sizeBonus
  const pci = 25 * (1 + empire.buildings.bldcash / land);
  const taxFactor = empire.taxRate / 100;
  const healthFactor = empire.health / 100;
  const peasantIncome = pci * taxFactor * healthFactor * empire.peasants;
  const marketIncome = empire.buildings.bldcash * 500;
  // Simplified size bonus (based on networth)
  const sizeBonus = empire.networth <= 10000 ? 1.0 :
    empire.networth <= 100000 ? 1.05 :
    empire.networth <= 1000000 ? 1.10 : 1.15;
  const estIncome = Math.round((peasantIncome + marketIncome) / sizeBonus);

  // Expense estimates (from server calcFinances)
  // Base = trparm*1 + trplnd*2.5 + trpfly*4 + trpsea*7 + trpwiz*0.5 + land*8
  const baseExpenses =
    empire.troops.trparm * 1 +
    empire.troops.trplnd * 2.5 +
    empire.troops.trpfly * 4 +
    empire.troops.trpsea * 7 +
    empire.troops.trpwiz * 0.5 +
    empire.resources.land * 8;
  // Exchange buildings reduce expenses (up to 50%)
  const exchangeRatio = empire.buildings.bldcost / land;
  const expenseReduction = Math.min(0.5, exchangeRatio);
  const estExpenses = Math.round(baseExpenses * (1 - expenseReduction));

  // Loan payment = loan / 200
  const loanPayment = Math.round(empire.loan / 200);
  const financeNet = estIncome - estExpenses - loanPayment;

  // Combat success rates
  const offSuccessRate = empire.offTotal > 0
    ? Math.round((empire.offSucc / empire.offTotal) * 100)
    : 0;
  const defSuccessRate = empire.defTotal > 0
    ? Math.round((empire.defSucc / empire.defTotal) * 100)
    : 0;

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
        <div className="flex justify-between items-start gap-2">
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-base sm:text-lg text-gold truncate">{empire.name}</h2>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-gray-400 text-xs capitalize">{empire.race}</span>
              <EraBadge era={empire.era} />
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="font-stats text-sm text-cyan-400">
              R{round.number}/10
            </div>
            <div className={clsx(
              'font-stats text-xs',
              round.turnsRemaining > 10 ? 'text-green-400' : 'text-red-400'
            )}>
              {round.turnsRemaining}T
            </div>
          </div>
        </div>

        {/* Resource Bar - Always Visible */}
        <div className="grid grid-cols-5 gap-0.5 mt-2">
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
        <div className="mt-3 pt-3 border-t border-game-border space-y-4">
          {/* Two Column Layout for Stats */}
          <div className="grid grid-cols-2 gap-3">
            {/* Agriculture */}
            <div className="bg-game-dark rounded-lg p-3 border border-green-500/30">
              <h3 className="text-xs text-green-400 uppercase tracking-wider mb-2">Agriculture</h3>
              <StatRow label="Food" value={formatNumber(empire.resources.food)} color="text-food" />
              <StatRow label="Est. Production" value={`+${formatNumber(foodProduction)}`} color="text-green-400" />
              <StatRow label="Est. Consumption" value={`-${formatNumber(foodConsumption)}`} color="text-red-400" />
              <StatRow
                label="Net"
                value={foodNet >= 0 ? `+${formatNumber(foodNet)}` : formatNumber(foodNet)}
                color={foodNet >= 0 ? 'text-green-400' : 'text-red-400'}
              />
            </div>

            {/* Finances */}
            <div className="bg-game-dark rounded-lg p-3 border border-gold/30">
              <h3 className="text-xs text-gold uppercase tracking-wider mb-2">Finances</h3>
              <StatRow label="Gold" value={`$${formatNumber(empire.resources.gold)}`} color="text-gold" />
              <StatRow label="Est. Income" value={`+$${formatNumber(estIncome)}`} color="text-green-400" />
              <StatRow label="Est. Expenses" value={`-$${formatNumber(estExpenses)}`} color="text-red-400" />
              <StatRow
                label="Net"
                value={financeNet >= 0 ? `+$${formatNumber(financeNet)}` : `-$${formatNumber(Math.abs(financeNet))}`}
                color={financeNet >= 0 ? 'text-green-400' : 'text-red-400'}
              />
              <div className="border-t border-game-border mt-2 pt-2">
                <StatRow label="Tax Rate" value={`${empire.taxRate}%`} color="text-gray-300" />
                <StatRow label="Savings" value={`$${formatNumber(empire.bank)}`} color="text-green-400" />
                <StatRow label="Loan" value={`$${formatNumber(empire.loan)}`} color={empire.loan > 0 ? 'text-red-400' : 'text-gray-500'} />
              </div>
            </div>
          </div>

          {/* Land Division */}
          <div className="bg-game-dark rounded-lg p-3 border border-cyan-500/30">
            <h3 className="text-xs text-cyan-400 uppercase tracking-wider mb-2">Land Division</h3>
            <div className="grid grid-cols-3 gap-x-4 gap-y-1 text-sm">
              <StatRow label="Huts" value={`${formatNumber(empire.buildings.bldpop)} (${formatPercent(empire.buildings.bldpop, usedLand)})`} />
              <StatRow label="Markets" value={`${formatNumber(empire.buildings.bldcash)} (${formatPercent(empire.buildings.bldcash, usedLand)})`} />
              <StatRow label="Barracks" value={`${formatNumber(empire.buildings.bldtrp)} (${formatPercent(empire.buildings.bldtrp, usedLand)})`} />
              <StatRow label="Exchanges" value={`${formatNumber(empire.buildings.bldcost)} (${formatPercent(empire.buildings.bldcost, usedLand)})`} />
              <StatRow label="Farms" value={`${formatNumber(empire.buildings.bldfood)} (${formatPercent(empire.buildings.bldfood, usedLand)})`} />
              <StatRow label="Towers" value={`${formatNumber(empire.buildings.bldwiz)} (${formatPercent(empire.buildings.bldwiz, usedLand)})`} />
            </div>
            <div className="border-t border-game-border mt-2 pt-2 flex justify-between text-sm">
              <StatRow label="Free Land" value={`${formatNumber(empire.resources.freeland)} (${formatPercent(empire.resources.freeland, empire.resources.land)})`} color="text-gray-400" />
              <StatRow label="Total Land" value={formatNumber(empire.resources.land)} color="text-cyan-400" />
            </div>
          </div>

          {/* Two Column Layout for Combat & Empire */}
          <div className="grid grid-cols-2 gap-3">
            {/* Combat Stats */}
            <div className="bg-game-dark rounded-lg p-3 border border-red-500/30">
              <h3 className="text-xs text-red-400 uppercase tracking-wider mb-2">Combat Stats</h3>
              <StatRow label="Offensive" value={`${empire.offSucc}/${empire.offTotal} (${offSuccessRate}%)`} color="text-cyan-400" />
              <StatRow label="Defensive" value={`${empire.defSucc}/${empire.defTotal} (${defSuccessRate}%)`} color="text-cyan-400" />
              <StatRow label="Kills" value={empire.kills} color="text-red-400" />
              <StatRow label="Health" value={`${empire.health}%`} color={empire.health > 50 ? 'text-green-400' : 'text-red-400'} />
            </div>

            {/* Military */}
            <div className="bg-game-dark rounded-lg p-3 border border-red-500/30">
              <h3 className="text-xs text-red-400 uppercase tracking-wider mb-2">Military</h3>
              <StatRow label="Infantry" value={formatNumber(empire.troops.trparm)} />
              <StatRow label="Cavalry" value={formatNumber(empire.troops.trplnd)} />
              <StatRow label="Aircraft" value={formatNumber(empire.troops.trpfly)} />
              <StatRow label="Navy" value={formatNumber(empire.troops.trpsea)} />
              <StatRow label="Wizards" value={formatNumber(empire.troops.trpwiz)} color="text-runes" />
            </div>
          </div>

          {/* Advisors */}
          {empire.advisors.length > 0 && (
            <div className="bg-game-dark rounded-lg p-3 border border-runes/30">
              <h3 className="text-xs text-runes uppercase tracking-wider mb-2">
                Advisors ({empire.advisors.length}/{3 + empire.bonusAdvisorSlots})
              </h3>
              <div className="space-y-1">
                {empire.advisors.map((advisor) => (
                  <div key={advisor.id} className="flex items-start gap-2">
                    <span className={clsx(
                      'text-sm font-medium',
                      advisor.rarity === 'legendary' && 'text-legendary',
                      advisor.rarity === 'rare' && 'text-rare',
                      advisor.rarity === 'uncommon' && 'text-uncommon',
                      advisor.rarity === 'common' && 'text-common'
                    )}>
                      {advisor.name}
                    </span>
                    <span className="text-xs text-gray-500">{advisor.description}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Masteries & Policies Row */}
          {(Object.keys(empire.techs).length > 0 || empire.policies.length > 0) && (
            <div className="grid grid-cols-2 gap-3">
              {/* Masteries */}
              {Object.keys(empire.techs).length > 0 && (
                <div className="bg-game-dark rounded-lg p-3 border border-cyan-500/30">
                  <h3 className="text-xs text-cyan-400 uppercase tracking-wider mb-2">Masteries</h3>
                  <div className="space-y-1">
                    {Object.entries(empire.techs).map(([action, level]) => (
                      <div key={action} className="flex justify-between text-sm">
                        <span className="text-gray-300">{MASTERY_NAMES[action] || action}</span>
                        <span className="text-cyan-400 font-stats">{toRomanNumeral(level)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Policies */}
              {empire.policies.length > 0 && (
                <div className="bg-game-dark rounded-lg p-3 border border-runes/30">
                  <h3 className="text-xs text-runes uppercase tracking-wider mb-2">Policies</h3>
                  <div className="flex flex-wrap gap-1">
                    {empire.policies.map((policy) => (
                      <span
                        key={policy}
                        className="px-2 py-1 bg-runes/20 text-runes rounded text-xs"
                      >
                        {policy.replace(/_/g, ' ')}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Back Button for Overview Mode */}
          {onClose && (
            <button onClick={onClose} className="btn-secondary btn-md w-full">
              Back
            </button>
          )}
        </div>
      )}
    </Panel>
  );
}

function formatPercent(part: number, total: number): string {
  if (total === 0) return '0%';
  return `${Math.round((part / total) * 100)}%`;
}

function StatRow({
  label,
  value,
  color = 'text-gray-300',
}: {
  label: string;
  value: string | number;
  color?: string;
}) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      <span className={clsx('font-stats', color)}>{value}</span>
    </div>
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
    <div className="text-center min-w-0">
      <div className="text-xs text-text-muted truncate">
        {icon && <span className="mr-0.5">{icon}</span>}
        <span className="hidden sm:inline">{label}</span>
      </div>
      <div className={clsx('font-stats text-sm', color)}>{formatNumber(value)}</div>
    </div>
  );
}
