import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import type { TurnAction } from '../api/client.js';

interface ActionItem {
  key: string;
  action: TurnAction | 'end_phase' | 'status' | 'overview' | 'bots' | 'market' | 'bank';
  label: string;
  description: string;
  color: string;
}

// Left column actions
const LEFT_ACTIONS: ActionItem[] = [
  { key: 'o', action: 'overview', label: 'Overview', description: 'View empire', color: 'gray' },
  { key: 'e', action: 'explore', label: 'Explore', description: 'Gain land', color: 'green' },
  { key: 'b', action: 'build', label: 'Build', description: 'Construct', color: 'blue' },
  { key: 'f', action: 'farm', label: 'Farm', description: 'Produce food', color: 'yellow' },
  { key: 'c', action: 'cash', label: 'Cash', description: 'Get income', color: 'yellow' },
  { key: 'i', action: 'industry', label: 'Industry', description: 'Make troops', color: 'cyan' },
  { key: 'm', action: 'meditate', label: 'Meditate', description: 'Get runes', color: 'magenta' },
];

// Right column actions
const RIGHT_ACTIONS: ActionItem[] = [
  { key: 'p', action: 'market', label: 'Market', description: 'Buy/sell', color: 'yellow' },
  { key: 'k', action: 'bank', label: 'Bank', description: 'Savings', color: 'green' },
  { key: 'a', action: 'attack', label: 'Attack', description: 'Attack enemy', color: 'red' },
  { key: 's', action: 'spell', label: 'Spell', description: 'Cast magic', color: 'magenta' },
  { key: 'v', action: 'bots', label: 'Enemies', description: 'See enemies', color: 'gray' },
  { key: 'x', action: 'end_phase', label: 'End Round', description: 'Skip turns', color: 'red' },
];

// Combined for hotkey lookup
const ALL_ACTIONS = [...LEFT_ACTIONS, ...RIGHT_ACTIONS];

interface Props {
  onSelect: (action: TurnAction | 'end_phase' | 'status' | 'overview' | 'bots' | 'market' | 'bank') => void;
  disabled?: boolean;
}

export function ActionMenu({ onSelect, disabled }: Props) {
  const [column, setColumn] = useState(0); // 0 = left, 1 = right
  const [leftIndex, setLeftIndex] = useState(0);
  const [rightIndex, setRightIndex] = useState(0);

  const currentActions = column === 0 ? LEFT_ACTIONS : RIGHT_ACTIONS;
  const currentIndex = column === 0 ? leftIndex : rightIndex;
  const setCurrentIndex = column === 0 ? setLeftIndex : setRightIndex;

  useInput((input, key) => {
    if (disabled) return;

    // Arrow navigation
    if (key.upArrow) {
      setCurrentIndex((i) => (i > 0 ? i - 1 : currentActions.length - 1));
    } else if (key.downArrow) {
      setCurrentIndex((i) => (i < currentActions.length - 1 ? i + 1 : 0));
    } else if (key.leftArrow) {
      setColumn(0);
    } else if (key.rightArrow) {
      setColumn(1);
    } else if (key.return) {
      onSelect(currentActions[currentIndex].action);
    } else {
      // Hotkey selection
      const action = ALL_ACTIONS.find((a) => a.key === input.toLowerCase());
      if (action) {
        onSelect(action.action);
      }
    }
  });

  const maxRows = Math.max(LEFT_ACTIONS.length, RIGHT_ACTIONS.length);

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="gray" paddingX={1}>
      <Text bold color="white">Actions</Text>
      <Box flexDirection="row" marginTop={1} gap={2}>
        {/* Left column */}
        <Box flexDirection="column">
          {LEFT_ACTIONS.map((item, index) => (
            <Box key={item.key}>
              <Text color={column === 0 && leftIndex === index ? 'cyan' : 'gray'}>
                {column === 0 && leftIndex === index ? '▶ ' : '  '}
              </Text>
              <Text color="yellow">[{item.key}]</Text>
              <Text> </Text>
              <Text color={item.color} bold={column === 0 && leftIndex === index}>
                {item.label.padEnd(8)}
              </Text>
            </Box>
          ))}
        </Box>
        {/* Right column */}
        <Box flexDirection="column">
          {RIGHT_ACTIONS.map((item, index) => (
            <Box key={item.key}>
              <Text color={column === 1 && rightIndex === index ? 'cyan' : 'gray'}>
                {column === 1 && rightIndex === index ? '▶ ' : '  '}
              </Text>
              <Text color="yellow">[{item.key}]</Text>
              <Text> </Text>
              <Text color={item.color} bold={column === 1 && rightIndex === index}>
                {item.label.padEnd(9)}
              </Text>
            </Box>
          ))}
          {/* Empty rows to match left column height */}
          {Array.from({ length: maxRows - RIGHT_ACTIONS.length }).map((_, i) => (
            <Box key={`empty-${i}`}>
              <Text> </Text>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
}
