import { useState, useMemo } from 'react';
import { clsx } from 'clsx';
import type { Empire, BankInfo, BankTransaction, BankOperation } from '@/types';
import { formatNumber } from '@/utils/format';
import { NumberInput } from '@/components/ui';

interface OperationItem {
  operation: BankOperation;
  name: string;
  icon: string;
  description: string;
  color: string;
}

const OPERATIONS: OperationItem[] = [
  { operation: 'deposit', name: 'Deposit', icon: '💰', description: 'Save gold (4%/round)', color: 'text-green-400' },
  { operation: 'withdraw', name: 'Withdraw', icon: '💸', description: 'Withdraw savings', color: 'text-gold' },
  { operation: 'take_loan', name: 'Loan', icon: '📜', description: 'Borrow (7.5%/round)', color: 'text-red-400' },
  { operation: 'pay_loan', name: 'Pay Loan', icon: '✅', description: 'Pay off debt', color: 'text-cyan-400' },
];

interface BankPanelProps {
  empire: Empire;
  bankInfo: BankInfo;
  onTransaction: (transaction: BankTransaction) => Promise<boolean>;
  onClose: () => void;
}

export function BankPanel({ empire, bankInfo, onTransaction, onClose }: BankPanelProps) {
  const [selectedOp, setSelectedOp] = useState<OperationItem>(OPERATIONS[0]);
  const [amount, setAmount] = useState(0);
  const [processing, setProcessing] = useState(false);

  // Calculate max amount for current operation
  const maxAmount = useMemo(() => {
    switch (selectedOp.operation) {
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
  }, [selectedOp.operation, empire.resources.gold, bankInfo]);

  const handleTransaction = async () => {
    if (amount <= 0 || processing) return;

    setProcessing(true);
    await onTransaction({
      operation: selectedOp.operation,
      amount,
    });
    setAmount(0);
    setProcessing(false);
  };

  // Interest preview
  const interestPreview = useMemo(() => {
    if (amount <= 0) return null;
    if (selectedOp.operation === 'deposit') {
      return {
        label: 'Interest earned next round',
        value: Math.floor(amount * bankInfo.savingsRate),
        color: 'text-green-400',
        prefix: '+',
      };
    }
    if (selectedOp.operation === 'take_loan') {
      return {
        label: 'Interest charged next round',
        value: Math.floor(amount * bankInfo.loanRate),
        color: 'text-red-400',
        prefix: '+',
      };
    }
    return null;
  }, [amount, selectedOp.operation, bankInfo.savingsRate, bankInfo.loanRate]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="font-display text-lg text-green-400">🏦 Royal Bank</h2>
        <div className="text-right">
          <div className="text-xs text-gray-500">Gold</div>
          <div className="font-stats text-gold">{formatNumber(empire.resources.gold)}</div>
        </div>
      </div>

      {/* Account Summary */}
      <div className="bg-game-card rounded-lg p-3 border border-game-border space-y-2">
        <h3 className="font-display text-sm text-gray-400 uppercase tracking-wider">Account Summary</h3>

        <div className="flex justify-between">
          <span className="text-gray-400">Savings:</span>
          <span className="font-stats text-green-400">{formatNumber(bankInfo.savings)}</span>
        </div>
        <div className="text-xs text-right text-gray-500">
          +{(bankInfo.savingsRate * 100).toFixed(1)}% interest per round
        </div>

        <div className="flex justify-between">
          <span className="text-gray-400">Loan Balance:</span>
          <span className="font-stats text-red-400">{formatNumber(bankInfo.loan)}</span>
        </div>
        <div className="text-xs text-right text-gray-500">
          +{(bankInfo.loanRate * 100).toFixed(1)}% interest per round
        </div>

        <div className="pt-2 border-t border-game-border flex justify-between">
          <span className="text-gray-400">Credit Available:</span>
          <span className="font-stats text-cyan-400">{formatNumber(bankInfo.availableLoan)}</span>
        </div>
        <div className="text-xs text-right text-gray-500">
          Max loan: {formatNumber(bankInfo.maxLoan)}
        </div>
      </div>

      {/* Operation Selection */}
      <div className="grid grid-cols-2 gap-2">
        {OPERATIONS.map((op) => {
          const isSelected = selectedOp.operation === op.operation;
          let opMax = 0;
          switch (op.operation) {
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
            <button
              key={op.operation}
              onClick={() => {
                setSelectedOp(op);
                setAmount(0);
              }}
              className={clsx(
                'flex flex-col items-center p-3 rounded-lg border transition-all',
                isSelected
                  ? 'bg-game-card border-cyan-400 shadow-blue-glow'
                  : 'bg-game-dark border-game-border hover:border-gray-500'
              )}
            >
              <span className="text-2xl">{op.icon}</span>
              <span className={clsx('font-display text-sm mt-1', op.color)}>{op.name}</span>
              <span className="text-xs text-gray-500">{op.description}</span>
              <span className={clsx('text-xs mt-1', opMax > 0 ? 'text-gray-400' : 'text-red-400')}>
                Max: {formatNumber(opMax)}
              </span>
            </button>
          );
        })}
      </div>

      {/* Amount Selection */}
      <NumberInput
        value={amount}
        onChange={setAmount}
        min={0}
        max={maxAmount}
        steps={[10, 100, 1000]}
        presets={['zero', 'quarter', 'half', 'max']}
        showMax={true}
        label="Amount"
      />

      {/* Interest Preview */}
      {interestPreview && (
        <div className="bg-game-dark rounded-lg p-3 border border-game-border">
          <div className="flex justify-between">
            <span className="text-gray-400 text-sm">{interestPreview.label}:</span>
            <span className={clsx('font-stats', interestPreview.color)}>
              {interestPreview.prefix}{formatNumber(interestPreview.value)}
            </span>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2">
        <button onClick={onClose} className="btn-secondary btn-lg flex-1">
          Close
        </button>
        <button
          onClick={handleTransaction}
          disabled={amount === 0 || processing}
          className={clsx('btn-lg flex-1', selectedOp.color === 'text-red-400' ? 'btn-danger' : 'btn-primary')}
        >
          {processing ? 'Processing...' : selectedOp.name}
        </button>
      </div>
    </div>
  );
}
