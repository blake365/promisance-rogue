import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import type { SpellType, Era } from '../api/client.js';

interface SpellInfo {
  type: SpellType;
  name: string;
  shortKey: string;
  description: string;
  runeCost: number;
}

// Self-only spells (offensive spells are in the Attack view)
const SELF_SPELLS: SpellInfo[] = [
  { type: 'shield', name: 'Magic Shield', shortKey: 's', description: 'Block damage for 1 bot phase', runeCost: 500 },
  { type: 'food', name: 'Cornucopia', shortKey: 'f', description: 'Conjure food', runeCost: 200 },
  { type: 'cash', name: "Midas' Touch", shortKey: 'c', description: 'Conjure gold', runeCost: 250 },
  { type: 'runes', name: 'Arcane Well', shortKey: 'r', description: 'Conjure runes', runeCost: 100 },
  { type: 'advance', name: 'Time Warp', shortKey: 'a', description: 'Advance to next era', runeCost: 2000 },
  { type: 'regress', name: 'Regression', shortKey: 'g', description: 'Return to previous era', runeCost: 1500 },
  { type: 'gate', name: 'Time Gate', shortKey: 't', description: 'Enable cross-era attacks', runeCost: 1000 },
];

interface Props {
  runes: number;
  wizards: number;
  era: Era;
  eraChangedRound: number;
  currentRound: number;
  onSelect: (spell: SpellType) => void;
  onCancel: () => void;
}

export function SpellSelector({ runes, wizards, era, eraChangedRound, currentRound, onSelect, onCancel }: Props) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Era change cooldown: can only change era if currentRound > eraChangedRound
  const canChangeEra = currentRound > eraChangedRound;

  // Check if a spell can be cast
  const canCastSpell = (spell: SpellInfo): { canCast: boolean; reason?: string } => {
    if (wizards <= 0) return { canCast: false, reason: 'no wizards' };
    if (runes < spell.runeCost) return { canCast: false, reason: 'insufficient runes' };

    if (spell.type === 'advance') {
      if (era === 'future') return { canCast: false, reason: 'already in future' };
      if (!canChangeEra) return { canCast: false, reason: 'on cooldown' };
    }
    if (spell.type === 'regress') {
      if (era === 'past') return { canCast: false, reason: 'already in past' };
      if (!canChangeEra) return { canCast: false, reason: 'on cooldown' };
    }

    return { canCast: true };
  };

  useInput((input, key) => {
    if (key.escape) {
      onCancel();
      return;
    }

    if (key.return) {
      const spell = SELF_SPELLS[selectedIndex];
      if (canCastSpell(spell).canCast) {
        onSelect(spell.type);
      }
      return;
    }

    if (key.upArrow || input === 'k') {
      setSelectedIndex((i) => (i > 0 ? i - 1 : SELF_SPELLS.length - 1));
    } else if (key.downArrow || input === 'j') {
      setSelectedIndex((i) => (i < SELF_SPELLS.length - 1 ? i + 1 : 0));
    }

    // Quick select by shortkey
    const index = SELF_SPELLS.findIndex((s) => s.shortKey === input.toLowerCase());
    if (index >= 0) {
      const spell = SELF_SPELLS[index];
      if (canCastSpell(spell).canCast) {
        onSelect(spell.type);
      }
    }
  });

  const renderSpell = (spell: SpellInfo, index: number) => {
    const isSelected = index === selectedIndex;
    const { canCast, reason } = canCastSpell(spell);
    const textColor = canCast ? (isSelected ? 'cyan' : 'white') : 'gray';

    return (
      <Box key={spell.type}>
        <Text color={isSelected ? 'cyan' : 'gray'}>{isSelected ? '>' : ' '} </Text>
        <Text color={canCast ? 'yellow' : 'gray'}>[{spell.shortKey}]</Text>
        <Text color={textColor}> {spell.name.padEnd(14)}</Text>
        <Text color={canCast ? 'magenta' : 'gray'}> {spell.runeCost.toString().padStart(4)} runes</Text>
        <Text color="gray"> - {spell.description}</Text>
        {!canCast && reason && <Text color="red"> ({reason})</Text>}
      </Box>
    );
  };

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="magenta" paddingX={1}>
      <Text bold color="magenta">
        Cast Spell
      </Text>

      <Box marginTop={1}>
        <Text>
          Runes: <Text color="magenta">{runes.toLocaleString()}</Text> | Wizards:{' '}
          <Text color="cyan">{wizards.toLocaleString()}</Text>
        </Text>
      </Box>

      <Box flexDirection="column" marginTop={1}>
        <Text color="yellow" bold>Self Spells:</Text>
        {SELF_SPELLS.map((spell, index) => renderSpell(spell, index))}
      </Box>

      <Box marginTop={1}>
        <Text color="gray" dimColor>Tip: Offensive spells are in the Attack menu</Text>
      </Box>

      {wizards === 0 && (
        <Box marginTop={1}>
          <Text color="red">You need wizards to cast spells!</Text>
        </Box>
      )}

      <Box marginTop={1}>
        <Text color="gray">[↑↓] select [Enter] cast [Esc] cancel</Text>
      </Box>
    </Box>
  );
}
