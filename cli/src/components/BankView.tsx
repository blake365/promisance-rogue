import React, { useState, useMemo } from 'react';
import { Box, Text, useInput } from 'ink';
import type { Empire, BankTransaction, BankInfo } from '../api/client.js';

type BankOperation = 'deposit' | 'withdraw' | 'take_loan' | 'pay_loan';

interface OperationItem {
  key: string;
  operation: BankOperation;
  name: string;
  description: string;
  color: string;
}

const OPERATIONS: OperationItem[] = [
  { key: 'd', operation: 'deposit', name: 'Deposit', description: 'Save gold (earns 4% interest/round)', color: 'green' },
  { key: 'w', operation: 'withdraw', name: 'Withdraw', description: 'Withdraw from savings', color: 'yellow' },
  { key: 't', operation: 'take_loan', name: 'Take Loan', description: 'Borrow gold (7.5% interest/round)', color: 'red' },
  { key: 'p', operation: 'pay_loan', name: 'Pay Loan', description: 'Pay off your debt', color: 'cyan' },
];

interface Props {
  empire: Empire;
  bankInfo: BankInfo;
  onTransaction: (transaction: BankTransaction) => Promise<boolean>;
  onClose: () => void;
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

export function BankView({ empire, bankInfo, onTransaction, onClose }: Props) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [amount, setAmount] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentOperation = OPERATIONS[selectedIndex];

  // Calculate max amount for each operation
  const maxAmount = useMemo(() => {
    switch (currentOperation.operation) {
      case 'deposit':
        return empire.resources.gold;
      case 'withdraw':
        return bankInfo.savings;
      case 'take_loan':
        return bankInfo.availableLoan;
      case 'pay_loan':
        return Math.min(empire.resources.gold, bankInfo.loan);
      default:
        return 0;
    }
  }, [currentOperation.operation, empire.resources.gold, bankInfo]);

  useInput(async (input, key) => {
    if (processing) return;

    // Clear error on any input
    if (error) setError(null);

    if (key.escape) {
      if (amount > 0) {
        setAmount(0);
      } else {
        onClose();
      }
      return;
    }

    // Navigation
    if (key.upArrow) {
      setSelectedIndex((i) => (i > 0 ? i - 1 : OPERATIONS.length - 1));
      setAmount(0);
    } else if (key.downArrow) {
      setSelectedIndex((i) => (i < OPERATIONS.length - 1 ? i + 1 : 0));
      setAmount(0);
    }

    // Amount adjustment
    if (key.rightArrow || input === '+' || input === '=') {
      setAmount((a) => Math.min(a + 1, maxAmount));
    } else if (key.leftArrow || input === '-') {
      setAmount((a) => Math.max(a - 1, 0));
    } else if (input === ']') {
      setAmount((a) => Math.min(a + 10, maxAmount));
    } else if (input === '[') {
      setAmount((a) => Math.max(a - 10, 0));
    } else if (input === '}') {
      setAmount((a) => Math.min(a + 100, maxAmount));
    } else if (input === '{') {
      setAmount((a) => Math.max(a - 100, 0));
    } else if (input === '>') {
      setAmount((a) => Math.min(a + 1000, maxAmount));
    } else if (input === '<') {
      setAmount((a) => Math.max(a - 1000, 0));
    } else if (input === 'a') {
      setAmount(maxAmount);
    } else if (input === 'z') {
      setAmount(0);
    } else if (input === 'h') {
      // Half amount
      setAmount(Math.floor(maxAmount / 2));
    } else if (input === 'q') {
      // Quarter amount
      setAmount(Math.floor(maxAmount / 4));
    }

    // Quick select by shortkey
    const opIndex = OPERATIONS.findIndex((op) => op.key === input.toLowerCase());
    if (opIndex >= 0) {
      setSelectedIndex(opIndex);
      setAmount(0);
    }

    // Execute transaction
    if (key.return && amount > 0) {
      setProcessing(true);
      const success = await onTransaction({
        operation: currentOperation.operation,
        amount,
      });
      if (!success) {
        setError('Transaction failed');
      }
      setAmount(0);
      setProcessing(false);
    }
  });

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="green" paddingX={1}>
      {/* Header */}
      <Box justifyContent="space-between">
        <Text bold color="green">Royal Bank</Text>
        <Text color="gray">
          Gold: <Text color="yellow">{formatNumber(empire.resources.gold)}</Text>
        </Text>
      </Box>

      {/* Account Summary */}
      <Box marginTop={1} flexDirection="column" borderStyle="single" borderColor="gray" paddingX={1}>
        <Text bold color="white">Account Summary</Text>
        <Box marginTop={1}>
          <Box width={20}>
            <Text color="green">Savings:</Text>
          </Box>
          <Text color="green">{formatNumber(bankInfo.savings)}</Text>
          <Text color="gray"> (+{(bankInfo.savingsRate * 100).toFixed(1)}%/round)</Text>
        </Box>
        <Box>
          <Box width={20}>
            <Text color="red">Loan Balance:</Text>
          </Box>
          <Text color="red">{formatNumber(bankInfo.loan)}</Text>
          <Text color="gray"> (+{(bankInfo.loanRate * 100).toFixed(1)}%/round)</Text>
        </Box>
        <Box>
          <Box width={20}>
            <Text color="cyan">Credit Available:</Text>
          </Box>
          <Text color="cyan">{formatNumber(bankInfo.availableLoan)}</Text>
          <Text color="gray"> (max: {formatNumber(bankInfo.maxLoan)})</Text>
        </Box>
      </Box>

      {/* Operations list */}
      <Box flexDirection="column" marginTop={1}>
        <Text bold color="white">Operations</Text>
        {OPERATIONS.map((item, index) => {
          const isSelected = index === selectedIndex;
          let opMax = 0;
          switch (item.operation) {
            case 'deposit':
              opMax = empire.resources.gold;
              break;
            case 'withdraw':
              opMax = bankInfo.savings;
              break;
            case 'take_loan':
              opMax = bankInfo.availableLoan;
              break;
            case 'pay_loan':
              opMax = Math.min(empire.resources.gold, bankInfo.loan);
              break;
          }

          return (
            <Box key={item.key}>
              <Text color={isSelected ? 'cyan' : 'gray'}>{isSelected ? '> ' : '  '}</Text>
              <Text color="yellow">[{item.key}]</Text>
              <Text color={isSelected ? item.color : 'white'} bold={isSelected}>
                {' '}{item.name.padEnd(12)}
              </Text>
              <Text color="gray">{item.description.padEnd(32)}</Text>
              <Text color="gray">max: </Text>
              <Text color={opMax > 0 ? 'white' : 'red'}>{formatNumber(opMax)}</Text>
            </Box>
          );
        })}
      </Box>

      {/* Transaction input */}
      <Box marginTop={1} flexDirection="column" borderStyle="single" borderColor="gray" paddingX={1}>
        <Box>
          <Text>
            {currentOperation.name} <Text color="cyan">Amount</Text>:
          </Text>
          <Text bold color="cyan"> {formatNumber(amount)}</Text>
          <Text color="gray"> / {formatNumber(maxAmount)}</Text>
        </Box>
        {currentOperation.operation === 'deposit' && amount > 0 && (
          <Box>
            <Text color="gray">Interest earned next round: </Text>
            <Text color="green">+{formatNumber(Math.floor(amount * bankInfo.savingsRate))}</Text>
          </Box>
        )}
        {currentOperation.operation === 'take_loan' && amount > 0 && (
          <Box>
            <Text color="gray">Interest charged next round: </Text>
            <Text color="red">+{formatNumber(Math.floor(amount * bankInfo.loanRate))}</Text>
          </Box>
        )}
      </Box>

      {/* Error message */}
      {error && (
        <Box marginTop={1}>
          <Text color="red">{error}</Text>
        </Box>
      )}

      {/* Controls */}
      <Box marginTop={1} flexDirection="column">
        <Text color="gray">[↑↓] select operation • [←→] ±1 • [[ ]] ±10 • {'{ }'} ±100 • {'< >'} ±1000</Text>
        <Text color="gray">[a]ll • [h]alf • [q]uarter • [z]ero • [Enter] confirm</Text>
        <Text color="gray">[Esc] {amount > 0 ? 'clear' : 'close'}</Text>
      </Box>

      {processing && (
        <Box marginTop={1}>
          <Text color="yellow">Processing transaction...</Text>
        </Box>
      )}
    </Box>
  );
}
