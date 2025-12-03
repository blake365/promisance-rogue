import { useState, useMemo } from 'react';
import { clsx } from 'clsx';
import type { Buildings } from '@/types';
import { formatNumber } from '@/utils/format';
import { getBuildingCost, getDemolishRefund } from '@/utils/calculations';

interface BuildingType {
  key: keyof Buildings;
  name: string;
  icon: string;
  description: string;
}

const BUILDING_TYPES: BuildingType[] = [
  { key: 'bldcash', name: 'Markets', icon: '🏪', description: 'Gold income' },
  { key: 'bldtrp', name: 'Barracks', icon: '⚔️', description: 'Troop production' },
  { key: 'bldcost', name: 'Exchanges', icon: '💱', description: 'Reduce expenses' },
  { key: 'bldfood', name: 'Farms', icon: '🌾', description: 'Food production' },
  { key: 'bldwiz', name: 'Towers', icon: '🗼', description: 'Runes & wizards' },
];

interface BuildingPanelProps {
  freeLand: number;
  gold: number;
  landTotal: number;
  currentBuildings: Buildings;
  onBuild: (allocation: Partial<Buildings>) => void;
  onDemolish: (allocation: Partial<Buildings>) => void;
  onCancel: () => void;
}

export function BuildingPanel({
  freeLand,
  gold,
  landTotal,
  currentBuildings,
  onBuild,
  onDemolish,
  onCancel,
}: BuildingPanelProps) {
  const [mode, setMode] = useState<'build' | 'demolish'>('build');
  const [allocation, setAllocation] = useState<Partial<Record<keyof Buildings, number>>>({});

  const costPerBuilding = getBuildingCost(landTotal);
  const refundPerBuilding = getDemolishRefund(landTotal);

  const totalBuildings = useMemo(
    () => Object.values(allocation).reduce((a, b) => a + (b || 0), 0),
    [allocation]
  );

  const totalCost = totalBuildings * costPerBuilding;
  const totalRefund = totalBuildings * refundPerBuilding;
  const buildRate = Math.max(1, Math.floor(landTotal / 20));
  const turnsNeeded = totalBuildings > 0 ? Math.max(1, Math.ceil(totalBuildings / buildRate)) : 0;

  const canAfford = totalCost <= gold;
  const hasLand = totalBuildings <= freeLand;
  const canBuild = mode === 'build' && canAfford && hasLand && totalBuildings > 0;
  const canDemolish = mode === 'demolish' && totalBuildings > 0;

  const adjustAllocation = (key: keyof Buildings, delta: number) => {
    setAllocation((prev) => {
      const current = prev[key] || 0;
      let newValue = current + delta;

      if (mode === 'build') {
        const otherTotal = totalBuildings - current;
        const maxCanAdd = Math.min(
          freeLand - otherTotal,
          Math.floor((gold - otherTotal * costPerBuilding) / costPerBuilding)
        );
        newValue = Math.max(0, Math.min(maxCanAdd, newValue));
      } else {
        const maxCanDemolish = currentBuildings[key] || 0;
        newValue = Math.max(0, Math.min(maxCanDemolish, newValue));
      }

      return { ...prev, [key]: newValue };
    });
  };

  const setMax = (key: keyof Buildings) => {
    if (mode === 'build') {
      const otherTotal = totalBuildings - (allocation[key] || 0);
      const maxByLand = freeLand - otherTotal;
      const maxByGold = Math.floor((gold - otherTotal * costPerBuilding) / costPerBuilding);
      const max = Math.max(0, Math.min(maxByLand, maxByGold));
      setAllocation((prev) => ({ ...prev, [key]: max }));
    } else {
      setAllocation((prev) => ({ ...prev, [key]: currentBuildings[key] || 0 }));
    }
  };

  const clearAll = () => {
    setAllocation({});
  };

  const handleConfirm = () => {
    const filtered: Partial<Buildings> = {};
    for (const [k, v] of Object.entries(allocation)) {
      if (v && v > 0) filtered[k as keyof Buildings] = v;
    }
    if (mode === 'build') {
      onBuild(filtered);
    } else {
      onDemolish(filtered);
    }
  };

  return (
    <div className="space-y-4">
      {/* Mode Toggle */}
      <div className="flex rounded-lg overflow-hidden border border-game-border">
        <button
          onClick={() => {
            setMode('build');
            clearAll();
          }}
          className={clsx(
            'flex-1 py-2 font-display uppercase tracking-wider text-sm',
            'transition-colors duration-150',
            mode === 'build'
              ? 'bg-cyan-600 text-white'
              : 'bg-game-card text-gray-400 hover:text-white'
          )}
        >
          🏗️ Build
        </button>
        <button
          onClick={() => {
            setMode('demolish');
            clearAll();
          }}
          className={clsx(
            'flex-1 py-2 font-display uppercase tracking-wider text-sm',
            'transition-colors duration-150',
            mode === 'demolish'
              ? 'bg-red-600 text-white'
              : 'bg-game-card text-gray-400 hover:text-white'
          )}
        >
          🔨 Demolish
        </button>
      </div>

      {/* Info Bar */}
      <div className="flex justify-between text-sm">
        {mode === 'build' ? (
          <>
            <span className="text-gray-400">
              Free Land: <span className="text-green-400">{formatNumber(freeLand)}</span>
            </span>
            <span className="text-gray-400">
              Cost: <span className="text-gold">{formatNumber(costPerBuilding)}</span>/bld
            </span>
          </>
        ) : (
          <span className="text-gray-400">
            Refund: <span className="text-green-400">{formatNumber(refundPerBuilding)}</span>/bld (30%)
          </span>
        )}
      </div>

      {/* Building List */}
      <div className="space-y-2">
        {BUILDING_TYPES.map((type) => {
          const current = currentBuildings[type.key] || 0;
          const selected = allocation[type.key] || 0;

          return (
            <div
              key={type.key}
              className="bg-game-card rounded-lg p-3 border border-game-border"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{type.icon}</span>
                  <div>
                    <div className="font-display text-sm">{type.name}</div>
                    <div className="text-xs text-gray-500">{type.description}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-stats text-gold">{formatNumber(current)}</div>
                  {selected > 0 && (
                    <div
                      className={clsx(
                        'text-xs font-stats',
                        mode === 'build' ? 'text-green-400' : 'text-red-400'
                      )}
                    >
                      {mode === 'build' ? '+' : '-'}
                      {selected}
                    </div>
                  )}
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => adjustAllocation(type.key, -10)}
                    disabled={selected === 0}
                    className="number-btn w-10 h-10 text-xs disabled:opacity-30"
                  >
                    -10
                  </button>
                  <button
                    onClick={() => adjustAllocation(type.key, -1)}
                    disabled={selected === 0}
                    className="number-btn w-10 h-10 disabled:opacity-30"
                  >
                    -
                  </button>
                </div>

                <div className="font-stats text-xl text-cyan-400 min-w-[60px] text-center">
                  {selected}
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => adjustAllocation(type.key, 1)}
                    className="number-btn w-10 h-10 disabled:opacity-30"
                  >
                    +
                  </button>
                  <button
                    onClick={() => adjustAllocation(type.key, 10)}
                    className="number-btn w-10 h-10 text-xs disabled:opacity-30"
                  >
                    +10
                  </button>
                </div>

                <button
                  onClick={() => setMax(type.key)}
                  className="btn-secondary btn-sm"
                >
                  Max
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div className="bg-game-dark rounded-lg p-3 border border-game-border">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-gray-400">Total Buildings:</span>
          <span className={clsx('font-stats', totalBuildings > 0 ? 'text-cyan-400' : 'text-gray-500')}>
            {totalBuildings}
          </span>
        </div>
        {mode === 'build' ? (
          <>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-400">Total Cost:</span>
              <span className={clsx('font-stats', canAfford ? 'text-gold' : 'text-red-400')}>
                {formatNumber(totalCost)} gold
              </span>
            </div>
            {!hasLand && totalBuildings > 0 && (
              <p className="text-red-400 text-xs">Not enough free land!</p>
            )}
            {!canAfford && totalBuildings > 0 && (
              <p className="text-red-400 text-xs">Not enough gold!</p>
            )}
          </>
        ) : (
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Total Refund:</span>
            <span className="font-stats text-green-400">+{formatNumber(totalRefund)} gold</span>
          </div>
        )}
        {turnsNeeded > 0 && (
          <div className="flex justify-between text-sm mt-1">
            <span className="text-gray-400">Turns Required:</span>
            <span className="font-stats text-cyan-400">{turnsNeeded}</span>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <button onClick={clearAll} className="btn-secondary btn-md flex-1">
          Clear
        </button>
        <button onClick={onCancel} className="btn-secondary btn-md flex-1">
          Cancel
        </button>
        <button
          onClick={handleConfirm}
          disabled={mode === 'build' ? !canBuild : !canDemolish}
          className={clsx(
            'btn-lg flex-1',
            mode === 'build' ? 'btn-primary' : 'btn-danger'
          )}
        >
          {mode === 'build' ? 'Build' : 'Demolish'}
        </button>
      </div>
    </div>
  );
}
