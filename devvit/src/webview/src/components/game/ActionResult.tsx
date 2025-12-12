import { clsx } from 'clsx';
import type { TurnActionResult, TurnAction } from '@/types';
import { formatNumber, formatChange } from '@/utils/format';
import { TROOP_NAMES, BUILDING_NAMES } from '@/utils/calculations';

interface ActionResultProps {
  result: TurnActionResult;
  action: TurnAction;
  onClose: () => void;
}

export function ActionResult({ result, action, onClose }: ActionResultProps) {
  const isSuccess = result.success;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="text-center">
        <div className="text-4xl mb-2">
          {isSuccess ? '✅' : '❌'}
        </div>
        <h2 className={clsx('font-display text-xl', isSuccess ? 'text-green-400' : 'text-red-400')}>
          {getActionTitle(action)} {isSuccess ? 'Complete' : 'Failed'}
        </h2>
        <p className="text-gray-400 text-sm mt-1">
          {result.turnsSpent} turn{result.turnsSpent !== 1 ? 's' : ''} spent • {result.turnsRemaining} remaining
        </p>
      </div>

      {/* Stopped Early Warning */}
      {result.stoppedEarly && (
        <div className="bg-yellow-500/10 border border-yellow-500/50 rounded-lg p-3 text-yellow-400 text-sm">
          ⚠️ Stopped early: {result.stoppedEarly === 'food' ? 'Ran out of food!' : 'Loan limit exceeded!'}
        </div>
      )}

      {/* Results Breakdown */}
      <div className="bg-game-card rounded-lg border border-game-border p-3 space-y-3">
        {/* Economy */}
        {(result.income > 0 || result.expenses > 0) && (
          <div>
            <h3 className="text-xs text-gray-500 uppercase tracking-wider mb-1">Economy</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {result.income > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Income:</span>
                  <span className="text-green-400 font-stats">+{formatNumber(result.income)}</span>
                </div>
              )}
              {result.expenses > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Expenses:</span>
                  <span className="text-red-400 font-stats">-{formatNumber(result.expenses)}</span>
                </div>
              )}
              {result.bankInterest > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Bank Interest:</span>
                  <span className="text-green-400 font-stats">+{formatNumber(result.bankInterest)}</span>
                </div>
              )}
              {result.loanInterest > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Loan Interest:</span>
                  <span className="text-red-400 font-stats">-{formatNumber(result.loanInterest)}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Food */}
        {(result.foodProduction > 0 || result.foodConsumption > 0) && (
          <div>
            <h3 className="text-xs text-gray-500 uppercase tracking-wider mb-1">Food</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {result.foodProduction > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Produced:</span>
                  <span className="text-food font-stats">+{formatNumber(result.foodProduction)}</span>
                </div>
              )}
              {result.foodConsumption > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Consumed:</span>
                  <span className="text-red-400 font-stats">-{formatNumber(result.foodConsumption)}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Runes */}
        {result.runeChange !== 0 && (
          <div>
            <h3 className="text-xs text-gray-500 uppercase tracking-wider mb-1">Runes</h3>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Change:</span>
              <span className={clsx('font-stats', result.runeChange > 0 ? 'text-runes' : 'text-red-400')}>
                {formatChange(result.runeChange)}
              </span>
            </div>
          </div>
        )}

        {/* Land Gained */}
        {result.landGained && result.landGained > 0 && (
          <div>
            <h3 className="text-xs text-gray-500 uppercase tracking-wider mb-1">Exploration</h3>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Land Gained:</span>
              <span className="text-land font-stats">+{formatNumber(result.landGained)}</span>
            </div>
          </div>
        )}

        {/* Troops Produced */}
        {result.troopsProduced && Object.values(result.troopsProduced).some(v => v && v > 0) && (
          <div>
            <h3 className="text-xs text-gray-500 uppercase tracking-wider mb-1">Troops Produced</h3>
            <div className="grid grid-cols-2 gap-1 text-sm">
              {Object.entries(result.troopsProduced).map(([type, count]) => {
                if (!count || count <= 0) return null;
                return (
                  <div key={type} className="flex justify-between">
                    <span className="text-gray-400">{TROOP_NAMES[type] || type}:</span>
                    <span className="text-cyan-400 font-stats">+{formatNumber(count)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Buildings Constructed */}
        {result.buildingsConstructed && Object.values(result.buildingsConstructed).some(v => v && v > 0) && (
          <div>
            <h3 className="text-xs text-gray-500 uppercase tracking-wider mb-1">Buildings Constructed</h3>
            <div className="grid grid-cols-2 gap-1 text-sm">
              {Object.entries(result.buildingsConstructed).map(([type, count]) => {
                if (!count || count <= 0) return null;
                return (
                  <div key={type} className="flex justify-between">
                    <span className="text-gray-400">{BUILDING_NAMES[type] || type}:</span>
                    <span className="text-blue-400 font-stats">+{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Combat Result */}
        {result.combatResult && (
          <CombatResultDisplay combat={result.combatResult} />
        )}

        {/* Spell Result */}
        {result.spellResult && (
          <SpellResultDisplay spell={result.spellResult} />
        )}
      </div>

      {/* Close Button */}
      <button onClick={onClose} className="btn-primary btn-lg w-full">
        Continue
      </button>
    </div>
  );
}

function CombatResultDisplay({ combat }: { combat: NonNullable<TurnActionResult['combatResult']> }) {
  return (
    <div className="border-t border-game-border pt-3">
      <h3 className="text-xs text-gray-500 uppercase tracking-wider mb-2">Combat Result</h3>

      <div className={clsx(
        'text-center py-2 rounded mb-3',
        combat.won ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
      )}>
        <span className="font-display text-lg">
          {combat.won ? '⚔️ Victory!' : '💀 Defeat'}
        </span>
      </div>

      {combat.won && combat.landGained > 0 && (
        <div className="mt-2 flex justify-between text-sm">
          <span className="text-gray-400">Land Captured:</span>
          <span className="text-land font-stats">+{formatNumber(combat.landGained)}</span>
        </div>
      )}

      {/* Buildings Gained */}
      {combat.buildingsGained && Object.values(combat.buildingsGained).some(v => v && v > 0) && (
        <div className="mt-2">
          <div className="text-xs text-gray-500 mb-1">Buildings Captured</div>
          <div className="flex flex-wrap gap-2 text-xs">
            {Object.entries(combat.buildingsGained).map(([type, count]) => {
              if (!count || count <= 0) return null;
              return (
                <span key={type} className="text-green-400">
                  +{count} {BUILDING_NAMES[type] || type}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Your Losses */}
      {Object.values(combat.attackerLosses).some(v => v && v > 0) && (
        <div className="mt-2">
          <div className="text-xs text-gray-500 mb-1">Your Losses</div>
          <div className="flex flex-wrap gap-2 text-xs">
            {Object.entries(combat.attackerLosses).map(([type, count]) => {
              if (!count || count <= 0) return null;
              return (
                <span key={type} className="text-red-400">
                  -{formatNumber(count)} {TROOP_NAMES[type] || type}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Enemy Losses */}
      {Object.values(combat.defenderLosses).some(v => v && v > 0) && (
        <div className="mt-2">
          <div className="text-xs text-gray-500 mb-1">Enemy Losses</div>
          <div className="flex flex-wrap gap-2 text-xs">
            {Object.entries(combat.defenderLosses).map(([type, count]) => {
              if (!count || count <= 0) return null;
              return (
                <span key={type} className="text-cyan-400">
                  -{formatNumber(count)} {TROOP_NAMES[type] || type}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function SpellResultDisplay({ spell }: { spell: NonNullable<TurnActionResult['spellResult']> }) {
  return (
    <div className="border-t border-game-border pt-3">
      <h3 className="text-xs text-gray-500 uppercase tracking-wider mb-2">Spell Result</h3>

      <div className={clsx(
        'text-center py-2 rounded mb-3',
        spell.success ? 'bg-runes/10 text-runes' : 'bg-red-500/10 text-red-400'
      )}>
        <span className="font-display text-lg">
          {spell.success ? '✨ Spell Succeeded!' : '💫 Spell Failed'}
          {spell.castCount && spell.castCount > 1 && ` (${spell.castCount}x)`}
        </span>
      </div>

      {spell.effectApplied && (
        <div className="text-sm text-gray-400 mb-2">
          Effect: <span className="text-white">{spell.effectApplied}</span>
          {spell.effectDuration && ` (${spell.effectDuration} rounds)`}
        </div>
      )}

      {/* Resources Gained (self spells) */}
      {spell.resourcesGained && (
        <div className="grid grid-cols-3 gap-2 text-sm mb-2">
          {spell.resourcesGained.gold !== undefined && spell.resourcesGained.gold > 0 && (
            <div>
              <span className="text-gray-500">Gold:</span>
              <span className="text-gold font-stats ml-1">+{formatNumber(spell.resourcesGained.gold)}</span>
            </div>
          )}
          {spell.resourcesGained.food !== undefined && spell.resourcesGained.food > 0 && (
            <div>
              <span className="text-gray-500">Food:</span>
              <span className="text-food font-stats ml-1">+{formatNumber(spell.resourcesGained.food)}</span>
            </div>
          )}
          {spell.resourcesGained.runes !== undefined && spell.resourcesGained.runes > 0 && (
            <div>
              <span className="text-gray-500">Runes:</span>
              <span className="text-runes font-stats ml-1">+{formatNumber(spell.resourcesGained.runes)}</span>
            </div>
          )}
        </div>
      )}

      {/* Gold Stolen (steal spell) */}
      {spell.goldStolen !== undefined && spell.goldStolen > 0 && (
        <div className="text-sm mb-2">
          <span className="text-gray-400">Gold Stolen:</span>
          <span className="text-gold font-stats ml-1">+{formatNumber(spell.goldStolen)}</span>
        </div>
      )}

      {/* Food Destroyed (storm spell) */}
      {spell.foodDestroyed !== undefined && spell.foodDestroyed > 0 && (
        <div className="text-sm mb-2">
          <span className="text-gray-400">Enemy Food Destroyed:</span>
          <span className="text-cyan-400 font-stats ml-1">{formatNumber(spell.foodDestroyed)}</span>
        </div>
      )}

      {/* Cash Destroyed (storm spell) */}
      {spell.cashDestroyed !== undefined && spell.cashDestroyed > 0 && (
        <div className="text-sm mb-2">
          <span className="text-gray-400">Enemy Gold Destroyed:</span>
          <span className="text-cyan-400 font-stats ml-1">{formatNumber(spell.cashDestroyed)}</span>
        </div>
      )}

      {/* Troops Destroyed (blast spell) */}
      {spell.troopsDestroyed && Object.values(spell.troopsDestroyed).some(v => v && v > 0) && (
        <div className="mb-2">
          <div className="text-xs text-gray-500 mb-1">Enemy Troops Destroyed</div>
          <div className="flex flex-wrap gap-2 text-xs">
            {Object.entries(spell.troopsDestroyed).map(([type, count]) => {
              if (!count || count <= 0) return null;
              return (
                <span key={type} className="text-cyan-400">
                  -{formatNumber(count)} {TROOP_NAMES[type] || type}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Buildings Destroyed (struct spell) */}
      {spell.buildingsDestroyed && Object.values(spell.buildingsDestroyed).some(v => v && v > 0) && (
        <div className="mb-2">
          <div className="text-xs text-gray-500 mb-1">Enemy Buildings Destroyed</div>
          <div className="flex flex-wrap gap-2 text-xs">
            {Object.entries(spell.buildingsDestroyed).map(([type, count]) => {
              if (!count || count <= 0) return null;
              return (
                <span key={type} className="text-cyan-400">
                  -{count} {BUILDING_NAMES[type] || type}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Wizards Lost */}
      {spell.wizardsLost !== undefined && spell.wizardsLost > 0 && (
        <div className="text-sm text-red-400 mb-2">
          Lost {formatNumber(spell.wizardsLost)} wizards
        </div>
      )}

      {/* Spy Intel */}
      {spell.intel && (
        <div className="mt-2 p-2 bg-runes/10 rounded text-sm">
          <div className="text-runes font-display mb-1">📊 Intel: {spell.intel.targetName}</div>
          <div className="grid grid-cols-2 gap-1 text-xs">
            <div><span className="text-gray-500">Era:</span> <span className="text-white">{spell.intel.era}</span></div>
            <div><span className="text-gray-500">Health:</span> <span className={spell.intel.health < 50 ? 'text-red-400' : 'text-white'}>{spell.intel.health}%</span></div>
            <div><span className="text-gray-500">Land:</span> <span className="text-white">{formatNumber(spell.intel.land)}</span></div>
            <div><span className="text-gray-500">Networth:</span> <span className="text-gold">{formatNumber(spell.intel.networth)}</span></div>
            <div><span className="text-gray-500">Gold:</span> <span className="text-gold">{formatNumber(spell.intel.gold)}</span></div>
            <div><span className="text-gray-500">Food:</span> <span className="text-food">{formatNumber(spell.intel.food)}</span></div>
          </div>
          {spell.intel.troops && (
            <div className="mt-1 text-xs">
              <span className="text-gray-500">Troops:</span>{' '}
              <span className="text-white">
                {formatNumber(spell.intel.troops.trparm)} Inf, {formatNumber(spell.intel.troops.trplnd)} Cav, {formatNumber(spell.intel.troops.trpfly)} Air, {formatNumber(spell.intel.troops.trpsea)} Sea
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function getActionTitle(action: TurnAction): string {
  const titles: Record<TurnAction, string> = {
    explore: 'Exploration',
    farm: 'Farming',
    cash: 'Tax Collection',
    meditate: 'Meditation',
    industry: 'Industry',
    build: 'Construction',
    demolish: 'Demolition',
    attack: 'Attack',
    spell: 'Spell Cast',
  };
  return titles[action] || action;
}
