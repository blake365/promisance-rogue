import type { Empire, BankTransaction, BankTransactionResult, BankOperation } from '../types';
import { ECONOMY } from './constants';
import { calculateNetworth } from './empire';

/**
 * Maximum loan amount is based on current networth
 * Players can borrow up to 50% of their networth
 */
const LOAN_LIMIT_MULTIPLIER = 0.5;

/**
 * Minimum transaction amount
 */
const MIN_TRANSACTION = 1;

/**
 * Process a bank transaction (deposit, withdraw, take loan, pay loan)
 */
export function processBankTransaction(
  empire: Empire,
  transaction: BankTransaction
): BankTransactionResult {
  const { operation, amount } = transaction;

  // Validate amount
  if (amount < MIN_TRANSACTION) {
    return createErrorResult(operation, amount, empire, 'Amount must be at least 1');
  }

  if (!Number.isInteger(amount)) {
    return createErrorResult(operation, amount, empire, 'Amount must be a whole number');
  }

  switch (operation) {
    case 'deposit':
      return processDeposit(empire, amount);
    case 'withdraw':
      return processWithdraw(empire, amount);
    case 'take_loan':
      return processTakeLoan(empire, amount);
    case 'pay_loan':
      return processPayLoan(empire, amount);
    default:
      return createErrorResult(operation, amount, empire, 'Invalid operation');
  }
}

/**
 * Deposit gold into savings account
 */
function processDeposit(empire: Empire, amount: number): BankTransactionResult {
  if (amount > empire.resources.gold) {
    return createErrorResult('deposit', amount, empire, 'Insufficient gold');
  }

  empire.resources.gold -= amount;
  empire.bank += amount;
  empire.networth = calculateNetworth(empire);

  return createSuccessResult('deposit', amount, empire);
}

/**
 * Withdraw gold from savings account
 */
function processWithdraw(empire: Empire, amount: number): BankTransactionResult {
  if (amount > empire.bank) {
    return createErrorResult('withdraw', amount, empire, 'Insufficient savings');
  }

  empire.bank -= amount;
  empire.resources.gold += amount;
  empire.networth = calculateNetworth(empire);

  return createSuccessResult('withdraw', amount, empire);
}

/**
 * Take out a loan
 * Loan limit is based on networth
 */
function processTakeLoan(empire: Empire, amount: number): BankTransactionResult {
  const maxLoan = calculateMaxLoan(empire);
  const availableLoan = maxLoan - empire.loan;

  if (amount > availableLoan) {
    return createErrorResult(
      'take_loan',
      amount,
      empire,
      `Cannot borrow more than ${availableLoan.toLocaleString()} gold (max loan: ${maxLoan.toLocaleString()})`
    );
  }

  empire.loan += amount;
  empire.resources.gold += amount;
  empire.networth = calculateNetworth(empire);

  return createSuccessResult('take_loan', amount, empire);
}

/**
 * Pay off loan
 */
function processPayLoan(empire: Empire, amount: number): BankTransactionResult {
  if (amount > empire.resources.gold) {
    return createErrorResult('pay_loan', amount, empire, 'Insufficient gold');
  }

  if (amount > empire.loan) {
    return createErrorResult('pay_loan', amount, empire, 'Amount exceeds loan balance');
  }

  empire.resources.gold -= amount;
  empire.loan -= amount;
  empire.networth = calculateNetworth(empire);

  return createSuccessResult('pay_loan', amount, empire);
}

/**
 * Calculate maximum loan amount based on networth
 */
export function calculateMaxLoan(empire: Empire): number {
  return Math.floor(empire.networth * LOAN_LIMIT_MULTIPLIER);
}

/**
 * Apply bank interest to savings (called at end of each round)
 * Returns the interest earned
 */
export function applyBankInterest(empire: Empire, hasDoubleInterest: boolean = false): number {
  const rate = hasDoubleInterest ? ECONOMY.savingsRate * 2 : ECONOMY.savingsRate;
  const interest = Math.floor(empire.bank * rate);
  empire.bank += interest;
  return interest;
}

/**
 * Apply loan interest (called at end of each round)
 * Returns the interest charged
 */
export function applyLoanInterest(empire: Empire): number {
  const interest = Math.floor(empire.loan * ECONOMY.loanRate);
  empire.loan += interest;
  return interest;
}

/**
 * Get bank information for display
 */
export function getBankInfo(empire: Empire) {
  const maxLoan = calculateMaxLoan(empire);
  const availableLoan = Math.max(0, maxLoan - empire.loan);

  return {
    savings: empire.bank,
    loan: empire.loan,
    gold: empire.resources.gold,
    maxLoan,
    availableLoan,
    savingsRate: ECONOMY.savingsRate,
    loanRate: ECONOMY.loanRate,
  };
}

function createSuccessResult(
  operation: BankOperation,
  amount: number,
  empire: Empire
): BankTransactionResult {
  return {
    success: true,
    operation,
    amount,
    newBankBalance: empire.bank,
    newLoanBalance: empire.loan,
    newGoldBalance: empire.resources.gold,
  };
}

function createErrorResult(
  operation: BankOperation,
  amount: number,
  empire: Empire,
  error: string
): BankTransactionResult {
  return {
    success: false,
    error,
    operation,
    amount,
    newBankBalance: empire.bank,
    newLoanBalance: empire.loan,
    newGoldBalance: empire.resources.gold,
  };
}
