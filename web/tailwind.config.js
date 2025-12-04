/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Base colors
        'game-dark': '#0a0a12',
        'game-panel': '#1a1a2e',
        'game-card': '#16213e',
        'game-border': '#0f3460',
        'game-highlight': '#e94560',

        // Resources
        gold: '#ffd700',
        food: '#7cfc00',
        runes: '#da70d6',
        land: '#00bfff',

        // Eras
        'era-past': '#9932cc',
        'era-present': '#00ced1',
        'era-future': '#32cd32',

        // Rarity
        common: '#c0c0c0',
        uncommon: '#00ff7f',
        rare: '#1e90ff',
        legendary: '#ffd700',

        // Improved text contrast colors
        'text-primary': '#f5f5f5',
        'text-secondary': '#b8b8c0',
        'text-muted': '#8a8a96',
      },
      fontFamily: {
        display: ['MedievalSharp', 'serif'],
        body: ['IBM Plex Mono', 'Menlo', 'Monaco', 'monospace'],
        mono: ['IBM Plex Mono', 'Menlo', 'Monaco', 'monospace'],
        stats: ['Orbitron', 'monospace'],
      },
      fontSize: {
        'xs': ['0.875rem', { lineHeight: '1.25rem' }],
        'sm': ['1rem', { lineHeight: '1.5rem' }],
        'base': ['1.125rem', { lineHeight: '1.75rem' }],
        'lg': ['1.25rem', { lineHeight: '1.75rem' }],
        'xl': ['1.5rem', { lineHeight: '2rem' }],
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
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
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
