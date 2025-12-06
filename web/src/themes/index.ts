export interface ThemeDefinition {
  id: string;
  name: string;
  description: string;
}

export const themes: Record<string, ThemeDefinition> = {
  'retro-dark': {
    id: 'retro-dark',
    name: 'Retro Dark',
    description: 'Classic early 2000s browser game aesthetic',
  },
  'vercel-light': {
    id: 'vercel-light',
    name: 'Vercel Light',
    description: 'Clean, minimal, modern light theme',
  },
  'vercel-dark': {
    id: 'vercel-dark',
    name: 'Vercel Dark',
    description: 'Sleek modern dark theme',
  },
};

export const themeIds = Object.keys(themes) as Array<keyof typeof themes>;
export const defaultTheme = 'retro-dark';
