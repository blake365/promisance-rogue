import { clsx } from 'clsx';
import type { ReactNode } from 'react';

interface PanelProps {
  title?: string;
  variant?: 'default' | 'gold' | 'danger' | 'success';
  className?: string;
  children: ReactNode;
}

/**
 * Theme-aware panel container
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
        'panel-retro',
        variant === 'gold' && 'border-yellow-500/50',
        variant === 'danger' && 'border-red-500/50',
        variant === 'success' && 'border-green-500/50',
        className
      )}
    >
      {title && (
        <div
          className={clsx(
            'panel-retro-header',
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
