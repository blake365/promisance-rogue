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
  { key: 'bldcash', name: 'Markets', shortKey: 'm', description: '+500 gold/turn' },
  { key: 'bldtrp', name: 'Barracks', shortKey: 'b', description: 'Troop production' },
  { key: 'bldcost', name: 'Exchanges', shortKey: 'e', description: 'Better prices & reduce expenses' },
  { key: 'bldfood', name: 'Farms', shortKey: 'f', description: '+85 food/turn' },
  { key: 'bldwiz', name: 'Towers', shortKey: 't', description: 'Runes & wizards' },
];

interface Props {
  freeLand: number;
  gold: number;
  landTotal: number;
  onConfirm: (allocation: Partial<Buildings>) => void;
  onCancel: () => void;
}

export function BuildingSelector({ freeLand, gold, landTotal, onConfirm, onCancel }: Props) {
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
  const totalBuildings = Object.values(allocation).reduce((a, b) => a + b, 0);
  const totalCost = totalBuildings * costPerBuilding;
  const turnsNeeded = Math.ceil(totalBuildings / 4) || 0;

  const canAfford = totalCost <= gold;
  const hasLand = totalBuildings <= freeLand;
  const canBuild = canAfford && hasLand && totalBuildings > 0;

  useInput((input, key) => {
    const currentType = BUILDING_TYPES[selectedIndex];

    if (key.escape) {
      onCancel();
      return;
    }

    if (key.return && canBuild) {
      // Filter out zero values
      const filtered: Partial<Buildings> = {};
      for (const [k, v] of Object.entries(allocation)) {
        if (v > 0) filtered[k as keyof Buildings] = v;
      }
      onConfirm(filtered);
      return;
    }

    // Navigation
    if (key.upArrow || input === 'k') {
      setSelectedIndex((i) => (i > 0 ? i - 1 : BUILDING_TYPES.length - 1));
    } else if (key.downArrow || input === 'j') {
      setSelectedIndex((i) => (i < BUILDING_TYPES.length - 1 ? i + 1 : 0));
    }

    // Adjust quantity
    const maxCanAdd = Math.min(freeLand - totalBuildings, Math.floor((gold - totalCost) / costPerBuilding));

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
    } else if (input === 'a') {
      // All remaining to this type
      if (maxCanAdd > 0) {
        setAllocation((prev) => ({ ...prev, [currentType.key]: (prev[currentType.key] || 0) + maxCanAdd }));
      }
    } else if (input === 'c') {
      // Clear this type
      setAllocation((prev) => ({ ...prev, [currentType.key]: 0 }));
    } else if (input === 'x') {
      // Clear all
      setAllocation({
        bldcash: 0,
        bldtrp: 0,
        bldcost: 0,
        bldfood: 0,
        bldwiz: 0,
      });
    }

    // Quick select by shortkey
    const typeIndex = BUILDING_TYPES.findIndex((t) => t.shortKey === input);
    if (typeIndex >= 0) {
      setSelectedIndex(typeIndex);
    }
  });

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="cyan" paddingX={1}>
      <Text bold color="cyan">
        Build Structures
      </Text>

      <Box marginTop={1}>
        <Text>
          Free Land: <Text color="green">{freeLand}</Text> | Gold:{' '}
          <Text color="yellow">{gold.toLocaleString()}</Text> | Cost/building:{' '}
          <Text color="gray">{costPerBuilding.toLocaleString()}</Text>
        </Text>
      </Box>

      <Box flexDirection="column" marginTop={1}>
        {BUILDING_TYPES.map((type, index) => {
          const isSelected = index === selectedIndex;
          const count = allocation[type.key] || 0;
          return (
            <Box key={type.key}>
              <Text color={isSelected ? 'cyan' : 'white'}>
                {isSelected ? '>' : ' '} [{type.shortKey}] {type.name.padEnd(10)}{' '}
              </Text>
              <Text color={count > 0 ? 'green' : 'gray'}>
                {String(count).padStart(4)}
              </Text>
              <Text color="gray"> - {type.description}</Text>
            </Box>
          );
        })}
      </Box>

      <Box marginTop={1} flexDirection="column">
        <Text>
          Total: <Text color={hasLand ? 'green' : 'red'}>{totalBuildings}</Text> buildings |{' '}
          Cost: <Text color={canAfford ? 'yellow' : 'red'}>{totalCost.toLocaleString()}</Text> gold |{' '}
          Turns: <Text color="cyan">{turnsNeeded}</Text>
        </Text>
        {!hasLand && <Text color="red">Not enough free land!</Text>}
        {!canAfford && <Text color="red">Not enough gold!</Text>}
      </Box>

      <Box marginTop={1}>
        <Text color="gray">
          [↑↓] select [←→] ±1 [[ ]] ±10 [a]ll [c]lear [x] reset [Enter] build [Esc] cancel
        </Text>
      </Box>
    </Box>
  );
}
