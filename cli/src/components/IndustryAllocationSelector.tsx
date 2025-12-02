import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import type { IndustryAllocation } from '../api/client.js';

interface TroopTypeInfo {
  key: keyof IndustryAllocation;
  name: string;
  shortKey: string;
  description: string;
}

const TROOP_TYPES: TroopTypeInfo[] = [
  { key: 'trparm', name: 'Infantry', shortKey: 'i', description: 'Ground troops - balanced offense and defense' },
  { key: 'trplnd', name: 'Vehicles', shortKey: 'v', description: 'Land units - high offense' },
  { key: 'trpfly', name: 'Aircraft', shortKey: 'a', description: 'Air units - flexible strike power' },
  { key: 'trpsea', name: 'Navy', shortKey: 'n', description: 'Naval units - strong defense' },
];

interface Props {
  currentAllocation: IndustryAllocation;
  maxTurns: number;
  onConfirm: (allocation: IndustryAllocation, turns: number) => void;
  onCancel: () => void;
}

type Mode = 'turns' | 'allocation';

export function IndustryAllocationSelector({ currentAllocation, maxTurns, onConfirm, onCancel }: Props) {
  const [turns, setTurns] = useState(1);
  const [mode, setMode] = useState<Mode>('turns');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [allocation, setAllocation] = useState<IndustryAllocation>({ ...currentAllocation });

  const totalPercent = Object.values(allocation).reduce((a, b) => a + b, 0);
  const isValid = totalPercent === 100;

  useInput((input, key) => {
    const currentType = TROOP_TYPES[selectedIndex];

    if (key.escape) {
      onCancel();
      return;
    }

    if (key.return && isValid) {
      onConfirm(allocation, turns);
      return;
    }

    if (key.tab) {
      setMode((m) => (m === 'turns' ? 'allocation' : 'turns'));
      return;
    }

    if (mode === 'turns') {
      // Turns mode - adjust turn count
      if (key.upArrow || input === '+' || input === '=') {
        setTurns((t) => Math.min(t + 1, maxTurns));
      } else if (key.downArrow || input === '-') {
        setTurns((t) => Math.max(t - 1, 1));
      } else if (key.rightArrow) {
        setTurns((t) => Math.min(t + 10, maxTurns));
      } else if (key.leftArrow) {
        setTurns((t) => Math.max(t - 10, 1));
      } else if (input === 'a') {
        setTurns(maxTurns);
      } else if (!isNaN(parseInt(input))) {
        const digit = parseInt(input);
        const newValue = turns * 10 + digit;
        if (newValue <= maxTurns) {
          setTurns(newValue);
        }
      }
    } else {
      // Allocation mode - adjust percentages
      // Navigation
      if (key.upArrow || input === 'k') {
        setSelectedIndex((i) => (i > 0 ? i - 1 : TROOP_TYPES.length - 1));
      } else if (key.downArrow || input === 'j') {
        setSelectedIndex((i) => (i < TROOP_TYPES.length - 1 ? i + 1 : 0));
      }

      // Adjust percentage
      if (key.rightArrow || input === '+' || input === '=') {
        const maxCanAdd = 100 - totalPercent;
        if (maxCanAdd > 0) {
          setAllocation((prev) => ({
            ...prev,
            [currentType.key]: Math.min(100, prev[currentType.key] + 5),
          }));
        }
      } else if (key.leftArrow || input === '-') {
        setAllocation((prev) => ({
          ...prev,
          [currentType.key]: Math.max(0, prev[currentType.key] - 5),
        }));
      } else if (input === ']') {
        // +10
        setAllocation((prev) => ({
          ...prev,
          [currentType.key]: Math.min(100, prev[currentType.key] + 10),
        }));
      } else if (input === '[') {
        // -10
        setAllocation((prev) => ({
          ...prev,
          [currentType.key]: Math.max(0, prev[currentType.key] - 10),
        }));
      } else if (input === 'z') {
        // Zero this type
        setAllocation((prev) => ({
          ...prev,
          [currentType.key]: 0,
        }));
      } else if (input === 'r') {
        // Fill remainder to this type
        const remaining = 100 - (totalPercent - allocation[currentType.key]);
        setAllocation((prev) => ({
          ...prev,
          [currentType.key]: remaining,
        }));
      } else if (input === 'e') {
        // Equal distribution
        setAllocation({
          trparm: 25,
          trplnd: 25,
          trpfly: 25,
          trpsea: 25,
        });
      } else if (input === 'x') {
        // Clear all
        setAllocation({
          trparm: 0,
          trplnd: 0,
          trpfly: 0,
          trpsea: 0,
        });
      }

      // Quick select by shortkey
      const typeIndex = TROOP_TYPES.findIndex((t) => t.shortKey === input.toLowerCase());
      if (typeIndex >= 0 && !['e', 'r'].includes(input.toLowerCase())) {
        setSelectedIndex(typeIndex);
      }
    }
  });

  const getBarColor = (percent: number) => {
    if (percent === 0) return 'gray';
    if (percent < 25) return 'yellow';
    if (percent < 50) return 'cyan';
    return 'green';
  };

  const renderBar = (percent: number) => {
    const filled = Math.floor(percent / 5);
    const empty = 20 - filled;
    return (
      <Text>
        <Text color={getBarColor(percent)}>{'█'.repeat(filled)}</Text>
        <Text color="gray">{'░'.repeat(empty)}</Text>
      </Text>
    );
  };

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="cyan" paddingX={1}>
      <Text bold color="cyan">
        Industry - Produce Troops
      </Text>

      {/* Turns input - primary */}
      <Box marginTop={1}>
        <Text color={mode === 'turns' ? 'cyan' : 'gray'}>{mode === 'turns' ? '>' : ' '} </Text>
        <Text>Turns: </Text>
        <Text bold color="cyan">{turns}</Text>
        <Text color="gray"> / {maxTurns}</Text>
      </Box>

      {/* Allocation settings - secondary */}
      <Box marginTop={1} flexDirection="column" borderStyle="single" borderColor="gray" paddingX={1}>
        <Box>
          <Text color={mode === 'allocation' ? 'cyan' : 'gray'}>{mode === 'allocation' ? '>' : ' '} </Text>
          <Text bold color="gray">Allocation </Text>
          <Text color={isValid ? 'green' : totalPercent > 100 ? 'red' : 'yellow'}>
            ({totalPercent}%)
          </Text>
          {!isValid && (
            <Text color={totalPercent > 100 ? 'red' : 'yellow'}>
              {' '}← {totalPercent > 100 ? 'over' : 'need'} {Math.abs(100 - totalPercent)}%
            </Text>
          )}
        </Box>

        <Box flexDirection="column" marginTop={1}>
          {TROOP_TYPES.map((type, index) => {
            const isSelected = mode === 'allocation' && index === selectedIndex;
            const percent = allocation[type.key];
            return (
              <Box key={type.key}>
                <Text color={isSelected ? 'cyan' : 'gray'}>{isSelected ? '>' : ' '} </Text>
                <Text color="yellow">[{type.shortKey}]</Text>
                <Text color={isSelected ? 'cyan' : 'white'}> {type.name.padEnd(10)}</Text>
                <Text color={percent > 0 ? 'green' : 'gray'}>{String(percent).padStart(3)}%</Text>
                <Text> </Text>
                {renderBar(percent)}
              </Box>
            );
          })}
        </Box>
      </Box>

      <Box marginTop={1} flexDirection="column">
        <Text color="gray">[Tab] switch • [↑↓] ±1 / select • [←→] ±10 / ±5%</Text>
        <Text color="gray">[e]qual [r]emainder [z]ero • [Enter] confirm [Esc] cancel</Text>
      </Box>
    </Box>
  );
}
