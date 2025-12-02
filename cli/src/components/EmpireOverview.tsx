import React from 'react';
import { Box, Text, useInput } from 'ink';
import type { Empire, GameRound, BonusRarity } from '../api/client.js';

interface Props {
  empire: Empire;
  round: GameRound;
  onClose: () => void;
}

function formatNumber(n: number): string {
  return n.toLocaleString();
}

function formatPercent(part: number, total: number): string {
  if (total === 0) return '0%';
  return `${Math.round((part / total) * 100)}%`;
}

// Rarity colors
const RARITY_COLORS: Record<BonusRarity, string> = {
  common: 'white',
  uncommon: 'green',
  rare: 'blue',
  legendary: 'yellow',
};

// Tech display names
const TECH_NAMES: Record<string, string> = {
  farm: 'Farming',
  cash: 'Commerce',
  explore: 'Exploration',
  industry: 'Industry',
  meditate: 'Mysticism',
};

// Policy display info
const POLICY_INFO: Record<string, { name: string; description: string; rarity: BonusRarity }> = {
  forced_march: { name: 'Forced March', description: 'Attack twice/round', rarity: 'rare' },
  war_economy: { name: 'War Economy', description: 'Troops while farming', rarity: 'rare' },
  open_borders: { name: 'Open Borders', description: '2x explore land', rarity: 'uncommon' },
  bank_charter: { name: 'Bank Charter', description: '2x bank interest', rarity: 'uncommon' },
  magical_immunity: { name: 'Magical Immunity', description: 'Permanent shield', rarity: 'legendary' },
};

// Section header component
function SectionHeader({ title, color }: { title: string; color: string }) {
  return (
    <Box justifyContent="center" marginBottom={0}>
      <Text bold color={color}>{title}</Text>
    </Box>
  );
}

// Row component for consistent formatting
function Row({ label, value, valueColor = 'white' }: { label: string; value: string | number; valueColor?: string }) {
  const displayValue = typeof value === 'number' ? formatNumber(value) : value;
  return (
    <Box justifyContent="space-between" width={24}>
      <Text color="gray">{label}</Text>
      <Text color={valueColor}>{displayValue}</Text>
    </Box>
  );
}

export function EmpireOverview({ empire, round, onClose }: Props) {
  useInput((_, key) => {
    if (key.escape) {
      onClose();
    }
  });

  // Calculate estimates (per-turn values)
  const totalBuildings = Object.values(empire.buildings).reduce((a: number, b: number) => a + b, 0);
  const usedLand = empire.resources.land - empire.resources.freeland;

  // Food estimates
  const foodProduction = empire.buildings.bldfood * 50; // Farms produce ~50 food each
  const foodConsumption = Math.round(empire.peasants * 0.1 +
    (empire.troops.trparm + empire.troops.trplnd + empire.troops.trpfly + empire.troops.trpsea) * 0.2);
  const foodNet = foodProduction - foodConsumption;

  // Income estimates
  const marketIncome = empire.buildings.bldcash * 100; // Markets produce ~100 gold each
  const taxIncome = Math.round(empire.peasants * (empire.taxRate / 100) * 0.5);
  const estIncome = marketIncome + taxIncome;

  // Expense estimates
  const troopExpenses = Math.round(
    (empire.troops.trparm * 0.5 + empire.troops.trplnd * 1 +
     empire.troops.trpfly * 1.5 + empire.troops.trpsea * 2) * 0.1
  );
  const estExpenses = troopExpenses;
  const financeNet = estIncome - estExpenses;

  // Military power calculations
  const offensivePower =
    empire.troops.trparm * 1 +
    empire.troops.trplnd * 2 +
    empire.troops.trpfly * 3 +
    empire.troops.trpsea * 4;

  const defensivePower =
    empire.troops.trparm * 1 +
    empire.troops.trplnd * 2 +
    empire.troops.trpfly * 2 +
    empire.troops.trpsea * 3 +
    empire.buildings.blddef * 50;

  // Combat success rates
  const offSuccessRate = empire.offTotal > 0
    ? Math.round((empire.offSucc / empire.offTotal) * 100)
    : 0;
  const defSuccessRate = empire.defTotal > 0
    ? Math.round((empire.defSucc / empire.defTotal) * 100)
    : 0;

  const eraColors: Record<string, string> = {
    past: 'magenta',
    present: 'cyan',
    future: 'green',
  };

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="cyan" paddingX={1}>
      {/* Title */}
      <Box justifyContent="center" marginBottom={1}>
        <Text bold color="yellow">{empire.name}</Text>
      </Box>

      {/* Top row: Empire, Agriculture, Combat Stats */}
      <Box gap={2}>
        {/* Empire Section */}
        <Box flexDirection="column" borderStyle="single" borderColor="yellow" paddingX={1}>
          <SectionHeader title="Empire" color="yellow" />
          <Row label="Turns" value={round.turnsRemaining} valueColor={round.turnsRemaining > 10 ? 'green' : 'red'} />
          <Row label="Health" value={`${empire.health}%`} valueColor={empire.health > 50 ? 'green' : 'red'} />
          <Row label="Net Worth" value={`$${formatNumber(empire.networth)}`} valueColor="yellow" />
          <Row label="Population" value={empire.peasants} />
          <Row label="Race" value={empire.race.charAt(0).toUpperCase() + empire.race.slice(1)} />
          <Row label="Era" value={empire.era.charAt(0).toUpperCase() + empire.era.slice(1)} valueColor={eraColors[empire.era]} />
        </Box>

        {/* Agriculture Section */}
        <Box flexDirection="column" borderStyle="single" borderColor="green" paddingX={1}>
          <SectionHeader title="Agriculture" color="green" />
          <Row label="Food" value={empire.resources.food} valueColor="green" />
          <Row label="Est. Production" value={foodProduction} valueColor="green" />
          <Row label="Est. Consumption" value={foodConsumption} valueColor="red" />
          <Row
            label="Net"
            value={foodNet >= 0 ? `+${formatNumber(foodNet)}` : formatNumber(foodNet)}
            valueColor={foodNet >= 0 ? 'green' : 'red'}
          />
        </Box>

        {/* Combat Stats Section */}
        <Box flexDirection="column" borderStyle="single" borderColor="red" paddingX={1}>
          <SectionHeader title="Combat Stats" color="red" />
          <Row
            label="Offensive"
            value={`${empire.offSucc}/${empire.offTotal} (${offSuccessRate}%)`}
            valueColor="cyan"
          />
          <Row
            label="Defenses"
            value={`${empire.defSucc}/${empire.defTotal} (${defSuccessRate}%)`}
            valueColor="cyan"
          />
          <Row label="Kills" value={empire.kills} valueColor="red" />
        </Box>
      </Box>

      {/* Bottom row: Land Division, Finances, Military */}
      <Box gap={2} marginTop={1}>
        {/* Land Division Section */}
        <Box flexDirection="column" borderStyle="single" borderColor="cyan" paddingX={1}>
          <SectionHeader title="Land Division" color="cyan" />
          <Row label="Homes" value={`${formatNumber(empire.buildings.bldpop)} (${formatPercent(empire.buildings.bldpop, usedLand)})`} />
          <Row label="Markets" value={`${formatNumber(empire.buildings.bldcash)} (${formatPercent(empire.buildings.bldcash, usedLand)})`} />
          <Row label="Barracks" value={`${formatNumber(empire.buildings.bldtrp)} (${formatPercent(empire.buildings.bldtrp, usedLand)})`} />
          <Row label="Exchanges" value={`${formatNumber(empire.buildings.bldcost)} (${formatPercent(empire.buildings.bldcost, usedLand)})`} />
          <Row label="Farms" value={`${formatNumber(empire.buildings.bldfood)} (${formatPercent(empire.buildings.bldfood, usedLand)})`} />
          <Row label="Towers" value={`${formatNumber(empire.buildings.bldwiz)} (${formatPercent(empire.buildings.bldwiz, usedLand)})`} />
          <Row label="Guard Posts" value={`${formatNumber(empire.buildings.blddef)} (${formatPercent(empire.buildings.blddef, usedLand)})`} />
          <Row label="Unused" value={`${formatNumber(empire.resources.freeland)} (${formatPercent(empire.resources.freeland, empire.resources.land)})`} valueColor="gray" />
          <Box marginTop={1}>
            <Row label="Total Land" value={empire.resources.land} valueColor="cyan" />
          </Box>
        </Box>

        {/* Finances Section */}
        <Box flexDirection="column" borderStyle="single" borderColor="yellow" paddingX={1}>
          <SectionHeader title="Finances" color="yellow" />
          <Row label="Money" value={`$${formatNumber(empire.resources.gold)}`} valueColor="yellow" />
          <Row label="Est. Income" value={`$${formatNumber(estIncome)}`} valueColor="green" />
          <Row label="Est. Expenses" value={`$${formatNumber(estExpenses)}`} valueColor="red" />
          <Row
            label="Net"
            value={financeNet >= 0 ? `+$${formatNumber(financeNet)}` : `-$${formatNumber(Math.abs(financeNet))}`}
            valueColor={financeNet >= 0 ? 'green' : 'red'}
          />
          <Row label="Savings" value={`$${formatNumber(empire.bank)}`} valueColor="green" />
          <Row label="Loan" value={`$${formatNumber(empire.loan)}`} valueColor={empire.loan > 0 ? 'red' : 'gray'} />
          <Row label="Runes" value={formatNumber(empire.resources.runes)} valueColor="magenta" />
          <Row label="Tax Rate" value={`${empire.taxRate}%`} />
        </Box>

        {/* Military Section */}
        <Box flexDirection="column" borderStyle="single" borderColor="red" paddingX={1}>
          <SectionHeader title="Military" color="red" />
          <Row label="Infantry" value={empire.troops.trparm} />
          <Row label="Vehicles" value={empire.troops.trplnd} />
          <Row label="Aircraft" value={empire.troops.trpfly} />
          <Row label="Navy" value={empire.troops.trpsea} />
          <Row label="Wizards" value={empire.troops.trpwiz} valueColor="magenta" />
          <Box marginTop={1}>
            <Row label="Off. Power" value={offensivePower} valueColor="red" />
          </Box>
          <Row label="Def. Power" value={defensivePower} valueColor="blue" />
        </Box>
      </Box>

      {/* Bonuses Row: Advisors, Techs, Policies */}
      {(empire.advisors.length > 0 || Object.keys(empire.techs).length > 0 || empire.policies.length > 0) && (
        <Box gap={2} marginTop={1}>
          {/* Advisors Section */}
          <Box flexDirection="column" borderStyle="single" borderColor="magenta" paddingX={1} minWidth={26}>
            <SectionHeader title="Advisors" color="magenta" />
            {empire.advisors.length === 0 ? (
              <Text color="gray">None</Text>
            ) : (
              empire.advisors.map((advisor) => (
                <Box key={advisor.id} flexDirection="column">
                  <Text color={RARITY_COLORS[advisor.rarity]}>{advisor.name}</Text>
                  <Text color="gray" dimColor>  {advisor.description}</Text>
                </Box>
              ))
            )}
          </Box>

          {/* Techs Section */}
          <Box flexDirection="column" borderStyle="single" borderColor="cyan" paddingX={1} minWidth={20}>
            <SectionHeader title="Technologies" color="cyan" />
            {Object.keys(empire.techs).length === 0 ? (
              <Text color="gray">None</Text>
            ) : (
              Object.entries(empire.techs).map(([action, level]) => (
                <Box key={action} justifyContent="space-between" width={18}>
                  <Text color="white">{TECH_NAMES[action] || action}</Text>
                  <Text color="cyan">Lv.{level}</Text>
                </Box>
              ))
            )}
          </Box>

          {/* Policies Section */}
          <Box flexDirection="column" borderStyle="single" borderColor="green" paddingX={1} minWidth={24}>
            <SectionHeader title="Policies" color="green" />
            {empire.policies.length === 0 ? (
              <Text color="gray">None</Text>
            ) : (
              empire.policies.map((policyId) => {
                const info = POLICY_INFO[policyId];
                return (
                  <Box key={policyId} flexDirection="column">
                    <Text color={info ? RARITY_COLORS[info.rarity] : 'white'}>
                      {info?.name || policyId}
                    </Text>
                    {info && <Text color="gray" dimColor>  {info.description}</Text>}
                  </Box>
                );
              })
            )}
          </Box>
        </Box>
      )}

      {/* Active Effects */}
      {(empire.shieldExpiresRound || empire.gateExpiresRound) && (
        <Box marginTop={1} flexDirection="column" borderStyle="single" borderColor="magenta" paddingX={1}>
          <SectionHeader title="Active Effects" color="magenta" />
          {empire.shieldExpiresRound && (
            <Text color="cyan">Shield Active (until end of round {empire.shieldExpiresRound})</Text>
          )}
          {empire.gateExpiresRound && (
            <Text color="magenta">Gate Active (until end of round {empire.gateExpiresRound})</Text>
          )}
        </Box>
      )}

      <Box marginTop={1} justifyContent="center">
        <Text color="gray">[Esc] close</Text>
      </Box>
    </Box>
  );
}
