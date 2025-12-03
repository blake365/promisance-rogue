import React from 'react';
import { Box, Text } from 'ink';
import type { GameStats, Empire, Troops } from '../api/client.js';

interface Props {
  stats: GameStats;
  empire: Empire;
}

// Helper to format large numbers
function formatNumber(n: number): string {
  if (n >= 1_000_000_000) {
    return `${(n / 1_000_000_000).toFixed(1)}B`;
  }
  if (n >= 1_000_000) {
    return `${(n / 1_000_000).toFixed(1)}M`;
  }
  if (n >= 1_000) {
    return `${(n / 1_000).toFixed(1)}K`;
  }
  return n.toLocaleString();
}

// Get troop name by era
function getTroopNames(era: string): { trparm: string; trplnd: string; trpfly: string; trpsea: string; trpwiz: string } {
  switch (era) {
    case 'past':
      return { trparm: 'Footmen', trplnd: 'Catapults', trpfly: 'Zeppelins', trpsea: 'Galleons', trpwiz: 'Wizards' };
    case 'present':
      return { trparm: 'Troops', trplnd: 'Turrets', trpfly: 'Jets', trpsea: 'Carriers', trpwiz: 'Wizards' };
    case 'future':
      return { trparm: 'Troopers', trplnd: 'Tanks', trpfly: 'Fighters', trpsea: 'Destroyers', trpwiz: 'Wizards' };
    default:
      return { trparm: 'Infantry', trplnd: 'Vehicles', trpfly: 'Aircraft', trpsea: 'Navy', trpwiz: 'Wizards' };
  }
}

export function GameSummary({ stats, empire }: Props) {
  const troopNames = getTroopNames(empire.era);

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="cyan" paddingX={2} paddingY={1}>
      <Text bold color="cyan">Game Summary</Text>

      {/* Production Stats */}
      <Box marginTop={1} flexDirection="column">
        <Text bold color="yellow">Production Totals</Text>
        <Box>
          <Box width={22}><Text>Income:</Text></Box>
          <Text color="green">${formatNumber(stats.totalIncome)}</Text>
        </Box>
        <Box>
          <Box width={22}><Text>Expenses:</Text></Box>
          <Text color="red">${formatNumber(stats.totalExpenses)}</Text>
        </Box>
        <Box>
          <Box width={22}><Text>Food Production:</Text></Box>
          <Text color="green">{formatNumber(stats.totalFoodProduction)}</Text>
        </Box>
        <Box>
          <Box width={22}><Text>Food Consumption:</Text></Box>
          <Text color="red">{formatNumber(stats.totalFoodConsumption)}</Text>
        </Box>
        <Box>
          <Box width={22}><Text>Rune Production:</Text></Box>
          <Text color="magenta">{formatNumber(stats.totalRuneProduction)}</Text>
        </Box>
        <Box>
          <Box width={22}><Text>Networth/Turn:</Text></Box>
          <Text color="cyan">${formatNumber(stats.networthPerTurn)}</Text>
        </Box>
      </Box>

      {/* Combat Stats */}
      <Box marginTop={1} flexDirection="column">
        <Text bold color="red">Combat Stats</Text>
        <Box>
          <Box width={22}><Text>Total Attacks:</Text></Box>
          <Text>{stats.totalAttacks}</Text>
          {stats.totalAttacks > 0 && (
            <Text color="gray"> ({Math.round(stats.totalAttackWins / stats.totalAttacks * 100)}% win rate)</Text>
          )}
        </Box>
        <Box>
          <Box width={22}><Text>Land Gained:</Text></Box>
          <Text color="green">{formatNumber(stats.totalLandGained)} acres</Text>
        </Box>
        <Box>
          <Box width={22}><Text>Land Lost:</Text></Box>
          <Text color="red">{formatNumber(stats.totalLandLost)} acres</Text>
        </Box>
        <Box>
          <Box width={22}><Text>Empires Killed:</Text></Box>
          <Text color="red">{stats.totalKills}</Text>
        </Box>
      </Box>

      {/* Spell Stats */}
      <Box marginTop={1} flexDirection="column">
        <Text bold color="magenta">Spell Stats</Text>
        <Box>
          <Box width={22}><Text>Total Spells Cast:</Text></Box>
          <Text>{stats.totalSpellsCast}</Text>
        </Box>
        <Box>
          <Box width={22}><Text>Offensive Spells:</Text></Box>
          <Text color="red">{stats.totalOffensiveSpells}</Text>
        </Box>
      </Box>

      {/* Final Army */}
      <Box marginTop={1} flexDirection="column">
        <Text bold color="blue">Final Army</Text>
        <Box>
          <Box width={22}><Text>Final {troopNames.trparm}:</Text></Box>
          <Text>{formatNumber(empire.troops.trparm)}</Text>
        </Box>
        <Box>
          <Box width={22}><Text>Final {troopNames.trplnd}:</Text></Box>
          <Text>{formatNumber(empire.troops.trplnd)}</Text>
        </Box>
        <Box>
          <Box width={22}><Text>Final {troopNames.trpfly}:</Text></Box>
          <Text>{formatNumber(empire.troops.trpfly)}</Text>
        </Box>
        <Box>
          <Box width={22}><Text>Final {troopNames.trpsea}:</Text></Box>
          <Text>{formatNumber(empire.troops.trpsea)}</Text>
        </Box>
        <Box>
          <Box width={22}><Text>Final {troopNames.trpwiz}:</Text></Box>
          <Text>{formatNumber(empire.troops.trpwiz)}</Text>
        </Box>
      </Box>

      {/* Peak Values */}
      <Box marginTop={1} flexDirection="column">
        <Text bold color="green">Peak Values</Text>
        <Box>
          <Box width={22}><Text>Peak Gold:</Text></Box>
          <Text color="yellow">${formatNumber(stats.peakGold)}</Text>
        </Box>
        <Box>
          <Box width={22}><Text>Peak Grains:</Text></Box>
          <Text>{formatNumber(stats.peakFood)}</Text>
        </Box>
        <Box>
          <Box width={22}><Text>Peak Mana:</Text></Box>
          <Text color="magenta">{formatNumber(stats.peakRunes)}</Text>
        </Box>
        <Box>
          <Box width={22}><Text>Peak Land:</Text></Box>
          <Text>{formatNumber(stats.peakLand)} acres</Text>
        </Box>
        <Box>
          <Box width={22}><Text>Peak Networth:</Text></Box>
          <Text color="yellow">${formatNumber(stats.peakNetworth)}</Text>
        </Box>
        <Box>
          <Box width={22}><Text>Peak Peasants:</Text></Box>
          <Text>{formatNumber(stats.peakPeasants)}</Text>
        </Box>
        <Box>
          <Box width={22}><Text>Peak {troopNames.trparm}:</Text></Box>
          <Text>{formatNumber(stats.peakTrparm)}</Text>
        </Box>
        <Box>
          <Box width={22}><Text>Peak {troopNames.trplnd}:</Text></Box>
          <Text>{formatNumber(stats.peakTrplnd)}</Text>
        </Box>
        <Box>
          <Box width={22}><Text>Peak {troopNames.trpfly}:</Text></Box>
          <Text>{formatNumber(stats.peakTrpfly)}</Text>
        </Box>
        <Box>
          <Box width={22}><Text>Peak {troopNames.trpsea}:</Text></Box>
          <Text>{formatNumber(stats.peakTrpsea)}</Text>
        </Box>
        <Box>
          <Box width={22}><Text>Peak {troopNames.trpwiz}:</Text></Box>
          <Text>{formatNumber(stats.peakTrpwiz)}</Text>
        </Box>
      </Box>

      <Box marginTop={1}>
        <Text color="gray">Turns Played: {stats.turnsPlayed}</Text>
      </Box>
    </Box>
  );
}
