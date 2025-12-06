/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Theme-aware colors (CSS variables)
        'bg-primary': 'var(--color-bg-primary)',
        'bg-panel': 'var(--color-bg-panel)',
        'bg-card': 'var(--color-bg-card)',
        'border-theme': 'var(--color-border)',
        highlight: 'var(--color-highlight)',
        accent: 'var(--color-accent)',
        'text-primary': 'var(--color-text-primary)',
        'text-secondary': 'var(--color-text-secondary)',
        'text-muted': 'var(--color-text-muted)',

        // Legacy aliases (for backward compatibility during migration)
        'game-dark': 'var(--color-bg-primary)',
        'game-panel': 'var(--color-bg-panel)',
        'game-card': 'var(--color-bg-card)',
        'game-border': 'var(--color-border)',
        'game-highlight': 'var(--color-highlight)',

        // Theme-aware game colors
        gold: 'var(--color-gold)',
        food: 'var(--color-food)',
        runes: 'var(--color-runes)',
        land: 'var(--color-land)',
        positive: 'var(--color-positive)',
        negative: 'var(--color-negative)',
        info: 'var(--color-info)',
        warning: 'var(--color-warning)',

        // Theme-aware gray scale
        'gray-themed': {
          400: 'var(--color-gray-400)',
          500: 'var(--color-gray-500)',
        },

        // Eras (these work on both light and dark)
        'era-past': '#9932cc',
        'era-present': '#0891b2',
        'era-future': '#16a34a',

        // Rarity (theme-aware versions)
        common: 'var(--color-text-muted)',
        uncommon: 'var(--color-positive)',
        rare: 'var(--color-info)',
        legendary: 'var(--color-gold)',
      },
      fontFamily: {
        display: 'var(--font-display)',
        body: 'var(--font-body)',
        mono: ['IBM Plex Mono', 'Menlo', 'Monaco', 'monospace'],
        stats: ['Orbitron', 'monospace'],
      },
      fontSize: {
        xs: ['0.875rem', { lineHeight: '1.25rem' }],
        sm: ['1rem', { lineHeight: '1.5rem' }],
        base: ['1.125rem', { lineHeight: '1.75rem' }],
        lg: ['1.25rem', { lineHeight: '1.75rem' }],
        xl: ['1.5rem', { lineHeight: '2rem' }],
        '2xl': ['1.875rem', { lineHeight: '2.25rem' }],
      },
      boxShadow: {
        'retro-inset':
          'inset -2px -2px 0 rgba(0,0,0,0.3), inset 2px 2px 0 rgba(255,255,255,0.2)',
        'retro-pressed':
          'inset 2px 2px 0 rgba(0,0,0,0.3), inset -2px -2px 0 rgba(255,255,255,0.1)',
        'panel-glow': 'inset 0 0 20px rgba(0,0,0,0.5)',
        'gold-glow': '0 0 10px rgba(255,215,0,0.5)',
        'blue-glow': '0 0 10px rgba(30,144,255,0.5)',
        'purple-glow': '0 0 10px rgba(153,50,204,0.5)',
        // Vercel-style shadows
        'vercel-sm': '0 2px 4px rgba(0,0,0,0.1)',
        'vercel-md': '0 4px 14px 0 rgba(0,0,0,0.1)',
        'vercel-lg': '0 8px 30px rgba(0,0,0,0.12)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        glow: 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px currentColor' },
          '100%': { boxShadow: '0 0 20px currentColor' },
        },
      },
    },
  },
  plugins: [],
};
