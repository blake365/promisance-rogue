import { create } from 'zustand';
import { themes, defaultTheme } from '@/themes';

const STORAGE_KEY = 'promisance-theme';

interface ThemeStore {
  theme: string;
  setTheme: (id: string) => void;
  initTheme: () => void;
}

export const useThemeStore = create<ThemeStore>((set) => ({
  theme: defaultTheme,

  setTheme: (id: string) => {
    // Validate theme exists
    if (!themes[id]) {
      console.warn(`Theme "${id}" not found, using default`);
      id = defaultTheme;
    }
    localStorage.setItem(STORAGE_KEY, id);
    set({ theme: id });
  },

  initTheme: () => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && themes[stored]) {
      set({ theme: stored });
    } else {
      // Check for system preference for initial default
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const initial = prefersDark ? defaultTheme : defaultTheme;
      set({ theme: initial });
    }
  },
}));
