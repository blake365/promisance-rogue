import type { Empire, BankTransaction, BankTransactionResult, BankOperation } from '../types';
import { ECONOMY } from './constants';
import { calculateNetworth, getAdvisorEffectModifier } from './empire';

/**
 * Maximum loan amount is based on current networth (from QM Promisance bank.php)
 * $maxloan = $emp1->e_networth * 50
 */
const LOAN_LIMIT_MULTIPLIER = 50;

/**
 * Maximum savings amount is based on current networth (from QM Promisance bank.php)
 * $maxsave = $emp1->e_networth * 100
 */
const SAVINGS_LIMIT_MULTIPLIER = 100;

/**
 * Emergency loan limit multiplier (from QM Promisance)
 * When loan exceeds 2x max loan, turns are interrupted
 */
const EMERGENCY_LOAN_MULTIPLIER = 2;

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

  const maxSavings = calculateMaxSavings(empire);
  const availableSavings = maxSavings - empire.bank;

  if (amount > availableSavings) {
    return createErrorResult(
      'deposit',
      amount,
      empire,
      `Cannot deposit more than ${availableSavings.toLocaleString()} gold (max savings: ${maxSavings.toLocaleString()})`
    );
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
 * Calculate maximum savings amount based on networth
 */
export function calculateMaxSavings(empire: Empire): number {
  return Math.floor(empire.networth * SAVINGS_LIMIT_MULTIPLIER);
}

/**
 * Calculate emergency loan limit (from QM Promisance)
 * When loan exceeds this, turns are interrupted
 */
export function calculateEmergencyLoanLimit(empire: Empire): number {
  return calculateMaxLoan(empire) * EMERGENCY_LOAN_MULTIPLIER;
}

/**
 * Check if empire's loan exceeds emergency limit
 * Used to stop turn processing early (QM Promisance TURNS_TROUBLE_LOAN)
 */
export function isLoanEmergency(empire: Empire): boolean {
  return empire.loan > calculateEmergencyLoanLimit(empire);
}

/**
 * Apply bank interest to savings (called each turn)
 * Rate is per-round APR divided by turns per round
 * Returns the interest earned
 */
export function applyBankInterest(empire: Empire, turnsPerRound: number, hasDoubleInterest: boolean = false): number {
  if (empire.bank <= 0) return 0;

  // Base rate, doubled with Royal Banker
  let rate = hasDoubleInterest ? ECONOMY.savingsRate * 2 : ECONOMY.savingsRate;

  // War Bonds: +2% flat bonus to interest rate
  const bankInterestBonus = getAdvisorEffectModifier(empire, 'bank_interest');
  rate += bankInterestBonus;

  const perTurnRate = rate / turnsPerRound;
  const interest = Math.floor(empire.bank * perTurnRate);
  empire.bank += interest;
  return interest;
}

/**
 * Apply loan interest (called each turn)
 * Rate is per-round APR divided by turns per round
 * Returns the interest charged
 */
export function applyLoanInterest(empire: Empire, turnsPerRound: number): number {
  if (empire.loan <= 0) return 0;

  // Debt Eraser: reduces loan interest to near-zero
  const zeroInterestMod = getAdvisorEffectModifier(empire, 'zero_interest');
  const rate = zeroInterestMod > 0 ? zeroInterestMod : ECONOMY.loanRate;

  const perTurnRate = rate / turnsPerRound;
  const interest = Math.floor(empire.loan * perTurnRate);
  empire.loan += interest;
  return interest;
}

/**
 * Get bank information for display
 */
export function getBankInfo(empire: Empire) {
  const maxLoan = calculateMaxLoan(empire);
  const availableLoan = Math.max(0, maxLoan - empire.loan);
  const maxSavings = calculateMaxSavings(empire);
  const availableSavings = Math.max(0, maxSavings - empire.bank);

  return {
    savings: empire.bank,
    loan: empire.loan,
    gold: empire.resources.gold,
    maxLoan,
    availableLoan,
    maxSavings,
    availableSavings,
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
