import { clsx } from 'clsx';
import type { ReactNode, ButtonHTMLAttributes } from 'react';

interface RetroButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'gold';
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
}

/**
 * 3D beveled button with early 2000s browser game styling
 */
export function RetroButton({
  variant = 'primary',
  size = 'md',
  className,
  disabled,
  children,
  ...props
}: RetroButtonProps) {
  return (
    <button
      disabled={disabled}
      className={clsx(
        // Base styles
        'font-display uppercase tracking-wider font-bold',
        'border-2 transition-all duration-150 cursor-pointer',
        // 3D effect with shadows
        'shadow-retro-inset',
        // Active state (pressed)
        'active:shadow-retro-pressed active:translate-y-[1px]',
        // Size variants
        size === 'sm' && 'px-3 py-1 text-xs',
        size === 'md' && 'px-4 py-2 text-sm',
        size === 'lg' && 'px-6 py-3 text-base min-h-[48px]',
        // Color variants
        variant === 'primary' &&
          'bg-gradient-to-b from-blue-500 to-blue-700 border-blue-400 text-white hover:from-blue-400 hover:to-blue-600',
        variant === 'secondary' &&
          'bg-gradient-to-b from-gray-600 to-gray-800 border-gray-500 text-gray-100 hover:from-gray-500 hover:to-gray-700',
        variant === 'danger' &&
          'bg-gradient-to-b from-red-500 to-red-700 border-red-400 text-white hover:from-red-400 hover:to-red-600',
        variant === 'gold' &&
          'bg-gradient-to-b from-yellow-500 to-yellow-700 border-yellow-400 text-black hover:from-yellow-400 hover:to-yellow-600',
        // Disabled
        disabled && 'opacity-50 cursor-not-allowed active:transform-none',
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
