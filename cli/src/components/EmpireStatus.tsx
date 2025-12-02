import React from 'react';
import { Box, Text } from 'ink';
import type { Empire, GameRound } from '../api/client.js';

interface Props {
  empire: Empire;
  round: GameRound;
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function ResourceBar({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <Box>
      <Text color="gray">{label}: </Text>
      <Text color={color}>{value}</Text>
    </Box>
  );
}

// Compact bonus indicator
function BonusIndicators({ empire }: { empire: Empire }) {
  const advisorCount = empire.advisors.length;
  const techCount = Object.keys(empire.techs).length;
  const policyCount = empire.policies.length;

  // Check for permanent effects from advisors/policies
  const hasPermanentGate = empire.advisors.some(a => a.effect.type === 'permanent_gate');
  const hasPermanentShield = empire.policies.includes('magical_immunity');

  if (advisorCount === 0 && techCount === 0 && policyCount === 0) {
    return null;
  }

  return (
    <Box gap={1}>
      {advisorCount > 0 && (
        <Text color="magenta">[A:{advisorCount}]</Text>
      )}
      {techCount > 0 && (
        <Text color="cyan">[T:{techCount}]</Text>
      )}
      {policyCount > 0 && (
        <Text color="green">[P:{policyCount}]</Text>
      )}
      {hasPermanentGate && (
        <Text color="magenta">GATE</Text>
      )}
      {hasPermanentShield && (
        <Text color="cyan">SHIELD</Text>
      )}
    </Box>
  );
}

export function EmpireStatus({ empire, round }: Props) {
  const eraColors: Record<string, string> = {
    past: 'magenta',
    present: 'cyan',
    future: 'green',
  };

  const raceIcons: Record<string, string> = {
    human: '👤',
    elf: '🧝',
    dwarf: '⛏️',
    orc: '👹',
    undead: '💀',
  };

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="cyan" paddingX={1}>
      {/* Header */}
      <Box justifyContent="space-between">
        <Text bold color="yellow">
          {empire.name} {raceIcons[empire.race] || ''}
        </Text>
        <Text color={eraColors[empire.era]}>
          [{empire.era.toUpperCase()}]
        </Text>
      </Box>

      {/* Round info */}
      <Box marginTop={1}>
        <Text color="gray">Round </Text>
        <Text bold>{round.number}/10</Text>
        <Text color="gray"> • Turns: </Text>
        <Text bold color={round.turnsRemaining > 10 ? 'green' : 'red'}>
          {round.turnsRemaining}
        </Text>
        <Text color="gray"> • Phase: </Text>
        <Text color="cyan">{round.phase}</Text>
      </Box>

      {/* Resources */}
      <Box marginTop={1} gap={2}>
        <ResourceBar label="💰 Gold" value={formatNumber(empire.resources.gold)} color="yellow" />
        <ResourceBar label="🌾 Food" value={formatNumber(empire.resources.food)} color="green" />
        <ResourceBar label="✨ Runes" value={formatNumber(empire.resources.runes)} color="magenta" />
      </Box>

      {/* Land */}
      <Box gap={2}>
        <ResourceBar label="🏰 Land" value={formatNumber(empire.resources.land)} color="cyan" />
        <ResourceBar label="🌲 Free" value={formatNumber(empire.resources.freeland)} color="gray" />
        <ResourceBar label="👥 Pop" value={formatNumber(empire.peasants)} color="white" />
      </Box>

      {/* Economy */}
      <Box gap={2}>
        <ResourceBar label="🏦 Bank" value={formatNumber(empire.bank)} color="green" />
        <ResourceBar label="💳 Loan" value={formatNumber(empire.loan)} color="red" />
        <ResourceBar label="❤️ Health" value={`${empire.health}%`} color={empire.health > 50 ? 'green' : 'red'} />
      </Box>

      {/* Networth and Bonuses */}
      <Box marginTop={1} justifyContent="space-between">
        <Box>
          <Text color="gray">Networth: </Text>
          <Text bold color="yellow">{formatNumber(empire.networth)}</Text>
        </Box>
        <BonusIndicators empire={empire} />
      </Box>
    </Box>
  );
}
