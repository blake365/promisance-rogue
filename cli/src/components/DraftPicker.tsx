import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import type { DraftOption } from '../api/client.js';

interface Props {
  options: DraftOption[];
  onSelect: (index: number) => void;
  onSkip: () => void;
  onMarket?: () => void;
}

const rarityColors: Record<string, string> = {
  common: 'white',
  uncommon: 'green',
  rare: 'blue',
  legendary: 'yellow',
};

const typeIcons: Record<string, string> = {
  advisor: '👤',
  tech: '🔬',
  edict: '📜',
  policy: '📋',
};

export function DraftPicker({ options, onSelect, onSkip, onMarket }: Props) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  useInput((input, key) => {
    if (key.leftArrow) {
      setSelectedIndex((i) => (i > 0 ? i - 1 : options.length - 1));
    } else if (key.rightArrow) {
      setSelectedIndex((i) => (i < options.length - 1 ? i + 1 : 0));
    } else if (key.return) {
      onSelect(selectedIndex);
    } else if (key.escape) {
      onSkip();
    } else if ((input === 'p' || input === 'm') && onMarket) {
      onMarket();
    } else if (input === '1' && options.length >= 1) {
      onSelect(0);
    } else if (input === '2' && options.length >= 2) {
      onSelect(1);
    } else if (input === '3' && options.length >= 3) {
      onSelect(2);
    }
  });

  const getItemDetails = (option: DraftOption) => {
    const item = option.item as any;
    return {
      name: item.name,
      description: item.description || `Level ${item.level || 1} ${option.type}`,
      rarity: item.rarity || 'common',
    };
  };

  return (
    <Box flexDirection="column" borderStyle="double" borderColor="yellow" paddingX={1}>
      <Box justifyContent="center">
        <Text bold color="yellow">✨ DRAFT - Choose Your Bonus ✨</Text>
      </Box>

      <Box marginTop={1} justifyContent="center" gap={2}>
        {options.map((option, index) => {
          const details = getItemDetails(option);
          const isSelected = index === selectedIndex;

          return (
            <Box
              key={index}
              flexDirection="column"
              borderStyle={isSelected ? 'bold' : 'single'}
              borderColor={isSelected ? 'cyan' : 'gray'}
              paddingX={1}
              paddingY={0}
              width={24}
            >
              {/* Type and number */}
              <Box justifyContent="space-between">
                <Text color="gray">[{index + 1}]</Text>
                <Text>{typeIcons[option.type]} {option.type}</Text>
              </Box>

              {/* Name */}
              <Box justifyContent="center" marginTop={1}>
                <Text bold color={rarityColors[details.rarity]}>
                  {details.name}
                </Text>
              </Box>

              {/* Rarity */}
              <Box justifyContent="center">
                <Text color={rarityColors[details.rarity]} dimColor>
                  [{details.rarity}]
                </Text>
              </Box>

              {/* Description */}
              <Box marginTop={1}>
                <Text color="gray" wrap="wrap">
                  {details.description}
                </Text>
              </Box>

              {/* Selection indicator */}
              {isSelected && (
                <Box justifyContent="center" marginTop={1}>
                  <Text color="cyan">▲ SELECTED ▲</Text>
                </Box>
              )}
            </Box>
          );
        })}
      </Box>

      <Box marginTop={1} justifyContent="center">
        <Text color="gray">
          ←→ navigate • [1-3] quick select • [Enter] confirm • [p] market • [Esc] skip
        </Text>
      </Box>
    </Box>
  );
}
