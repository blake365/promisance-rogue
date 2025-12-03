import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import type { Advisor, AdvisorEffect } from '../api/client.js';

interface Props {
  advisors: Advisor[];
  maxAdvisors: number;
  onDismiss: (advisorId: string) => void;
  onClose: () => void;
}

const rarityColors: Record<string, string> = {
  common: 'white',
  uncommon: 'green',
  rare: 'blue',
  legendary: 'yellow',
};

const unitNames: Record<string, string> = {
  trparm: 'Infantry',
  trplnd: 'Cavalry',
  trpfly: 'Archers',
  trpsea: 'Catapults',
};

function getEffectTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    food_production: 'Food',
    income: 'Income',
    industry: 'Production',
    explore: 'Exploration',
    offense: 'Offense',
    defense: 'Defense',
    military: 'Military',
    build_cost: 'Build Cost',
    spell_cost: 'Spell Cost',
    market_bonus: 'Market',
    magic: 'Magic',
    rune_production: 'Runes',
    health_regen: 'Health/Turn',
    casualty_reduction: 'Casualties',
    extra_turns: 'Actions',
    extra_attacks: 'Attacks',
    permanent_gate: 'Era Gate',
    permanent_shield: 'Shield',
    spy_ratio: 'Spy Ratio',
    food_sell: 'Food Sale',
    peasant_density: 'Population',
    double_explore: 'Explore',
    double_bank_interest: 'Bank',
    farm_industry: 'Farm Troops',
    build_rate: 'Build Rate',
    aircraft_offense: 'Aircraft',
    dynamic_offense: 'Scaling',
    unit_specialist: 'Specialist',
  };
  return labels[type] || type;
}

function formatModifier(modifier: number, type: string): { text: string; color: string } {
  const percentageTypes = [
    'food_production', 'income', 'industry', 'explore', 'offense', 'defense',
    'military', 'build_cost', 'spell_cost', 'market_bonus', 'magic',
    'rune_production', 'casualty_reduction', 'spy_ratio', 'food_sell',
    'peasant_density', 'double_explore', 'double_bank_interest', 'farm_industry',
    'aircraft_offense', 'dynamic_offense',
  ];

  if (percentageTypes.includes(type)) {
    const percentage = Math.round(modifier * 100);
    const isCostType = type.includes('cost') || type === 'spy_ratio' || type === 'casualty_reduction';
    const isPositive = isCostType ? percentage < 0 : percentage > 0;

    return {
      text: `${percentage > 0 ? '+' : ''}${percentage}%`,
      color: isPositive ? 'green' : 'red',
    };
  }

  const flatTypes = ['extra_turns', 'extra_attacks', 'health_regen', 'build_rate', 'offenseBonus'];
  if (flatTypes.includes(type)) {
    return { text: `+${modifier}`, color: 'green' };
  }

  const specialTypes = ['permanent_gate', 'permanent_shield'];
  if (specialTypes.includes(type)) {
    return { text: 'Active', color: 'magenta' };
  }

  // Multiplier types
  if (type === 'double_explore' || type === 'double_bank_interest') {
    return { text: '2x', color: 'green' };
  }

  return { text: '', color: 'gray' };
}

interface EffectDisplayProps {
  effect: AdvisorEffect;
}

function EffectDisplay({ effect }: EffectDisplayProps) {
  // Handle unit_specialist type specially
  if (effect.type === 'unit_specialist') {
    const boostUnits = (effect as any).boostUnits as string[] | undefined;
    const nerfUnits = (effect as any).nerfUnits as string[] | undefined;
    const offenseBonus = (effect as any).offenseBonus ?? 1;
    const defensePenalty = (effect as any).defensePenalty ?? 2;

    const boostNames = boostUnits?.map(u => unitNames[u] || u).join('/') || '?';
    const nerfNames = nerfUnits?.map(u => unitNames[u] || u).join('/') || '?';

    return (
      <Box gap={1}>
        <Text color="green">+{offenseBonus} Off: {boostNames}</Text>
        <Text color="gray">|</Text>
        <Text color="red">-{defensePenalty} Def: {nerfNames}</Text>
      </Box>
    );
  }

  const { text, color } = formatModifier(effect.modifier, effect.type);
  const label = getEffectTypeLabel(effect.type);

  if (!text) return null;

  return (
    <Box gap={1}>
      <Text color="gray">{label}:</Text>
      <Text color={color} bold>{text}</Text>
      {effect.condition && (
        <Text color="gray" dimColor>({effect.condition})</Text>
      )}
    </Box>
  );
}

export function AdvisorList({ advisors, maxAdvisors, onDismiss, onClose }: Props) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [confirmDismiss, setConfirmDismiss] = useState(false);

  useInput((input, key) => {
    if (key.escape) {
      if (confirmDismiss) {
        setConfirmDismiss(false);
      } else {
        onClose();
      }
    } else if (key.upArrow && advisors.length > 0) {
      setSelectedIndex((i) => (i > 0 ? i - 1 : advisors.length - 1));
      setConfirmDismiss(false);
    } else if (key.downArrow && advisors.length > 0) {
      setSelectedIndex((i) => (i < advisors.length - 1 ? i + 1 : 0));
      setConfirmDismiss(false);
    } else if (input === 'd' && advisors.length > 0) {
      if (confirmDismiss) {
        onDismiss(advisors[selectedIndex].id);
        setConfirmDismiss(false);
        // Adjust selected index if we dismissed the last advisor
        if (selectedIndex >= advisors.length - 1 && selectedIndex > 0) {
          setSelectedIndex(selectedIndex - 1);
        }
      } else {
        setConfirmDismiss(true);
      }
    } else if (input === '1' && advisors.length >= 1) {
      setSelectedIndex(0);
    } else if (input === '2' && advisors.length >= 2) {
      setSelectedIndex(1);
    } else if (input === '3' && advisors.length >= 3) {
      setSelectedIndex(2);
    }
  });

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="cyan" paddingX={1}>
      <Box justifyContent="space-between">
        <Text bold color="cyan">Your Advisors</Text>
        <Text color="gray">
          {advisors.length}/{maxAdvisors} slots
        </Text>
      </Box>

      {advisors.length === 0 ? (
        <Box marginTop={1}>
          <Text color="gray">No advisors yet. Select one from the draft!</Text>
        </Box>
      ) : (
        <Box marginTop={1} flexDirection="column" gap={1}>
          {advisors.map((advisor, index) => {
            const isSelected = index === selectedIndex;
            return (
              <Box
                key={advisor.id}
                flexDirection="column"
                paddingX={1}
                borderStyle={isSelected ? 'bold' : undefined}
                borderColor={isSelected ? 'cyan' : undefined}
              >
                {/* Header: index, name, rarity */}
                <Box gap={1}>
                  <Text color="gray">[{index + 1}]</Text>
                  <Text bold color={rarityColors[advisor.rarity]}>
                    {advisor.name}
                  </Text>
                  <Text color={rarityColors[advisor.rarity]} dimColor>
                    [{advisor.rarity}]
                  </Text>
                </Box>
                {/* Description */}
                <Box marginLeft={4}>
                  <Text color="gray">{advisor.description}</Text>
                </Box>
                {/* Effect details */}
                <Box marginLeft={4}>
                  <EffectDisplay effect={advisor.effect} />
                </Box>
              </Box>
            );
          })}
        </Box>
      )}

      {confirmDismiss && advisors.length > 0 && (
        <Box marginTop={1} borderStyle="single" borderColor="red" paddingX={1}>
          <Text color="red">
            Dismiss {advisors[selectedIndex].name}? Press [d] again to confirm or [Esc] to cancel
          </Text>
        </Box>
      )}

      <Box marginTop={1}>
        <Text color="gray">
          ↑↓ select • [1-3] quick select • {advisors.length > 0 ? '[d] dismiss • ' : ''}[Esc] back
        </Text>
      </Box>
    </Box>
  );
}
