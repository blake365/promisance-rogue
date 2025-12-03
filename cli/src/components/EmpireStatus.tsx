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

// Rarity colors for advisors
const RARITY_COLORS: Record<string, string> = {
  common: 'white',
  uncommon: 'green',
  rare: 'blue',
  legendary: 'yellow',
};

// Mastery display names (abbreviated for compact display)
const MASTERY_ABBREV: Record<string, string> = {
  farm: 'Farm',
  cash: 'Cash',
  explore: 'Expl',
  industry: 'Ind',
  meditate: 'Myst',
};

// Roman numerals for mastery levels
const ROMAN_NUMERALS = ['I', 'II', 'III', 'IV', 'V'];

export function EmpireStatus({ empire, round }: Props) {
  const eraColors: Record<string, string> = {
    past: 'magenta',
    present: 'cyan',
    future: 'green',
  };

  // Capitalize race name
  const raceName = empire.race.charAt(0).toUpperCase() + empire.race.slice(1);

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="cyan" paddingX={1}>
      {/* Header */}
      <Box justifyContent="space-between">
        <Box gap={1}>
          <Text bold color="yellow">{empire.name}</Text>
          <Text color="gray">-</Text>
          <Text color="white">{raceName}</Text>
        </Box>
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

      {/* Networth */}
      <Box marginTop={1}>
        <Text color="gray">Networth: </Text>
        <Text bold color="yellow">{formatNumber(empire.networth)}</Text>
      </Box>

      {/* Advisors */}
      {empire.advisors.length > 0 && (
        <Box gap={1}>
          <Text color="gray">Advisors:</Text>
          {empire.advisors.map((advisor, idx) => (
            <React.Fragment key={advisor.id}>
              <Text color={RARITY_COLORS[advisor.rarity] || 'white'}>{advisor.name}</Text>
              {idx < empire.advisors.length - 1 && <Text color="gray">,</Text>}
            </React.Fragment>
          ))}
        </Box>
      )}

      {/* Masteries */}
      {Object.keys(empire.techs).length > 0 && (
        <Box gap={1}>
          <Text color="gray">Masteries:</Text>
          {Object.entries(empire.techs).map(([action, level], idx, arr) => (
            <React.Fragment key={action}>
              <Text color="cyan">
                {MASTERY_ABBREV[action] || action} {ROMAN_NUMERALS[level - 1] || level}
              </Text>
              {idx < arr.length - 1 && <Text color="gray">,</Text>}
            </React.Fragment>
          ))}
        </Box>
      )}

      {/* Active Effects */}
      {(() => {
        const effects: Array<{ name: string; color: string; expires?: number }> = [];

        if (empire.shieldExpiresRound !== null && empire.shieldExpiresRound >= round.number) {
          effects.push({ name: '🛡️ Shield', color: 'blue', expires: empire.shieldExpiresRound });
        }
        if (empire.gateExpiresRound !== null && empire.gateExpiresRound >= round.number) {
          effects.push({ name: '🌀 Gate', color: 'magenta', expires: empire.gateExpiresRound });
        }
        if (empire.pacificationExpiresRound !== null && empire.pacificationExpiresRound >= round.number) {
          effects.push({ name: '🕊️ Pacification', color: 'green', expires: empire.pacificationExpiresRound });
        }
        if (empire.divineProtectionExpiresRound !== null && empire.divineProtectionExpiresRound >= round.number) {
          effects.push({ name: '✨ Divine Protection', color: 'yellow', expires: empire.divineProtectionExpiresRound });
        }
        if (empire.bonusTurnsNextRound > 0) {
          effects.push({ name: `⏰ +${empire.bonusTurnsNextRound} turns next round`, color: 'cyan' });
        }

        if (effects.length === 0) return null;

        return (
          <Box gap={1}>
            <Text color="gray">Effects:</Text>
            {effects.map((eff, idx) => (
              <React.Fragment key={eff.name}>
                <Text color={eff.color}>
                  {eff.name}{eff.expires !== undefined ? ` (R${eff.expires})` : ''}
                </Text>
                {idx < effects.length - 1 && <Text color="gray">,</Text>}
              </React.Fragment>
            ))}
          </Box>
        );
      })()}

      {/* Policies */}
      {empire.policies.length > 0 && (
        <Box gap={1}>
          <Text color="gray">Policies:</Text>
          {empire.policies.map((policy, idx) => (
            <React.Fragment key={policy}>
              <Text color="magenta">{policy.replace(/_/g, ' ')}</Text>
              {idx < empire.policies.length - 1 && <Text color="gray">,</Text>}
            </React.Fragment>
          ))}
        </Box>
      )}
    </Box>
  );
}
