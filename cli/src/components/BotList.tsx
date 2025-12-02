import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import type { BotSummary } from '../api/client.js';

interface Props {
  bots: BotSummary[];
  selectable?: boolean;
  onSelect?: (botId: string) => void;
  onClose?: () => void;
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

const raceIcons: Record<string, string> = {
  human: '👤',
  elf: '🧝',
  dwarf: '⛏️',
  orc: '👹',
  undead: '💀',
};

const eraColors: Record<string, string> = {
  past: 'magenta',
  present: 'cyan',
  future: 'green',
};

export function BotList({ bots, selectable, onSelect, onClose }: Props) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  useInput((input, key) => {
    if (key.escape && onClose) {
      onClose();
    } else if (selectable) {
      if (key.upArrow) {
        setSelectedIndex((i) => (i > 0 ? i - 1 : bots.length - 1));
      } else if (key.downArrow) {
        setSelectedIndex((i) => (i < bots.length - 1 ? i + 1 : 0));
      } else if (key.return && onSelect) {
        onSelect(bots[selectedIndex].id);
      }
    }
  });

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="red" paddingX={1}>
      <Text bold color="red">Enemy Empires</Text>
      <Box flexDirection="column" marginTop={1}>
        {bots.map((bot, index) => (
          <Box key={bot.id} gap={1}>
            {selectable && (
              <Text color={selectedIndex === index ? 'cyan' : 'gray'}>
                {selectedIndex === index ? '▶' : ' '}
              </Text>
            )}
            <Text>{raceIcons[bot.race] || '?'}</Text>
            <Text bold color={selectedIndex === index && selectable ? 'white' : 'gray'}>
              {bot.name}
            </Text>
            <Text color={eraColors[bot.era]}>[{bot.era}]</Text>
            <Text color="yellow">NW: {formatNumber(bot.networth)}</Text>
            <Text color="cyan">Land: {formatNumber(bot.land)}</Text>
          </Box>
        ))}
      </Box>
      <Box marginTop={1}>
        <Text color="gray">
          {selectable ? '[Enter] select target • [Esc] cancel' : '[Esc] close'}
        </Text>
      </Box>
    </Box>
  );
}
