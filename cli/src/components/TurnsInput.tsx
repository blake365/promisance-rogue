import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';

interface Props {
  maxTurns: number;
  actionLabel: string;
  countLabel?: string; // e.g., "Casts" for spells, defaults to "Actions"
  onConfirm: (turns: number) => void;
  onCancel: () => void;
}

export function TurnsInput({ maxTurns, actionLabel, countLabel = 'Actions', onConfirm, onCancel }: Props) {
  const [turns, setTurns] = useState(1);

  useInput((input, key) => {
    if (key.escape) {
      onCancel();
    } else if (key.return) {
      onConfirm(turns);
    } else if (key.rightArrow || input === '+' || input === '=') {
      setTurns((t) => Math.min(t + 1, maxTurns));
    } else if (key.leftArrow || input === '-') {
      setTurns((t) => Math.max(t - 1, 1));
    } else if (input === ']') {
      setTurns((t) => Math.min(t + 10, maxTurns));
    } else if (input === '[') {
      setTurns((t) => Math.max(t - 10, 1));
    } else if (input === '}') {
      setTurns((t) => Math.min(t + 100, maxTurns));
    } else if (input === '{') {
      setTurns((t) => Math.max(t - 100, 1));
    } else if (input === 'a') {
      setTurns(maxTurns);
    } else if (input === 'z') {
      setTurns(1);
    } else if (!isNaN(parseInt(input))) {
      const digit = parseInt(input);
      const newValue = turns * 10 + digit;
      if (newValue <= maxTurns) {
        setTurns(newValue);
      }
    }
  });

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="yellow" paddingX={1}>
      <Text bold color="yellow">{actionLabel}</Text>
      <Box marginTop={1}>
        <Text>{countLabel}: </Text>
        <Text bold color="cyan">{turns}</Text>
        <Text color="gray"> / {maxTurns} available</Text>
      </Box>
      <Box marginTop={1} flexDirection="column">
        <Text color="gray">[←→] ±1 • [[ ]] ±10 • [{'{ }'} ] ±100 • [a]ll • [z]ero</Text>
        <Text color="gray">[0-9] type value • [Enter] confirm • [Esc] cancel</Text>
      </Box>
    </Box>
  );
}
