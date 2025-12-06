import { useThemeStore } from '@/stores/themeStore';
import { themes, themeIds } from '@/themes';
import clsx from 'clsx';

interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  const { theme, setTheme } = useThemeStore();

  return (
    <div className={clsx('flex flex-col gap-2', className)}>
      <span className="text-label text-center">Theme</span>
      <div className="flex flex-wrap justify-center gap-2">
        {themeIds.map((id) => {
          const themeInfo = themes[id];
          const isActive = theme === id;

          return (
            <button
              key={id}
              onClick={() => setTheme(id)}
              className={clsx(
                'px-4 py-2 rounded-md border-2 transition-all duration-150',
                'font-body text-sm',
                isActive
                  ? 'border-accent bg-accent/10 text-text-primary'
                  : 'border-border-theme bg-bg-card text-text-secondary hover:border-highlight hover:text-text-primary'
              )}
              title={themeInfo.description}
            >
              {themeInfo.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
