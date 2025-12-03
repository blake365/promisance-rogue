import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import type { BotSummary, SpyIntel, Era } from '../api/client.js';

interface Props {
  bots: BotSummary[];
  intel?: Record<string, SpyIntel>;
  currentRound?: number;
  selectable?: boolean;
  playerEra?: Era;
  hasActiveGate?: boolean;
  onSelect?: (botId: string) => void;
  onClose?: () => void;
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

const eraColors: Record<string, string> = {
  past: 'magenta',
  present: 'cyan',
  future: 'green',
};

export function BotList({ bots, intel = {}, currentRound = 1, selectable, playerEra, hasActiveGate, onSelect, onClose }: Props) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [viewingIntel, setViewingIntel] = useState<string | null>(null);

  // Check if a bot can be attacked (same era or have gate)
  const canAttackBot = (bot: BotSummary): boolean => {
    if (!playerEra) return true; // If no player era provided, allow all
    if (bot.era === playerEra) return true;
    if (hasActiveGate) return true;
    return false;
  };

  useInput((input, key) => {
    if (viewingIntel) {
      // Any key closes intel view
      if (key.escape || key.return || input) {
        setViewingIntel(null);
      }
      return;
    }

    if (key.escape && onClose) {
      onClose();
    } else if (selectable) {
      if (key.upArrow || input === 'k') {
        setSelectedIndex((i) => (i > 0 ? i - 1 : bots.length - 1));
      } else if (key.downArrow || input === 'j') {
        setSelectedIndex((i) => (i < bots.length - 1 ? i + 1 : 0));
      } else if (key.return && onSelect) {
        const selectedBot = bots[selectedIndex];
        // Only allow selection if era matches or has gate
        if (canAttackBot(selectedBot)) {
          onSelect(selectedBot.id);
        }
      } else if (input === 'i' || input === 'I') {
        // View intel for selected bot if available
        const selectedBot = bots[selectedIndex];
        if (intel[selectedBot.id]) {
          setViewingIntel(selectedBot.id);
        }
      }
    } else {
      // Non-selectable mode - use up/down to browse, 'i' to view intel
      if (key.upArrow || input === 'k') {
        setSelectedIndex((i) => (i > 0 ? i - 1 : bots.length - 1));
      } else if (key.downArrow || input === 'j') {
        setSelectedIndex((i) => (i < bots.length - 1 ? i + 1 : 0));
      } else if (input === 'i' || input === 'I') {
        const selectedBot = bots[selectedIndex];
        if (intel[selectedBot.id]) {
          setViewingIntel(selectedBot.id);
        }
      }
    }
  });

  // Intel detail view
  if (viewingIntel && intel[viewingIntel]) {
    const botIntel = intel[viewingIntel];
    const isStale = botIntel.round < currentRound;
    const roundsOld = currentRound - botIntel.round;

    return (
      <Box flexDirection="column" borderStyle="round" borderColor="magenta" paddingX={1}>
        <Text bold color="magenta">
          Intel: {botIntel.targetName} {isStale && <Text color="yellow">(Round {botIntel.round} - {roundsOld} round{roundsOld > 1 ? 's' : ''} old)</Text>}
        </Text>

        <Box marginTop={1} flexDirection="column">
          <Box gap={2}>
            <Box flexDirection="column" width={24}>
              <Text color="cyan">Era: <Text color="white">{botIntel.era}</Text></Text>
              <Text color="cyan">Race: <Text color="white">{botIntel.race}</Text></Text>
              <Text color="cyan">Health: <Text color={botIntel.health < 50 ? 'red' : botIntel.health < 80 ? 'yellow' : 'green'}>{botIntel.health}%</Text></Text>
              <Text color="cyan">Tax Rate: <Text color="white">{botIntel.taxRate}%</Text></Text>
            </Box>
            <Box flexDirection="column" width={24}>
              <Text color="yellow">Land: <Text color="white">{formatNumber(botIntel.land)}</Text></Text>
              <Text color="yellow">Networth: <Text color="white">{formatNumber(botIntel.networth)}</Text></Text>
              <Text color="yellow">Peasants: <Text color="white">{formatNumber(botIntel.peasants)}</Text></Text>
            </Box>
          </Box>

          <Box marginTop={1} flexDirection="column">
            <Text bold color="green">Resources</Text>
            <Box gap={2}>
              <Text>Gold: <Text color="yellow">{formatNumber(botIntel.gold)}</Text></Text>
              <Text>Food: <Text color="green">{formatNumber(botIntel.food)}</Text></Text>
              <Text>Runes: <Text color="magenta">{formatNumber(botIntel.runes)}</Text></Text>
            </Box>
          </Box>

          <Box marginTop={1} flexDirection="column">
            <Text bold color="red">Military</Text>
            <Box gap={2} flexWrap="wrap">
              <Text>Soldiers: <Text color="white">{formatNumber(botIntel.troops.trparm)}</Text></Text>
              <Text>Tanks: <Text color="white">{formatNumber(botIntel.troops.trplnd)}</Text></Text>
              <Text>Jets: <Text color="white">{formatNumber(botIntel.troops.trpfly)}</Text></Text>
              <Text>Ships: <Text color="white">{formatNumber(botIntel.troops.trpsea)}</Text></Text>
              <Text>Wizards: <Text color="magenta">{formatNumber(botIntel.troops.trpwiz)}</Text></Text>
            </Box>
          </Box>
        </Box>

        <Box marginTop={1}>
          <Text color="gray">[Any key] back to list</Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="red" paddingX={1}>
      <Text bold color="red">Enemy Empires</Text>
      <Box flexDirection="column" marginTop={1}>
        {bots.map((bot, index) => {
          const hasIntel = !!intel[bot.id];
          const botIntel = intel[bot.id];
          const isStale = botIntel && botIntel.round < currentRound;
          const isSelected = selectedIndex === index;
          const needsGate = selectable && playerEra && bot.era !== playerEra && !hasActiveGate;

          return (
            <Box key={bot.id} gap={1}>
              <Text color={isSelected ? 'cyan' : 'gray'}>
                {isSelected ? '▶' : ' '}
              </Text>
              <Text bold color={needsGate ? 'gray' : isSelected ? 'white' : 'gray'}>
                {bot.name}
              </Text>
              <Text color={needsGate ? 'gray' : 'cyan'}>Land: {formatNumber(bot.land)}</Text>
              <Text color={needsGate ? 'gray' : 'yellow'}>NW: {formatNumber(bot.networth)}</Text>
              <Text color="gray">
                {bot.race.charAt(0).toUpperCase() + bot.race.slice(1)}
              </Text>
              <Text color={eraColors[bot.era]}>[{bot.era}]</Text>
              {needsGate && (
                <Text color="red">[need Gate]</Text>
              )}
              {hasIntel && (
                <Text color={isStale ? 'yellow' : 'magenta'}>
                  {isStale ? '[intel:old]' : '[intel]'}
                </Text>
              )}
            </Box>
          );
        })}
      </Box>
      <Box marginTop={1}>
        <Text color="gray">
          {selectable
            ? '[↑↓/jk] select • [Enter] confirm • [i] view intel • [Esc] cancel'
            : '[↑↓/jk] browse • [i] view intel • [Esc] close'}
        </Text>
      </Box>
    </Box>
  );
}
