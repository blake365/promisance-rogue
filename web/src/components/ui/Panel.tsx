import { clsx } from 'clsx';
import type { ReactNode } from 'react';

interface PanelProps {
  title?: string;
  variant?: 'default' | 'gold' | 'danger' | 'success';
  className?: string;
  children: ReactNode;
}

/**
 * Retro panel container with early 2000s browser game styling
 */
export function Panel({
  title,
  variant = 'default',
  className,
  children,
}: PanelProps) {
  return (
    <div
      className={clsx(
        'bg-game-panel rounded',
        'border-2',
        variant === 'default' && 'border-game-border',
        variant === 'gold' && 'border-yellow-500/50',
        variant === 'danger' && 'border-red-500/50',
        variant === 'success' && 'border-green-500/50',
        'shadow-panel-glow',
        className
      )}
    >
      {title && (
        <div
          className={clsx(
            'px-3 py-2 border-b-2 font-display uppercase tracking-wider text-sm',
            variant === 'default' && 'border-game-border text-cyan-400',
            variant === 'gold' && 'border-yellow-500/50 text-yellow-400',
            variant === 'danger' && 'border-red-500/50 text-red-400',
            variant === 'success' && 'border-green-500/50 text-green-400'
          )}
        >
          {title}
        </div>
      )}
      <div className="p-3">{children}</div>
    </div>
  );
}
