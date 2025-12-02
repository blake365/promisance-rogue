import React from 'react';
import { Box, Text, useInput } from 'ink';
import type { Empire } from '../api/client.js';

interface Props {
  empire: Empire;
  onClose: () => void;
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

export function MilitaryStatus({ empire, onClose }: Props) {
  useInput((_, key) => {
    if (key.escape) {
      onClose();
    }
  });

  const troops = [
    { name: 'Infantry', key: 'trparm', icon: '⚔️', count: empire.troops.trparm },
    { name: 'Vehicles', key: 'trplnd', icon: '🚗', count: empire.troops.trplnd },
    { name: 'Aircraft', key: 'trpfly', icon: '✈️', count: empire.troops.trpfly },
    { name: 'Navy', key: 'trpsea', icon: '🚢', count: empire.troops.trpsea },
    { name: 'Wizards', key: 'trpwiz', icon: '🧙', count: empire.troops.trpwiz },
  ];

  const buildings = [
    { name: 'Markets', key: 'bldcash', icon: '🏪', count: empire.buildings.bldcash },
    { name: 'Barracks', key: 'bldtrp', icon: '🏰', count: empire.buildings.bldtrp },
    { name: 'Exchanges', key: 'bldcost', icon: '🏛️', count: empire.buildings.bldcost },
    { name: 'Farms', key: 'bldfood', icon: '🌾', count: empire.buildings.bldfood },
    { name: 'Towers', key: 'bldwiz', icon: '🗼', count: empire.buildings.bldwiz },
  ];

  const totalBuildings = Object.values(empire.buildings).reduce((a: number, b: number) => a + b, 0);
  const usedLand = empire.resources.land - empire.resources.freeland;

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="cyan" paddingX={1}>
      <Text bold color="cyan">Military & Buildings</Text>

      {/* Troops */}
      <Box marginTop={1} flexDirection="column">
        <Text bold color="red">Troops</Text>
        <Box flexDirection="column">
          {troops.map((t) => (
            <Box key={t.key} gap={1}>
              <Text>{t.icon}</Text>
              <Text color="gray">{t.name.padEnd(10)}</Text>
              <Text color="white">{formatNumber(t.count)}</Text>
            </Box>
          ))}
        </Box>
      </Box>

      {/* Buildings */}
      <Box marginTop={1} flexDirection="column">
        <Text bold color="blue">Buildings</Text>
        <Box flexDirection="column">
          {buildings.map((b) => (
            <Box key={b.key} gap={1}>
              <Text>{b.icon}</Text>
              <Text color="gray">{b.name.padEnd(10)}</Text>
              <Text color="white">{formatNumber(b.count)}</Text>
            </Box>
          ))}
        </Box>
        <Box marginTop={1}>
          <Text color="gray">
            Total: {formatNumber(totalBuildings)} / {formatNumber(usedLand)} used land
          </Text>
        </Box>
      </Box>

      {/* Combat Stats */}
      <Box marginTop={1} flexDirection="column">
        <Text bold color="yellow">Combat Record</Text>
        <Text color="gray">
          Attacks: {empire.offSucc}/{empire.offTotal} •
          Defenses: {empire.defSucc}/{empire.defTotal} •
          Kills: {empire.kills}
        </Text>
      </Box>

      {/* Effects */}
      {(empire.shieldExpiresRound || empire.gateExpiresRound) && (
        <Box marginTop={1} flexDirection="column">
          <Text bold color="magenta">Active Effects</Text>
          {empire.shieldExpiresRound && <Text color="cyan">Shield Active (this round)</Text>}
          {empire.gateExpiresRound && <Text color="magenta">Gate Active (this round)</Text>}
        </Box>
      )}

      <Box marginTop={1}>
        <Text color="gray">[Esc] close</Text>
      </Box>
    </Box>
  );
}
