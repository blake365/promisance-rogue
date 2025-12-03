import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import type { DraftOption, RerollInfo, AdvisorEffect } from '../api/client.js';

interface Props {
  options: DraftOption[];
  rerollInfo: RerollInfo | null;
  masteryLevels?: Record<string, number>; // Current mastery levels by action
  onSelect: (index: number) => void;
  onReroll: () => void;
  onSkip: () => void;
  onMarket?: () => void;
  onAdvisors?: () => void;
}

// Roman numerals for mastery display
const ROMAN_NUMERALS = ['I', 'II', 'III', 'IV', 'V'];

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

const unitNames: Record<string, string> = {
  trparm: 'Inf',
  trplnd: 'Cav',
  trpfly: 'Air',
  trpsea: 'Sea',
};

function formatEffectShort(effect: AdvisorEffect): { text: string; color: string } | null {
  if (effect.type === 'unit_specialist') {
    const boostUnits = (effect as any).boostUnits as string[] | undefined;
    const nerfUnits = (effect as any).nerfUnits as string[] | undefined;
    const boostNames = boostUnits?.map(u => unitNames[u] || u).join('/') || '?';
    const nerfNames = nerfUnits?.map(u => unitNames[u] || u).join('/') || '?';
    return { text: `+Off:${boostNames} -Def:${nerfNames}`, color: 'yellow' };
  }

  const percentageTypes = [
    'food_production', 'income', 'industry', 'explore', 'offense', 'defense',
    'military', 'build_cost', 'spell_cost', 'market_bonus', 'magic',
    'rune_production', 'casualty_reduction', 'spy_ratio',
  ];

  if (percentageTypes.includes(effect.type)) {
    const pct = Math.round(effect.modifier * 100);
    const isCost = effect.type.includes('cost') || effect.type === 'spy_ratio' || effect.type === 'casualty_reduction';
    const isPositive = isCost ? pct < 0 : pct > 0;
    return { text: `${pct > 0 ? '+' : ''}${pct}%`, color: isPositive ? 'green' : 'red' };
  }

  if (['extra_turns', 'extra_attacks', 'health_regen'].includes(effect.type)) {
    return { text: `+${effect.modifier}`, color: 'green' };
  }

  if (['permanent_gate', 'permanent_shield'].includes(effect.type)) {
    return { text: 'ACTIVE', color: 'magenta' };
  }

  if (['double_explore', 'double_bank_interest'].includes(effect.type)) {
    return { text: '2x', color: 'green' };
  }

  return null;
}

export function DraftPicker({ options, rerollInfo, masteryLevels, onSelect, onReroll, onSkip, onMarket, onAdvisors }: Props) {
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
    } else if (input === 'a' && onAdvisors) {
      onAdvisors();
    } else if (input === 'r' && rerollInfo?.canAfford) {
      onReroll();
    } else if (input === '1' && options.length >= 1) {
      onSelect(0);
    } else if (input === '2' && options.length >= 2) {
      onSelect(1);
    } else if (input === '3' && options.length >= 3) {
      onSelect(2);
    } else if (input === '4' && options.length >= 4) {
      onSelect(3);
    } else if (input === '5' && options.length >= 5) {
      onSelect(4);
    }
  });

  const getItemDetails = (option: DraftOption) => {
    const item = option.item as any;

    // For masteries, show current → next level
    if (option.type === 'tech' && masteryLevels && item.action) {
      const currentLevel = masteryLevels[item.action] ?? 0;
      const nextLevel = currentLevel + 1;
      const currentRoman = currentLevel > 0 ? ROMAN_NUMERALS[currentLevel - 1] : '0';
      const nextRoman = ROMAN_NUMERALS[nextLevel - 1];
      return {
        name: item.name,
        description: item.description,
        rarity: 'common' as const,
        effect: null,
        levelInfo: `${currentRoman} → ${nextRoman}`,
      };
    }

    return {
      name: item.name,
      description: item.description || `Level ${item.level || 1} ${option.type}`,
      rarity: item.rarity || 'common',
      effect: option.type === 'advisor' ? item.effect as AdvisorEffect : null,
      levelInfo: null as string | null,
    };
  };

  // Check if selecting an advisor would exceed capacity
  const advisorCapacity = rerollInfo?.advisorCapacity;
  const isAtAdvisorCapacity = advisorCapacity && advisorCapacity.current >= advisorCapacity.max;

  return (
    <Box flexDirection="column" borderStyle="double" borderColor="yellow" paddingX={1}>
      <Box justifyContent="space-between">
        <Text bold color="yellow">DRAFT - Choose Your Bonus</Text>
        {advisorCapacity && (
          <Text color={isAtAdvisorCapacity ? 'red' : 'gray'}>
            Advisors: {advisorCapacity.current}/{advisorCapacity.max}
          </Text>
        )}
      </Box>

      {isAtAdvisorCapacity && (
        <Box marginTop={1}>
          <Text color="red">Advisor slots full! Dismiss one [a] or choose tech/edict.</Text>
        </Box>
      )}

      <Box marginTop={1} justifyContent="center" gap={2}>
        {options.map((option, index) => {
          const details = getItemDetails(option);
          const isSelected = index === selectedIndex;
          const isAdvisorBlocked = option.type === 'advisor' && isAtAdvisorCapacity;

          return (
            <Box
              key={index}
              flexDirection="column"
              borderStyle={isSelected ? 'bold' : 'single'}
              borderColor={isAdvisorBlocked ? 'red' : isSelected ? 'cyan' : 'gray'}
              paddingX={1}
              paddingY={0}
              width={24}
            >
              {/* Type and number */}
              <Box justifyContent="space-between">
                <Text color={isAdvisorBlocked ? 'red' : 'gray'}>[{index + 1}]</Text>
                <Text color={isAdvisorBlocked ? 'red' : undefined}>{typeIcons[option.type]} {option.type}</Text>
              </Box>

              {/* Name */}
              <Box justifyContent="center" marginTop={1}>
                <Text bold color={isAdvisorBlocked ? 'red' : rarityColors[details.rarity]}>
                  {details.name}
                </Text>
              </Box>

              {/* Rarity or Level Info */}
              <Box justifyContent="center">
                {details.levelInfo ? (
                  <Text color="cyan" bold>
                    {details.levelInfo}
                  </Text>
                ) : (
                  <Text color={isAdvisorBlocked ? 'red' : rarityColors[details.rarity]} dimColor>
                    [{details.rarity}]
                  </Text>
                )}
              </Box>

              {/* Description */}
              <Box marginTop={1}>
                <Text color={isAdvisorBlocked ? 'red' : 'gray'} wrap="wrap">
                  {isAdvisorBlocked ? 'SLOTS FULL' : details.description}
                </Text>
              </Box>

              {/* Effect info for advisors */}
              {details.effect && !isAdvisorBlocked && (
                <Box justifyContent="center" marginTop={1}>
                  {(() => {
                    const effectInfo = formatEffectShort(details.effect);
                    if (!effectInfo) return null;
                    return <Text color={effectInfo.color} bold>{effectInfo.text}</Text>;
                  })()}
                </Box>
              )}

              {/* Selection indicator */}
              {isSelected && !isAdvisorBlocked && (
                <Box justifyContent="center" marginTop={1}>
                  <Text color="cyan">▲ SELECTED ▲</Text>
                </Box>
              )}
            </Box>
          );
        })}
      </Box>

      {/* Reroll section */}
      {rerollInfo && (
        <Box marginTop={1} justifyContent="center" gap={2}>
          <Text color="gray">
            Rerolls: {rerollInfo.rerollsRemaining}/{rerollInfo.maxRerolls}
          </Text>
          {rerollInfo.cost !== null && rerollInfo.rerollsRemaining > 0 && (
            <Text color={rerollInfo.canAfford ? 'green' : 'red'}>
              [r] Reroll ({rerollInfo.cost.toLocaleString()} gold)
            </Text>
          )}
        </Box>
      )}

      <Box marginTop={1} justifyContent="center">
        <Text color="gray">
          ←→ navigate • [1-{options.length}] quick select • [Enter] confirm • [p] market • [a] advisors • [Esc] skip
        </Text>
      </Box>
    </Box>
  );
}
