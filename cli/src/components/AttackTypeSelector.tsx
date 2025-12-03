import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import type { SpellType, Troops } from '../api/client.js';

// Attack types from QM Promisance military.php
export type AttackType = 'standard' | 'trparm' | 'trplnd' | 'trpfly' | 'trpsea';

// Offensive spells that target enemies
export type OffensiveSpell = 'blast' | 'steal' | 'storm' | 'struct' | 'spy' | 'fight';

export type CombatChoice =
  | { kind: 'military'; attackType: AttackType }
  | { kind: 'magic'; spell: OffensiveSpell };

interface CombatOption {
  id: string;
  name: string;
  shortKey: string;
  description: string;
  cost: string;
  kind: 'military' | 'magic';
}

const MILITARY_ATTACKS: CombatOption[] = [
  { id: 'standard', name: 'Standard Attack', shortKey: 's', description: 'All units, +15% land, +1 health cost', cost: '2 turns', kind: 'military' },
  { id: 'trparm', name: 'Soldier Attack', shortKey: '1', description: 'Infantry only', cost: '2 turns', kind: 'military' },
  { id: 'trplnd', name: 'Tank Attack', shortKey: '2', description: 'Vehicles only', cost: '2 turns', kind: 'military' },
  { id: 'trpfly', name: 'Air Strike', shortKey: '3', description: 'Aircraft only', cost: '2 turns', kind: 'military' },
  { id: 'trpsea', name: 'Naval Attack', shortKey: '4', description: 'Ships only', cost: '2 turns', kind: 'military' },
];

const MAGIC_ATTACKS: CombatOption[] = [
  { id: 'blast', name: 'Fireball', shortKey: 'b', description: 'Kill 3% enemy troops', cost: '2 turns + runes', kind: 'magic' },
  { id: 'steal', name: 'Thievery', shortKey: 't', description: 'Steal 10-15% enemy gold', cost: '2 turns + runes', kind: 'magic' },
  { id: 'storm', name: 'Lightning Storm', shortKey: 'l', description: 'Destroy enemy food & gold', cost: '2 turns + runes', kind: 'magic' },
  { id: 'struct', name: 'Earthquake', shortKey: 'e', description: 'Destroy 3% enemy buildings', cost: '2 turns + runes', kind: 'magic' },
  { id: 'spy', name: 'Spy', shortKey: 'y', description: 'Reveal enemy details', cost: '2 turns + runes', kind: 'magic' },
  { id: 'fight', name: 'Wizard War', shortKey: 'w', description: 'Magic attack for land', cost: '2 turns + runes', kind: 'magic' },
];

const ALL_OPTIONS = [...MILITARY_ATTACKS, ...MAGIC_ATTACKS];

function formatTroopCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

interface Props {
  targetName: string;
  runes: number;
  wizards: number;
  troops: Troops;
  onSelect: (choice: CombatChoice) => void;
  onCancel: () => void;
}

export function AttackTypeSelector({ targetName, runes, wizards, troops, onSelect, onCancel }: Props) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const canUseMagic = wizards > 0 && runes >= 100; // Basic rune check

  useInput((input, key) => {
    if (key.escape) {
      onCancel();
      return;
    }

    if (key.return) {
      const option = ALL_OPTIONS[selectedIndex];
      if (option.kind === 'magic' && !canUseMagic) return;

      if (option.kind === 'military') {
        onSelect({ kind: 'military', attackType: option.id as AttackType });
      } else {
        onSelect({ kind: 'magic', spell: option.id as OffensiveSpell });
      }
      return;
    }

    if (key.upArrow || input === 'k') {
      setSelectedIndex((i) => (i > 0 ? i - 1 : ALL_OPTIONS.length - 1));
    } else if (key.downArrow || input === 'j') {
      setSelectedIndex((i) => (i < ALL_OPTIONS.length - 1 ? i + 1 : 0));
    }

    // Quick select by shortkey
    const index = ALL_OPTIONS.findIndex((a) => a.shortKey === input.toLowerCase());
    if (index >= 0) {
      const option = ALL_OPTIONS[index];
      if (option.kind === 'magic' && !canUseMagic) return;

      if (option.kind === 'military') {
        onSelect({ kind: 'military', attackType: option.id as AttackType });
      } else {
        onSelect({ kind: 'magic', spell: option.id as OffensiveSpell });
      }
    }
  });

  const renderOption = (option: CombatOption, index: number) => {
    const isSelected = index === selectedIndex;
    const isMagicDisabled = option.kind === 'magic' && !canUseMagic;
    const textColor = isMagicDisabled ? 'gray' : isSelected ? 'cyan' : 'white';

    return (
      <Box key={option.id}>
        <Text color={isSelected ? 'cyan' : 'gray'}>{isSelected ? '>' : ' '} </Text>
        <Text color="yellow">[{option.shortKey}]</Text>
        <Text color={textColor}> {option.name.padEnd(16)}</Text>
        <Text color={isMagicDisabled ? 'gray' : 'magenta'}> {option.cost.padEnd(14)}</Text>
        <Text color="gray"> {option.description}</Text>
        {isMagicDisabled && <Text color="red"> (need wizards/runes)</Text>}
      </Box>
    );
  };

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="red" paddingX={1}>
      <Text bold color="red">
        Attack {targetName}
      </Text>

      <Box marginTop={1}>
        <Text>
          Runes: <Text color="magenta">{runes.toLocaleString()}</Text> | Wizards:{' '}
          <Text color="cyan">{wizards.toLocaleString()}</Text>
        </Text>
      </Box>
      <Box>
        <Text>
          Troops: <Text color="white">{formatTroopCount(troops.trparm)}</Text> inf |{' '}
          <Text color="white">{formatTroopCount(troops.trplnd)}</Text> veh |{' '}
          <Text color="white">{formatTroopCount(troops.trpfly)}</Text> air |{' '}
          <Text color="white">{formatTroopCount(troops.trpsea)}</Text> sea
        </Text>
      </Box>

      <Box flexDirection="column" marginTop={1}>
        <Text color="red" bold>Military Attacks:</Text>
        {MILITARY_ATTACKS.map((opt, i) => renderOption(opt, i))}
      </Box>

      <Box flexDirection="column" marginTop={1}>
        <Text color="magenta" bold>Magic Attacks:</Text>
        {MAGIC_ATTACKS.map((opt, i) => renderOption(opt, MILITARY_ATTACKS.length + i))}
      </Box>

      <Box marginTop={1}>
        <Text color="gray">[↑↓] select [Enter] confirm [Esc] cancel</Text>
      </Box>
    </Box>
  );
}
