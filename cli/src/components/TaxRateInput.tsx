import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';

interface Props {
  currentRate: number;
  maxTurns: number;
  onConfirm: (taxRate: number, turns: number) => void;
  onCancel: () => void;
}

export function TaxRateInput({ currentRate, maxTurns, onConfirm, onCancel }: Props) {
  const [taxRate, setTaxRate] = useState(currentRate);
  const [turns, setTurns] = useState(1);
  const [mode, setMode] = useState<'tax' | 'turns'>('turns');

  // Tax rate effects
  const incomeMultiplier = taxRate / 100;
  const peasantEffect =
    taxRate <= 20 ? '+growth' : taxRate <= 40 ? 'neutral' : taxRate <= 60 ? '-growth' : 'leaving';

  useInput((input, key) => {
    if (key.escape) {
      onCancel();
      return;
    }

    if (key.return) {
      onConfirm(taxRate, turns);
      return;
    }

    if (key.tab) {
      setMode((m) => (m === 'tax' ? 'turns' : 'tax'));
      return;
    }

    if (mode === 'tax') {
      if (key.upArrow || input === '+' || input === '=') {
        setTaxRate((r) => Math.min(r + 5, 100));
      } else if (key.downArrow || input === '-') {
        setTaxRate((r) => Math.max(r - 5, 0));
      } else if (key.rightArrow) {
        setTaxRate((r) => Math.min(r + 10, 100));
      } else if (key.leftArrow) {
        setTaxRate((r) => Math.max(r - 10, 0));
      } else if (input === 'l') {
        setTaxRate(20); // Low
      } else if (input === 'm') {
        setTaxRate(40); // Medium
      } else if (input === 'h') {
        setTaxRate(60); // High
      } else if (input === 'x') {
        setTaxRate(80); // Extreme
      }
    } else {
      // turns mode
      if (key.upArrow || input === '+' || input === '=') {
        setTurns((t) => Math.min(t + 1, maxTurns));
      } else if (key.downArrow || input === '-') {
        setTurns((t) => Math.max(t - 1, 1));
      } else if (key.rightArrow) {
        setTurns((t) => Math.min(t + 10, maxTurns));
      } else if (key.leftArrow) {
        setTurns((t) => Math.max(t - 10, 1));
      } else if (input === 'a') {
        setTurns(maxTurns);
      } else if (!isNaN(parseInt(input))) {
        const digit = parseInt(input);
        const newValue = turns * 10 + digit;
        if (newValue <= maxTurns) {
          setTurns(newValue);
        }
      }
    }
  });

  const getPeasantColor = () => {
    if (taxRate <= 20) return 'green';
    if (taxRate <= 40) return 'yellow';
    if (taxRate <= 60) return 'red';
    return 'red';
  };

  const renderBar = (percent: number) => {
    const filled = Math.floor(percent / 5);
    const empty = 20 - filled;
    const color = percent <= 20 ? 'green' : percent <= 40 ? 'yellow' : percent <= 60 ? 'red' : 'red';
    return (
      <Text>
        <Text color={color}>{'█'.repeat(filled)}</Text>
        <Text color="gray">{'░'.repeat(empty)}</Text>
      </Text>
    );
  };

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="yellow" paddingX={1}>
      <Text bold color="yellow">
        Cash - Set Tax Rate
      </Text>

      <Box marginTop={1} flexDirection="column">
        <Box>
          <Text color={mode === 'turns' ? 'cyan' : 'gray'}>{mode === 'turns' ? '>' : ' '} </Text>
          <Text>Turns: </Text>
          <Text bold color="cyan">
            {turns}
          </Text>
          <Text color="gray"> / {maxTurns}</Text>
        </Box>

        <Box marginTop={1}>
          <Text color={mode === 'tax' ? 'cyan' : 'gray'}>{mode === 'tax' ? '>' : ' '} </Text>
          <Text>Tax Rate: </Text>
          <Text bold color="yellow">
            {taxRate}%
          </Text>
          <Text> </Text>
          {renderBar(taxRate)}
        </Box>
      </Box>

      <Box marginTop={1} flexDirection="column" borderStyle="single" borderColor="gray" paddingX={1}>
        <Text bold>Effects at {taxRate}% tax:</Text>
        <Box>
          <Text>Income: </Text>
          <Text color={taxRate >= 40 ? 'green' : 'yellow'}>
            {(incomeMultiplier * 100).toFixed(0)}% of base
          </Text>
        </Box>
        <Box>
          <Text>Peasants: </Text>
          <Text color={getPeasantColor()}>{peasantEffect}</Text>
        </Box>
      </Box>

      <Box marginTop={1} flexDirection="column">
        <Text color="gray" dimColor>
          Presets: [l]ow 20% [m]edium 40% [h]igh 60% e[x]treme 80%
        </Text>
      </Box>

      <Box marginTop={1} flexDirection="column">
        <Text color="gray">[Tab] switch field [↑↓] ±5% / ±1 [←→] ±10%</Text>
        <Text color="gray">[Enter] confirm [Esc] cancel</Text>
      </Box>
    </Box>
  );
}
