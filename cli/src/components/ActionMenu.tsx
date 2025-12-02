import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import type { TurnAction } from '../api/client.js';

interface ActionItem {
  key: string;
  action: TurnAction | 'end_phase' | 'status' | 'overview' | 'bots' | 'market';
  label: string;
  description: string;
  color: string;
}

const ACTIONS: ActionItem[] = [
  { key: 'e', action: 'explore', label: 'Explore', description: 'Gain new land', color: 'green' },
  { key: 'f', action: 'farm', label: 'Farm', description: 'Produce food', color: 'yellow' },
  { key: 'c', action: 'cash', label: 'Cash', description: 'Generate income', color: 'yellow' },
  { key: 'm', action: 'meditate', label: 'Meditate', description: 'Generate runes', color: 'magenta' },
  { key: 'i', action: 'industry', label: 'Industry', description: 'Produce troops', color: 'cyan' },
  { key: 'b', action: 'build', label: 'Build', description: 'Construct buildings', color: 'blue' },
  { key: 'p', action: 'market', label: 'Market', description: 'Buy/sell troops & food', color: 'yellow' },
  { key: 'a', action: 'attack', label: 'Attack', description: 'Attack enemy', color: 'red' },
  { key: 's', action: 'spell', label: 'Spell', description: 'Cast magic', color: 'magenta' },
  { key: 'o', action: 'overview', label: 'Overview', description: 'View empire details', color: 'gray' },
  { key: 'v', action: 'bots', label: 'View Bots', description: 'See enemies', color: 'gray' },
  { key: 'x', action: 'end_phase', label: 'End Phase', description: 'Skip remaining turns', color: 'red' },
];

interface Props {
  onSelect: (action: TurnAction | 'end_phase' | 'status' | 'overview' | 'bots' | 'market') => void;
  disabled?: boolean;
}

export function ActionMenu({ onSelect, disabled }: Props) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  useInput((input, key) => {
    if (disabled) return;

    // Arrow navigation
    if (key.upArrow) {
      setSelectedIndex((i) => (i > 0 ? i - 1 : ACTIONS.length - 1));
    } else if (key.downArrow) {
      setSelectedIndex((i) => (i < ACTIONS.length - 1 ? i + 1 : 0));
    } else if (key.return) {
      onSelect(ACTIONS[selectedIndex].action);
    } else {
      // Hotkey selection
      const index = ACTIONS.findIndex((a) => a.key === input.toLowerCase());
      if (index !== -1) {
        onSelect(ACTIONS[index].action);
      }
    }
  });

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="gray" paddingX={1}>
      <Text bold color="white">Actions</Text>
      <Box flexDirection="column" marginTop={1}>
        {ACTIONS.map((item, index) => (
          <Box key={item.key}>
            <Text color={selectedIndex === index ? 'cyan' : 'gray'}>
              {selectedIndex === index ? '▶ ' : '  '}
            </Text>
            <Text color="yellow">[{item.key}]</Text>
            <Text> </Text>
            <Text color={item.color} bold={selectedIndex === index}>
              {item.label}
            </Text>
            <Text color="gray"> - {item.description}</Text>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
