// Formatting utilities - ported from CLI components

/**
 * Format large numbers with K/M suffixes
 * @example formatNumber(1500000) => "1.5M"
 */
export function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

/**
 * Format number with explicit sign (+/-)
 * @example formatChange(500) => "+500"
 */
export function formatChange(n: number): string {
  if (n > 0) return `+${formatNumber(n)}`;
  if (n < 0) return formatNumber(n); // Already has minus sign
  return '0';
}

/**
 * Format networth with gold symbol
 */
export function formatNetworth(n: number): string {
  return formatNumber(n);
}

/**
 * Format a timestamp to readable date
 */
export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Format a timestamp to relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'just now';
}

/**
 * Format percentage
 */
export function formatPercent(n: number, decimals = 0): string {
  return `${(n * 100).toFixed(decimals)}%`;
}

/**
 * Capitalize first letter
 */
export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Roman numerals for mastery levels
 */
export const ROMAN_NUMERALS = ['I', 'II', 'III', 'IV', 'V'] as const;

/**
 * Convert mastery level to roman numeral
 */
export function toRomanNumeral(level: number): string {
  return ROMAN_NUMERALS[level - 1] || String(level);
}
