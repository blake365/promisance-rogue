import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import type { Buildings } from '../api/client.js';

interface BuildingType {
  key: keyof Buildings;
  name: string;
  shortKey: string;
  description: string;
}

const BUILDING_TYPES: BuildingType[] = [
  { key: 'bldcash', name: 'Markets', shortKey: 'm', description: 'Generate gold income' },
  { key: 'bldtrp', name: 'Barracks', shortKey: 'b', description: 'Produce troops' },
  { key: 'bldcost', name: 'Exchanges', shortKey: 'e', description: 'Reduce expenses' },
  { key: 'bldfood', name: 'Farms', shortKey: 'f', description: 'Produce food' },
  { key: 'bldwiz', name: 'Towers', shortKey: 't', description: 'Produce runes & train wizards' },
];

// Refund percentage (must match server constants)
const DEMOLISH_REFUND_PERCENT = 0.30;

type Mode = 'build' | 'demolish';

interface Props {
  freeLand: number;
  gold: number;
  landTotal: number;
  currentBuildings: Buildings;
  onBuild: (allocation: Partial<Buildings>) => void;
  onDemolish: (allocation: Partial<Buildings>) => void;
  onCancel: () => void;
}

export function BuildingSelector({ freeLand, gold, landTotal, currentBuildings, onBuild, onDemolish, onCancel }: Props) {
  const [mode, setMode] = useState<Mode>('build');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [allocation, setAllocation] = useState<Partial<Record<keyof Buildings, number>>>({
    bldcash: 0,
    bldtrp: 0,
    bldcost: 0,
    bldfood: 0,
    bldwiz: 0,
  });

  // Calculate costs (matches server: 1500 base + land * 0.05)
  const costPerBuilding = Math.floor(1500 + landTotal * 0.05);
  const refundPerBuilding = Math.floor(costPerBuilding * DEMOLISH_REFUND_PERCENT);
  const totalBuildings = Object.values(allocation).reduce((a, b) => a + b, 0);

  // Build rate scales with land (1 building per 20 acres) - matches server turns.ts
  const buildRate = Math.max(1, Math.floor(landTotal / 20));
  const turnsNeeded = totalBuildings > 0 ? Math.max(1, Math.ceil(totalBuildings / buildRate)) : 0;

  // Build mode calculations
  const totalCost = totalBuildings * costPerBuilding;
  const canAfford = totalCost <= gold;
  const hasLand = totalBuildings <= freeLand;
  const canBuild = mode === 'build' && canAfford && hasLand && totalBuildings > 0;

  // Demolish mode calculations
  const totalRefund = totalBuildings * refundPerBuilding;
  const canDemolish = mode === 'demolish' && totalBuildings > 0;

  const canConfirm = mode === 'build' ? canBuild : canDemolish;

  // Reset allocation when switching modes
  const resetAllocation = () => {
    setAllocation({
      bldcash: 0,
      bldtrp: 0,
      bldcost: 0,
      bldfood: 0,
      bldwiz: 0,
    });
  };

  useInput((input, key) => {
    const currentType = BUILDING_TYPES[selectedIndex];
    const currentOwned = currentBuildings[currentType.key] || 0;
    const currentSelected = allocation[currentType.key] || 0;

    if (key.escape) {
      onCancel();
      return;
    }

    // Tab to toggle mode
    if (key.tab) {
      setMode((m) => m === 'build' ? 'demolish' : 'build');
      resetAllocation();
      return;
    }

    if (key.return && canConfirm) {
      // Filter out zero values
      const filtered: Partial<Buildings> = {};
      for (const [k, v] of Object.entries(allocation)) {
        if (v > 0) filtered[k as keyof Buildings] = v;
      }
      if (mode === 'build') {
        onBuild(filtered);
      } else {
        onDemolish(filtered);
      }
      return;
    }

    // Navigation
    if (key.upArrow || input === 'k') {
      setSelectedIndex((i) => (i > 0 ? i - 1 : BUILDING_TYPES.length - 1));
    } else if (key.downArrow || input === 'j') {
      setSelectedIndex((i) => (i < BUILDING_TYPES.length - 1 ? i + 1 : 0));
    }

    // Adjust quantity - different max based on mode
    let maxCanAdd: number;
    if (mode === 'build') {
      maxCanAdd = Math.min(freeLand - totalBuildings, Math.floor((gold - totalCost) / costPerBuilding));
    } else {
      // Demolish mode: max is what you own minus what's already selected
      maxCanAdd = currentOwned - currentSelected;
    }

    if (key.rightArrow || input === '+' || input === '=') {
      if (maxCanAdd > 0) {
        setAllocation((prev) => ({ ...prev, [currentType.key]: (prev[currentType.key] || 0) + 1 }));
      }
    } else if (key.leftArrow || input === '-') {
      setAllocation((prev) => ({
        ...prev,
        [currentType.key]: Math.max(0, (prev[currentType.key] || 0) - 1),
      }));
    } else if (input === ']') {
      // +10
      const add = Math.min(10, maxCanAdd);
      if (add > 0) {
        setAllocation((prev) => ({ ...prev, [currentType.key]: (prev[currentType.key] || 0) + add }));
      }
    } else if (input === '[') {
      // -10
      setAllocation((prev) => ({
        ...prev,
        [currentType.key]: Math.max(0, (prev[currentType.key] || 0) - 10),
      }));
    } else if (input === '}') {
      // +100
      const add = Math.min(100, maxCanAdd);
      if (add > 0) {
        setAllocation((prev) => ({ ...prev, [currentType.key]: (prev[currentType.key] || 0) + add }));
      }
    } else if (input === '{') {
      // -100
      setAllocation((prev) => ({
        ...prev,
        [currentType.key]: Math.max(0, (prev[currentType.key] || 0) - 100),
      }));
    } else if (input === 'a') {
      // All remaining to this type
      if (mode === 'build') {
        if (maxCanAdd > 0) {
          setAllocation((prev) => ({ ...prev, [currentType.key]: (prev[currentType.key] || 0) + maxCanAdd }));
        }
      } else {
        // Demolish: select all owned
        setAllocation((prev) => ({ ...prev, [currentType.key]: currentOwned }));
      }
    } else if (input === 'c') {
      // Clear this type
      setAllocation((prev) => ({ ...prev, [currentType.key]: 0 }));
    } else if (input === 'x') {
      // Clear all
      resetAllocation();
    }

    // Quick select by shortkey
    const typeIndex = BUILDING_TYPES.findIndex((t) => t.shortKey === input);
    if (typeIndex >= 0) {
      setSelectedIndex(typeIndex);
    }
  });

  const borderColor = mode === 'build' ? 'cyan' : 'red';
  const accentColor = mode === 'build' ? 'cyan' : 'red';

  return (
    <Box flexDirection="column" borderStyle="round" borderColor={borderColor} paddingX={1}>
      {/* Mode toggle header */}
      <Box>
        <Text bold color={mode === 'build' ? 'cyan' : 'gray'}>
          {mode === 'build' ? '▶ ' : '  '}Build
        </Text>
        <Text color="gray"> | </Text>
        <Text bold color={mode === 'demolish' ? 'red' : 'gray'}>
          {mode === 'demolish' ? '▶ ' : '  '}Demolish
        </Text>
        <Text color="gray">  [Tab] to switch</Text>
      </Box>

      {/* Info row */}
      <Box marginTop={1}>
        {mode === 'build' ? (
          <Text>
            Free Land: <Text color="green">{freeLand}</Text> | Gold:{' '}
            <Text color="yellow">{gold.toLocaleString()}</Text> | Cost/building:{' '}
            <Text color="gray">{costPerBuilding.toLocaleString()}</Text>
          </Text>
        ) : (
          <Text>
            Refund/building: <Text color="green">{refundPerBuilding.toLocaleString()}</Text> gold{' '}
            <Text color="gray">({Math.round(DEMOLISH_REFUND_PERCENT * 100)}% of build cost)</Text>
          </Text>
        )}
      </Box>

      {/* Building list */}
      <Box flexDirection="column" marginTop={1}>
        {BUILDING_TYPES.map((type, index) => {
          const isSelected = index === selectedIndex;
          const count = allocation[type.key] || 0;
          const current = currentBuildings[type.key] || 0;
          return (
            <Box key={type.key}>
              <Text color={isSelected ? accentColor : 'white'}>
                {isSelected ? '>' : ' '} [{type.shortKey}] {type.name.padEnd(10)}{' '}
              </Text>
              <Text color="yellow">{String(current).padStart(4)}</Text>
              {mode === 'build' ? (
                <Text color={count > 0 ? 'green' : 'gray'}>
                  {count > 0 ? ` +${count}` : '    '}
                </Text>
              ) : (
                <Text color={count > 0 ? 'red' : 'gray'}>
                  {count > 0 ? ` -${count}` : '    '}
                </Text>
              )}
              <Text color="gray"> - {type.description}</Text>
            </Box>
          );
        })}
      </Box>

      {/* Summary row */}
      <Box marginTop={1} flexDirection="column">
        {mode === 'build' ? (
          <>
            <Text>
              Total: <Text color={hasLand ? 'green' : 'red'}>{totalBuildings}</Text> buildings |{' '}
              Cost: <Text color={canAfford ? 'yellow' : 'red'}>{totalCost.toLocaleString()}</Text> gold |{' '}
              Turns: <Text color="cyan">{turnsNeeded}</Text>
            </Text>
            {!hasLand && <Text color="red">Not enough free land!</Text>}
            {!canAfford && <Text color="red">Not enough gold!</Text>}
          </>
        ) : (
          <>
            <Text>
              Total: <Text color={canDemolish ? 'red' : 'gray'}>{totalBuildings}</Text> buildings |{' '}
              Refund: <Text color="green">+{totalRefund.toLocaleString()}</Text> gold |{' '}
              Turns: <Text color="cyan">{turnsNeeded}</Text>
            </Text>
            {!canDemolish && totalBuildings === 0 && <Text color="gray">Select buildings to demolish</Text>}
          </>
        )}
      </Box>

      {/* Controls */}
      <Box marginTop={1}>
        <Text color="gray">
          [↑↓] select [←→] ±1 [[ ]] ±10 [{'{ }'} ] ±100 [a]ll [c]lear [x] reset [Enter] {mode} [Esc] cancel
        </Text>
      </Box>
    </Box>
  );
}
